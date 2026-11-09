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
import { crearServicioTendencia } from '../../src/services/tendencia.js';
import { ErrorTendencia } from '../../src/services/nasaHistorico.js';
import { crearMensualPrueba, crearDiarioPrueba } from '../fixtures/tendenciasPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback de tendencias');
  try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 20000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  const crear = (rol: string) => tx.usuario.create({ data: { email: `tendencia-${randomUUID()}@example.invalid`, nombre: 'Prueba temporal', passwordHash: 'fixture_sin_clave_real', rol } });
  const propio = await crear('agricultor'); const ajeno = await crear('agricultor'); const tecnico = await crear('tecnico');
  const terreno = await tx.terreno.create({ data: { usuarioId: propio.id, nombre: 'Parcela de prueba', latitud: -0.93, longitud: -78.62, areaHa: 1 } });
  const cliente = { mensual: vi.fn().mockResolvedValue(crearMensualPrueba()), diario: vi.fn().mockResolvedValue(crearDiarioPrueba()) };
  const servicio = crearServicioTendencia(() => tx.climaCache, cliente, () => new Date('2030-01-02T00:00:00Z'), { mensual: () => null, diario: () => null });
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarTendencia: servicio });
  return { app, terreno, cliente, token: firmarToken(propio.id, secreto), ajeno: firmarToken(ajeno.id, secreto), tecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Tendencia HTTP, permisos y JSONB PostgreSQL aislado', () => {
  it('persiste las dos series y permite repetir sin tocar terreno ni historial', async () => probar(async (tx) => {
    const { app, terreno, token, cliente } = await preparar(tx);
    const primera = await request(app).get(`/api/terrenos/${terreno.id}/tendencia`).auth(token, { type: 'bearer' }).expect(200);
    expect(primera.body.anual).toHaveLength(20); expect(primera.body.anual[0].dias_helada).toBe(0); expect(await tx.climaCache.count()).toBe(2);
    const segunda = await request(app).get(`/api/terrenos/${terreno.id}/tendencia`).auth(token, { type: 'bearer' }).expect(200);
    expect(segunda.body.anual).toEqual(primera.body.anual); expect(segunda.body.fuentes.diario.estado_datos).toBe('cache'); expect(cliente.mensual).toHaveBeenCalledOnce(); expect(cliente.diario).toHaveBeenCalledWith(-0.93, -78.62);
    expect(await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await tx.siembra.count()).toBe(0);
  }));
  it('rechaza JWT ausente o inválido, agricultor ajeno, UUID y parámetros manipulados antes de NASA', async () => probar(async (tx) => {
    const { app, terreno, token, ajeno, cliente } = await preparar(tx); const ruta = `/api/terrenos/${terreno.id}/tendencia`;
    await request(app).get(ruta).expect(401); await request(app).get(ruta).auth('invalido', { type: 'bearer' }).expect(401);
    const extranjera = await request(app).get(ruta).auth(ajeno, { type: 'bearer' }).expect(404);
    const inexistente = await request(app).get(`/api/terrenos/${randomUUID()}/tendencia`).auth(token, { type: 'bearer' }).expect(404); expect(extranjera.body).toEqual(inexistente.body);
    await request(app).get('/api/terrenos/invalido/tendencia').auth(token, { type: 'bearer' }).expect(400);
    for (const consulta of ['latitude=0', 'inicio=2000', 'usuario_id=ajeno', 'lluvia_pct=30']) await request(app).get(`${ruta}?${consulta}`).auth(token, { type: 'bearer' }).expect(400);
    expect(cliente.mensual).not.toHaveBeenCalled(); expect(cliente.diario).not.toHaveBeenCalled();
  }));
  it('permite lectura técnica sin conceder permisos de escritura', async () => probar(async (tx) => {
    const { app, terreno, tecnico } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/tendencia`).auth(tecnico, { type: 'bearer' }).expect(200);
    await request(app).put(`/api/terrenos/${terreno.id}`).auth(tecnico, { type: 'bearer' }).send({ nombre: 'Cambio indebido' }).expect(403);
    expect(await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno);
  }));
  it('responde parcialmente sin inventar heladas; caída total conserva el formato de error', async () => probar(async (tx) => {
    const { app, terreno, token, cliente } = await preparar(tx); cliente.diario.mockRejectedValue(new ErrorTendencia());
    const parcial = await request(app).get(`/api/terrenos/${terreno.id}/tendencia`).auth(token, { type: 'bearer' }).expect(200);
    expect(parcial.body.anual.every((a: { dias_helada: null }) => a.dias_helada === null)).toBe(true);
    await tx.climaCache.deleteMany(); cliente.mensual.mockRejectedValue(new ErrorTendencia());
    const fallo = await request(app).get(`/api/terrenos/${terreno.id}/tendencia`).auth(token, { type: 'bearer' }).expect(503); expect(Object.keys(fallo.body)).toEqual(['error']);
  }));
});
