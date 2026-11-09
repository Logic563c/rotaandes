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
import { claveClima, crearServicioClima } from '../../src/services/clima.js';
import { ErrorClima } from '../../src/services/nasaPower.js';
import { crearBasePrueba } from '../fixtures/nasaPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
const ahora = new Date('2030-01-02T00:00:00Z');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback climático');
  try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 20000 }); }
  catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  const crearUsuario = (rol: string) => tx.usuario.create({ data: { email: `clima-${randomUUID()}@example.invalid`, nombre: 'Fixture climática', passwordHash: 'fixture_sin_clave_real', rol } });
  const propio = await crearUsuario('agricultor'); const ajeno = await crearUsuario('agricultor'); const tecnico = await crearUsuario('tecnico');
  const terreno = await tx.terreno.create({ data: { usuarioId: propio.id, nombre: 'Parcela de prueba', latitud: -0.93, longitud: -78.62, altitudM: 3000 } });
  const nasa = vi.fn().mockResolvedValue(crearBasePrueba());
  const servicio = crearServicioClima(() => tx.climaCache, nasa, () => null, () => ahora);
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarClima: servicio });
  return { app, nasa, terreno, token: firmarToken(propio.id, secreto), tokenAjeno: firmarToken(ajeno.id, secreto), tokenTecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });

describe('Climatología con PostgreSQL real y proveedor simulado, aislada con rollback', () => {
  it('preserva el instante TIMESTAMPTZ entre SQL y Prisma en ambos sentidos', async () => probar(async (tx) => {
    const base = crearBasePrueba(); const clave = 'interop-clima-utc';
    await tx.$executeRaw`INSERT INTO clima_cache (clave,datos,actualizado_en) VALUES (${clave}, ${JSON.stringify(base)}::jsonb, ${base.consultado_en}::timestamptz)`;
    const guardada = await tx.climaCache.findUniqueOrThrow({ where: { clave } });
    expect(guardada.actualizadoEn?.toISOString()).toBe(base.consultado_en);
    const nuevaFecha = new Date('2030-01-01T18:30:12.123Z');
    await tx.climaCache.update({ where: { clave }, data: { actualizadoEn: nuevaFecha } });
    const filas = await tx.$queryRaw<{ epoca: number }[]>`SELECT EXTRACT(EPOCH FROM actualizado_en)::double precision AS epoca FROM clima_cache WHERE clave=${clave}`;
    expect(filas[0]?.epoca).toBe(nuevaFecha.getTime() / 1000);
  }));
  it('persiste caché JSONB/fecha y evita volver al proveedor', async () => probar(async (tx) => {
    const { app, nasa, terreno, token } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.estado_datos).toBe('nasa'); expect(body.mensual).toHaveLength(12); });
    const guardada = await tx.climaCache.findUniqueOrThrow({ where: { clave: claveClima(-0.93, -78.62) } });
    expect(guardada.actualizadoEn?.toISOString()).toBe('2030-01-01T00:00:00.000Z');
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.estado_datos).toBe('cache'); expect(body.mensual[0].lluvia_mm).toBe(124); });
    expect(nasa).toHaveBeenCalledTimes(1);
  }));
  it('rechaza acceso ausente, ajeno, UUID inválido y coordenadas manipuladas antes de NASA', async () => probar(async (tx) => {
    const { app, nasa, terreno, token, tokenAjeno } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).expect(401);
    const ajeno = await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    const ausente = await request(app).get(`/api/terrenos/${randomUUID()}/clima`).auth(token, { type: 'bearer' }).expect(404);
    expect(ajeno.body).toEqual(ausente.body);
    await request(app).get('/api/terrenos/invalido/clima').auth(token, { type: 'bearer' }).expect(400);
    await request(app).get(`/api/terrenos/${terreno.id}/clima?latitude=0&longitude=0`).auth(token, { type: 'bearer' }).expect(400);
    expect(nasa).not.toHaveBeenCalled(); expect(await tx.climaCache.count()).toBe(0);
  }));
  it('el técnico puede leer y el riesgo cambia con altitud sin contaminar la caché', async () => probar(async (tx) => {
    const { app, terreno, token, tokenTecnico, nasa } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(tokenTecnico, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.mensual[0].riesgo_helada).toBe('medio'); expect(body.usuario).toBeUndefined(); });
    await tx.terreno.update({ where: { id: terreno.id }, data: { altitudM: 3400 } });
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.mensual[0].riesgo_helada).toBe('alto'); });
    expect(nasa).toHaveBeenCalledTimes(1);
  }));
  it('usa la ubicación de la base, no devuelve caché de una ubicación anterior', async () => probar(async (tx) => {
    const { app, terreno, token, nasa } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200);
    await tx.terreno.update({ where: { id: terreno.id }, data: { latitud: -0.95 } });
    nasa.mockRejectedValue(new ErrorClima());
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(503).expect(({ body }) => { expect(Object.keys(body)).toEqual(['error']); });
    expect(nasa).toHaveBeenLastCalledWith(-0.95, -78.62);
  }));
  it('renueva caché vencida, conserva anterior en caída y no inventa si falta todo', async () => probar(async (tx) => {
    const { app, terreno, token, nasa } = await preparar(tx);
    const vieja = crearBasePrueba('2029-10-01T00:00:00Z');
    await tx.climaCache.create({ data: { clave: claveClima(-0.93, -78.62), datos: vieja, actualizadoEn: new Date(vieja.consultado_en) } });
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.estado_datos).toBe('nasa'); });
    await tx.climaCache.update({ where: { clave: claveClima(-0.93, -78.62) }, data: { datos: vieja, actualizadoEn: new Date(vieja.consultado_en) } });
    nasa.mockRejectedValue(new ErrorClima());
    await request(app).get(`/api/terrenos/${terreno.id}/clima`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.desactualizado).toBe(true); expect(body.estado_datos).toBe('desactualizado'); });
  }));
});
