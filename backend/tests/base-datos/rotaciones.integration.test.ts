import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';
import { firmarToken } from '../../src/services/autenticacion.js';
import { crearServicioClima } from '../../src/services/clima.js';
import { ErrorClima } from '../../src/services/nasaPower.js';
import { cargarCultivos } from '../../src/data/catalogoCultivos.js';
import { cargarPlantillas } from '../../src/data/catalogoPlantillas.js';
import { crearBasePrueba } from '../fixtures/nasaPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback de rotaciones');
  try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 25000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  await cargarCultivos(tx); await cargarPlantillas(tx);
  const usuario = await tx.usuario.create({ data: { email: `rotaciones-${randomUUID()}@example.invalid`, nombre: 'Fixture de prueba', passwordHash: 'fixture_sin_clave_real' } });
  const ajeno = await tx.usuario.create({ data: { email: `rotaciones-${randomUUID()}@example.invalid`, nombre: 'Otra fixture', passwordHash: 'fixture_sin_clave_real' } });
  const tecnico = await tx.usuario.create({ data: { email: `rotaciones-${randomUUID()}@example.invalid`, nombre: 'Técnico de prueba', passwordHash: 'fixture_sin_clave_real', rol: 'tecnico', prioridadIngresos: 5 } });
  const terreno = await tx.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Parcela controlada', latitud: -0.93, longitud: -78.62, altitudM: 3000, tieneRiego: false, areaHa: 1 } });
  await tx.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01'), fechaCosecha: new Date('2025-07-01') } });
  const proveedor = vi.fn().mockResolvedValue(crearBasePrueba());
  const clima = crearServicioClima(() => tx.climaCache, proveedor, () => null, () => new Date('2030-01-02T00:00:00Z'));
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarClima: clima });
  return { app, proveedor, terreno, usuario, token: firmarToken(usuario.id, secreto), ajeno: firmarToken(ajeno.id, secreto), tecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Rotaciones HTTP/Prisma: base aislada y rollback, NASA controlada', () => {
  it('semilla idempotente de ocho originales, sin sustituir definiciones diferentes', async () => probar(async (tx) => {
    await cargarPlantillas(tx); await cargarPlantillas(tx); expect(await tx.plantillaRotacion.count()).toBe(8);
    await tx.plantillaRotacion.update({ where: { id: 'papa-haba-cebada' }, data: { secuencia: ['papa', 'papa', 'papa'] } });
    await expect(cargarPlantillas(tx)).rejects.toThrow();
    expect((await tx.plantillaRotacion.findUniqueOrThrow({ where: { id: 'papa-haba-cebada' } })).secuencia).toEqual(['papa', 'papa', 'papa']);
  }));
  it('compara tres estrategias y reutiliza el mismo clima/calendario sin modificar historial', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx); const antes = await tx.siembra.findMany();
    const resultado = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200);
    expect(resultado.body.estrategias).toHaveLength(3); expect(resultado.body.estrategias[0].secuencia).toEqual(['papa', 'papa', 'papa']);
    expect(resultado.body.estrategias.slice(1).every((valor: { id: string | null }) => valor.id !== null)).toBe(true);
    await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(token, { type: 'bearer' }).expect(200);
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200);
    expect(proveedor).toHaveBeenCalledExactlyOnceWith(-0.93, -78.62);
    expect(await tx.siembra.findMany()).toEqual(antes); expect(await tx.plantillaRotacion.count()).toBe(8);
    expect(JSON.stringify(resultado.body)).not.toMatch(/password_hash|fixture_sin_clave_real|@example/);
  }));
  it('exige JWT y propiedad, y valida parámetros antes de pedir clima', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token, ajeno } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).expect(401);
    const externo = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(ajeno, { type: 'bearer' }).expect(404);
    const ausente = await request(app).get(`/api/terrenos/${randomUUID()}/rotaciones`).auth(token, { type: 'bearer' }).expect(404); expect(externo.body).toEqual(ausente.body);
    await request(app).get('/api/terrenos/mal/rotaciones').auth(token, { type: 'bearer' }).expect(400);
    for (const consulta of ['lluvia_pct=31', 'temp_delta=-3', 'lluvia_pct=', 'lluvia_pct=0&lluvia_pct=2', 'latitud=0', 'usuario_id=ajeno']) await request(app).get(`/api/terrenos/${terreno.id}/rotaciones?${consulta}`).auth(token, { type: 'bearer' }).expect(400);
    expect(proveedor).not.toHaveBeenCalled();
  }));
  it('el técnico lee con prioridades del propietario y no obtiene datos privados ni escritura', async () => probar(async (tx) => {
    const { app, terreno, token, tecnico } = await preparar(tx);
    const agricultor = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200);
    const lectura = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(tecnico, { type: 'bearer' }).expect(200);
    expect(lectura.body.estrategias).toEqual(agricultor.body.estrategias); expect(lectura.body.metodologia.prioridades.ingresos).toBe(3);
    await request(app).put(`/api/siembras/${(await tx.siembra.findFirstOrThrow()).id}`).auth(tecnico, { type: 'bearer' }).send({ notas: 'No permitido' }).expect(403);
  }));
  it('escenarios deterministas y preferencias reales del propietario sin contaminar NASA', async () => probar(async (tx) => {
    const { app, proveedor, terreno, usuario, token } = await preparar(tx);
    const base = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200);
    for (const consulta of ['lluvia_pct=-30&temp_delta=-2', 'lluvia_pct=30&temp_delta=2']) await request(app).get(`/api/terrenos/${terreno.id}/rotaciones?${consulta}`).auth(token, { type: 'bearer' }).expect(200);
    const repetida = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200); expect(repetida.body.estrategias).toEqual(base.body.estrategias);
    await tx.usuario.update({ where: { id: usuario.id }, data: { prioridadIngresos: 5 } });
    const distinta = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200); expect(distinta.body.metodologia.prioridades.ingresos).toBe(5);
    expect(distinta.body.estrategias[0].puntajes.total).not.toBe(base.body.estrategias[0].puntajes.total); expect(proveedor).toHaveBeenCalledOnce();
  }));
  it('sin clima fiable o sin altitud no inventa puntajes ni alternativas', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx); proveedor.mockRejectedValue(new ErrorClima());
    const resultado = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200);
    expect(resultado.body.clima).toBeNull(); expect(resultado.body.estrategias.slice(1).every((valor: { id: string | null }) => valor.id === null)).toBe(true);
    await tx.terreno.update({ where: { id: terreno.id }, data: { altitudM: null } });
    await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.estrategias[0].puntajes.total).toBeNull(); });
  }));
  it('no crea semillas mediante GET y no se programa antes de una cosecha conocida', async () => probar(async (tx) => {
    const { app, terreno, token } = await preparar(tx);
    await tx.plantillaRotacion.deleteMany();
    await tx.siembra.updateMany({ data: { fechaCosecha: new Date('2035-12-20') } });
    const resultado = await request(app).get(`/api/terrenos/${terreno.id}/rotaciones`).auth(token, { type: 'bearer' }).expect(200);
    expect(resultado.body.inicio_comun).toBe('2036-01-01'); expect(await tx.plantillaRotacion.count()).toBe(0);
    expect(resultado.body.estrategias.slice(1).every((valor: { id: string | null }) => valor.id === null)).toBe(true);
  }));
});
