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
import { obtenerClavePronostico, crearServicioPronostico } from '../../src/services/pronostico.js';
import { ErrorPronostico } from '../../src/services/openMeteo.js';
import { crearBasePronostico } from '../fixtures/pronosticoPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
const ahora = new Date('2030-01-01T12:00:00.000Z');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback de pronóstico');
  try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 20000 }); }
  catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  const crearUsuario = (rol: string) => tx.usuario.create({ data: { email: `pronostico-${randomUUID()}@example.invalid`, nombre: 'Fixture temporal', passwordHash: 'fixture_sin_clave_real', rol } });
  const propietario = await crearUsuario('agricultor'); const ajeno = await crearUsuario('agricultor'); const tecnico = await crearUsuario('tecnico');
  const terreno = await tx.terreno.create({ data: { usuarioId: propietario.id, nombre: 'Terreno de prueba', latitud: -0.93, longitud: -78.62, altitudM: 3800 } });
  const proveedor = vi.fn().mockResolvedValue(crearBasePronostico());
  const servicio = crearServicioPronostico(() => tx.climaCache, proveedor, () => ahora, 2);
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarPronostico: servicio });
  return { app, proveedor, terreno, token: firmarToken(propietario.id, secreto), tokenAjeno: firmarToken(ajeno.id, secreto), tokenTecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Pronóstico HTTP y PostgreSQL real con proveedor controlado, rollback aislado', () => {
  it('persiste siete días en JSONB y reutiliza la caché sin alterar la climatología', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx);
    await tx.climaCache.create({ data: { clave: 'power_clim_fixture_preservada', datos: { fixture: true } } });
    const nueva = await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(200);
    expect(nueva.body.dias).toHaveLength(7); expect(nueva.body.alertas).toHaveLength(3); expect(nueva.body.fuente).toBe('Open-Meteo'); expect(nueva.body.estado_datos).toBe('open_meteo');
    const cache = await tx.climaCache.findUniqueOrThrow({ where: { clave: obtenerClavePronostico(-0.93, -78.62) } });
    expect(cache.actualizadoEn?.toISOString()).toBe(ahora.toISOString());
    await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.estado_datos).toBe('cache'); });
    expect(proveedor).toHaveBeenCalledOnce(); expect(await tx.climaCache.count()).toBe(2);
  }));
  it('rechaza falta de JWT, agricultores ajenos, UUID inválidos y parámetros manipulados antes del proveedor', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token, tokenAjeno } = await preparar(tx);
    await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).expect(401);
    const ajeno = await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    const ausente = await request(app).get(`/api/terrenos/${randomUUID()}/pronostico`).auth(token, { type: 'bearer' }).expect(404); expect(ajeno.body).toEqual(ausente.body);
    await request(app).get('/api/terrenos/invalido/pronostico').auth(token, { type: 'bearer' }).expect(400);
    await request(app).get(`/api/terrenos/${terreno.id}/pronostico?latitude=0&umbral=100`).auth(token, { type: 'bearer' }).expect(400);
    expect(proveedor).not.toHaveBeenCalled(); expect(await tx.climaCache.count()).toBe(0);
  }));
  it('permite lectura técnica y no cambia las alertas según la altitud del terreno', async () => probar(async (tx) => {
    const { app, terreno, token, tokenTecnico } = await preparar(tx);
    const tecnico = await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(tokenTecnico, { type: 'bearer' }).expect(200);
    await tx.terreno.update({ where: { id: terreno.id }, data: { altitudM: 100 } });
    const agricultor = await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(200);
    expect(agricultor.body.alertas).toEqual(tecnico.body.alertas); expect(agricultor.body.usuario_id).toBeUndefined(); expect(agricultor.body.password_hash).toBeUndefined();
    await request(app).put(`/api/terrenos/${terreno.id}`).auth(tokenTecnico, { type: 'bearer' }).send({ nombre: 'Cambio no autorizado' }).expect(403);
  }));
  it('no devuelve datos vencidos ni reutiliza otra ubicación si el proveedor falla', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx);
    const vencida = crearBasePronostico('2030-01-01T11:30:00.000Z');
    await tx.climaCache.create({ data: { clave: obtenerClavePronostico(-0.93, -78.62), datos: vencida, actualizadoEn: new Date(vencida.consultado_en) } });
    proveedor.mockRejectedValue(new ErrorPronostico());
    const fallo = await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(500); expect(Object.keys(fallo.body)).toEqual(['error']);
    await tx.terreno.update({ where: { id: terreno.id }, data: { latitud: -0.94 } });
    await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(500);
    expect(proveedor).toHaveBeenLastCalledWith(-0.94, -78.62);
  }));
  it('aplica límite de consultas autenticadas sin repetir consultas externas', async () => probar(async (tx) => {
    const { app, proveedor, terreno, token } = await preparar(tx);
    for (let indice = 0; indice < 30; indice++) await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(200);
    const limite = await request(app).get(`/api/terrenos/${terreno.id}/pronostico`).auth(token, { type: 'bearer' }).expect(429);
    expect(limite.headers['retry-after']).toBeDefined(); expect(Object.keys(limite.body)).toEqual(['error']); expect(proveedor).toHaveBeenCalledOnce();
  }));
});
