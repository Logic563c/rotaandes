import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';
import { firmarToken } from '../../src/services/autenticacion.js';
import { ErrorCapaSatelital } from '../../src/services/capasSatelitales.js';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) }) });
const secreto = randomBytes(48).toString('base64url');
const bytes = readFileSync(new URL('../fixtures/satelites/ndvi-2023-01-01.png', import.meta.url));
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback de capas'); try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 20000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  const crear = (rol: string) => tx.usuario.create({ data: { nombre: 'Prueba de capas', email: `capas-${randomUUID()}@example.invalid`, rol, passwordHash: 'fixture_sin_clave_real' } });
  const agricultor = await crear('agricultor'); const ajeno = await crear('agricultor'); const tecnico = await crear('tecnico');
  const proveedor = vi.fn(async () => ({ bytes, visible: true, sha256: createHash('sha256').update(bytes).digest('hex'), consultado_en: '2026-11-08T00:00:00Z', origen: 'gibs' as const }));
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarCapas: proveedor });
  return { app, proveedor, agricultor, token: firmarToken(agricultor.id, secreto), ajeno: firmarToken(ajeno.id, secreto), tecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Capas y PostgreSQL aislado: permisos, contrato y no escritura', () => {
  it('exige JWT también para imágenes y no presenta WMS como GeoJSON', async () => probar(async (tx) => {
    const { app, token, proveedor } = await preparar(tx);
    for (const ruta of ['/api/capas/ndvi?mes=1', '/api/capas-visuales/ndvi?anio=2023&mes=1', '/api/capas-visuales/ndvi/imagen?anio=2023&mes=1']) await request(app).get(ruta).expect(401);
    await request(app).get('/api/capas/ndvi?mes=1').auth(token, { type: 'bearer' }).expect(503).expect(({ body }) => { expect(body.error).toContain('GeoJSON analítico no disponible'); expect(body.type).toBeUndefined(); }); expect(proveedor).not.toHaveBeenCalled();
    for (const ruta of ['/api/capas/otro?mes=1', '/api/capas/ndvi?mes=13', '/api/capas/ndvi?mes=1&archivo=privado', '/api/capas-visuales/ndvi?anio=2023&mes=1&url=otra', '/api/capas-visuales/humedad_suelo?anio=2023&mes=2&fecha=2023-02-30']) await request(app).get(ruta).auth(token, { type: 'bearer' }).expect(400);
    expect(proveedor).not.toHaveBeenCalled();
  }));
  it('agricultores y técnico consultan imágenes regionales públicas sin recibir datos de otros usuarios', async () => probar(async (tx) => {
    const { app, token, ajeno, tecnico, agricultor } = await preparar(tx);
    const terreno = await tx.terreno.create({ data: { usuarioId: agricultor.id, nombre: 'Privado', latitud: -0.93, longitud: -78.62 } });
    const antes = await tx.terreno.findMany();
    for (const credencial of [token, ajeno, tecnico]) {
      const respuesta = await request(app).get('/api/capas-visuales/ndvi?anio=2023&mes=1').auth(credencial, { type: 'bearer' }).expect(200);
      expect(respuesta.body).toMatchObject({ formato: 'WMS_PNG', fuente_visual: 'NASA GIBS', resolucion_m: 250 }); expect(JSON.stringify(respuesta.body)).not.toMatch(/password|@example|Privado/);
    }
    await request(app).get(`/api/terrenos/${terreno.id}`).auth(ajeno, { type: 'bearer' }).expect(404);
    await request(app).get('/api/capas-visuales/ndvi/imagen?anio=2023&mes=1').auth(token, { type: 'bearer' }).expect('Content-Type', /image\/png/).expect(200).expect(({ body }) => { expect(Buffer.from(body).equals(bytes)).toBe(true); });
    expect(await tx.terreno.findMany()).toEqual(antes); expect(await tx.climaCache.count()).toBe(0);
  }));
  it('errores NASA devuelven indisponibilidad sin trazas, rutas privadas o imágenes ficticias', async () => probar(async (tx) => {
    const { app, token, proveedor } = await preparar(tx); proveedor.mockRejectedValue(new ErrorCapaSatelital());
    await request(app).get('/api/capas-visuales/humedad_suelo?anio=2024&mes=2').auth(token, { type: 'bearer' }).expect(503).expect(({ body }) => { expect(Object.keys(body)).toEqual(['error']); expect(body.error).toContain('NASA GIBS'); });
  }));
});
