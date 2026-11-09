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
import { crearBasePrueba } from '../fixtures/nasaPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback de calendario');
  try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 20000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  await cargarCultivos(tx);
  const crearUsuario = (rol: string) => tx.usuario.create({ data: { email: `calendario-${randomUUID()}@example.invalid`, nombre: 'Fixture de prueba', passwordHash: 'fixture_sin_clave_real', rol } });
  const propio = await crearUsuario('agricultor'); const ajeno = await crearUsuario('agricultor'); const tecnico = await crearUsuario('tecnico');
  const terreno = await tx.terreno.create({ data: { usuarioId: propio.id, nombre: 'Parcela de prueba', latitud: -0.93, longitud: -78.62, altitudM: 3000, tieneRiego: false, areaHa: 1 } });
  const proveedor = vi.fn().mockResolvedValue(crearBasePrueba());
  const clima = crearServicioClima(() => tx.climaCache, proveedor, () => null, () => new Date('2030-01-02T00:00:00Z'));
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarClima: clima });
  return { app, proveedor, terreno, token: firmarToken(propio.id, secreto), ajeno: firmarToken(ajeno.id, secreto), tecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Calendario HTTP con catálogo PostgreSQL y clima controlado, rollback aislado', () => {
  it('calcula 120 celdas con catálogo SQL y comparte caché con /clima sin duplicar proveedor', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx);
    const antes = await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } });
    const resultado = await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(token, { type: 'bearer' }).expect(200);
    expect(resultado.body.celdas).toHaveLength(120); expect(resultado.body.cultivos).toHaveLength(10); expect(resultado.body.escenario).toEqual({ lluvia_pct: 0, temp_delta: 0 });
    expect(resultado.body.celdas.find((celda: { cultivo_id: string; mes: number }) => celda.cultivo_id === 'papa' && celda.mes === 1)).toMatchObject({ estado: 'posible_con_cuidado', motivo: expect.stringContaining('124 mm') });
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200);
    expect(proveedor).toHaveBeenCalledOnce(); expect(await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(antes);
    expect(await tx.climaCache.count()).toBe(1);
  }));
  it('valida JWT, aislamiento de agricultores, UUID y consultas antes de llamar NASA', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token, ajeno } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/calendario`).expect(401);
    const prohibido = await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(ajeno, { type: 'bearer' }).expect(404);
    const inexistente = await request(app).get(`/api/terrenos/${randomUUID()}/calendario`).auth(token, { type: 'bearer' }).expect(404); expect(prohibido.body).toEqual(inexistente.body);
    await request(app).get('/api/terrenos/invalido/calendario').auth(token, { type: 'bearer' }).expect(400);
    for (const consulta of ['lluvia_pct=31', 'temp_delta=-3', 'usuario_id=ajeno', 'lluvia_pct=', 'lluvia_pct=0&lluvia_pct=30', 'temp_delta=NaN', 'latitud=0']) await request(app).get(`/api/terrenos/${terreno.id}/calendario?${consulta}`).auth(token, { type: 'bearer' }).expect(400);
    expect(proveedor).not.toHaveBeenCalled(); expect(await tx.climaCache.count()).toBe(0);
  }));
  it('permite lectura técnica y aplica escenarios sin escribir terreno ni contaminar la base climática', async () => probar(async (tx) => {
    const { app, proveedor, terreno, tecnico } = await preparar(tx);
    const base = await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(tecnico, { type: 'bearer' }).expect(200);
    for (const consulta of ['lluvia_pct=-30&temp_delta=-2', 'lluvia_pct=30&temp_delta=2']) await request(app).get(`/api/terrenos/${terreno.id}/calendario?${consulta}`).auth(tecnico, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.celdas).not.toEqual(base.body.celdas); expect(body.clima.estado_datos).toBe('cache'); });
    const posterior = await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(tecnico, { type: 'bearer' }).expect(200); expect(posterior.body.celdas).toEqual(base.body.celdas); expect(proveedor).toHaveBeenCalledOnce();
    await request(app).put(`/api/terrenos/${terreno.id}`).auth(tecnico, { type: 'bearer' }).send({ tiene_riego: true }).expect(403);
    expect((await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).tieneRiego).toBe(false);
  }));
  it('maneja fallo NASA y catálogo incompleto con errores controlados, sin sembrar automáticamente', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx);
    proveedor.mockRejectedValue(new ErrorClima());
    const fallo = await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(token, { type: 'bearer' }).expect(503); expect(Object.keys(fallo.body)).toEqual(['error']);
    await tx.cultivo.delete({ where: { id: 'papa' } });
    await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(token, { type: 'bearer' }).expect(500);
    expect(await tx.cultivo.count()).toBe(9); expect(proveedor).toHaveBeenCalledOnce();
  }));
  it('con altitud nula y lluvia ausente no fabrica recomendaciones favorables', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx); const incompleta = crearBasePrueba(); incompleta.parametros.PRECTOTCORR.valores.fill(null);
    proveedor.mockResolvedValue(incompleta); await tx.terreno.update({ where: { id: terreno.id }, data: { altitudM: null } });
    await request(app).get(`/api/terrenos/${terreno.id}/calendario`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => {
      expect(body.celdas.every((celda: { estado: string }) => celda.estado === 'no_determinado' || celda.estado === 'no_recomendado')).toBe(true); expect(body.terreno.altitud_m).toBeNull();
    });
  }));
});
