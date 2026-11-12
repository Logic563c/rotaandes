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

// Base PostgreSQL local aislada; cada prueba se revierte. Geometrías sintéticas, no parcelas reales.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
const parcela = { nombre: 'Parcela delimitada de prueba', latitud: -0.93, longitud: -78.62, area_ha: 1.5, tiene_riego: false, tipo_suelo: 'franco' };
const zona = { type: 'Polygon', coordinates: [[[-78.6205, -0.9305], [-78.6195, -0.9305], [-78.6195, -0.9295], [-78.6205, -0.9295], [-78.6205, -0.9305]]] };
interface Contexto { tx: Prisma.TransactionClient; app: ReturnType<typeof crearAplicacion>; token: string; tokenAjeno: string; tokenTecnico: string }
async function probar(accion: (contexto: Contexto) => Promise<void>) {
  const rollback = new Error('Reversión de la prueba de delimitación');
  try {
    await prisma.$transaction(async (tx) => {
      const usuario = async (rol: string) => tx.usuario.create({ data: { email: `delimitacion-${randomUUID()}@example.invalid`, nombre: 'Fixture aislada', passwordHash: 'fixture_sin_credencial_real', rol } });
      const propio = await usuario('agricultor'); const ajeno = await usuario('agricultor'); const tecnico = await usuario('tecnico');
      const altitud = vi.fn<(latitud: number, longitud: number) => Promise<number | null>>().mockResolvedValue(2800);
      const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, obtenerAltitud: altitud });
      await accion({ tx, app, token: firmarToken(propio.id, secreto), tokenAjeno: firmarToken(ajeno.id, secreto), tokenTecnico: firmarToken(tecnico.id, secreto) });
      throw rollback;
    }, { timeout: 30000 });
  } catch (error: unknown) { if (error !== rollback) throw error; }
}
afterAll(async () => { await prisma.$disconnect(); });

describe('Delimitación de la zona de cultivo / PostgreSQL aislado', () => {
  it('un terreno nuevo o antiguo funciona sin polígono', async () => probar(async ({ app, tx, token }) => {
    const creado = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    expect(creado.body).toMatchObject({ poligono: null, area_poligono_m2: null });
    expect((await tx.terreno.findUniqueOrThrow({ where: { id: creado.body.id } })).poligono).toBeNull();
  }));
  it('guarda, recupera, edita y elimina la delimitación sin tocar el área declarada', async () => probar(async ({ app, tx, token }) => {
    const { body: { id } } = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const guardado = await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(token, { type: 'bearer' }).send({ poligono: zona }).expect(200);
    expect(guardado.body.poligono.type).toBe('Polygon');
    expect(guardado.body.poligono.coordinates[0]).toHaveLength(5);
    expect(guardado.body.area_poligono_m2).toBeGreaterThan(12000); expect(guardado.body.area_poligono_m2).toBeLessThan(12500);
    expect(guardado.body.area_ha).toBe(1.5);
    const fila = await tx.terreno.findUniqueOrThrow({ where: { id } });
    expect(fila.poligono).toEqual(guardado.body.poligono); expect(fila.areaHa?.toNumber()).toBe(1.5);
    const recuperado = await request(app).get(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).expect(200);
    expect(recuperado.body.poligono).toEqual(guardado.body.poligono);
    expect((await request(app).get('/api/terrenos').auth(token, { type: 'bearer' }).expect(200)).body[0].poligono).toEqual(guardado.body.poligono);
    // Editar un vértice: se envía de nuevo la geometría completa.
    const editada = structuredClone(zona); editada.coordinates[0]![2] = [-78.619, -0.929];
    const cambio = await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(token, { type: 'bearer' }).send({ poligono: editada }).expect(200);
    expect(cambio.body.area_poligono_m2).toBeGreaterThan(guardado.body.area_poligono_m2);
    await request(app).delete(`/api/terrenos/${id}/delimitacion`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body).toMatchObject({ poligono: null, area_poligono_m2: null, area_ha: 1.5 }); });
    expect((await tx.terreno.findUniqueOrThrow({ where: { id } })).poligono).toBeNull();
  }));
  it('rechaza polígonos inválidos con 400 y no modifica la base', async () => probar(async ({ app, tx, token }) => {
    const { body: { id } } = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const moño = { type: 'Polygon', coordinates: [[[-78.621, -0.931], [-78.619, -0.929], [-78.619, -0.931], [-78.621, -0.929], [-78.621, -0.931]]] };
    for (const cuerpo of [{ poligono: moño }, { poligono: { ...zona, coordinates: [zona.coordinates[0]!.slice(0, -1)] } }, { poligono: zona, usuario_id: randomUUID() }, {}]) {
      const respuesta = await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(token, { type: 'bearer' }).send(cuerpo).expect(400);
      expect(typeof respuesta.body.error).toBe('string');
    }
    expect((await tx.terreno.findUniqueOrThrow({ where: { id } })).poligono).toBeNull();
  }));
  it('otro agricultor no puede ver, guardar ni borrar la delimitación y el técnico solo puede leerla', async () => probar(async ({ app, tx, token, tokenAjeno, tokenTecnico }) => {
    const { body: { id } } = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(token, { type: 'bearer' }).send({ poligono: zona }).expect(200);
    await request(app).get(`/api/terrenos/${id}`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(tokenAjeno, { type: 'bearer' }).send({ poligono: zona }).expect(404);
    await request(app).delete(`/api/terrenos/${id}/delimitacion`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(tokenTecnico, { type: 'bearer' }).send({ poligono: zona }).expect(403);
    await request(app).delete(`/api/terrenos/${id}/delimitacion`).auth(tokenTecnico, { type: 'bearer' }).expect(403);
    await request(app).put(`/api/terrenos/${id}/delimitacion`).send({ poligono: zona }).expect(401);
    expect((await request(app).get(`/api/terrenos/${id}`).auth(tokenTecnico, { type: 'bearer' }).expect(200)).body.poligono.type).toBe('Polygon');
    expect((await tx.terreno.findUniqueOrThrow({ where: { id } })).poligono).not.toBeNull();
    await request(app).put(`/api/terrenos/not-a-uuid/delimitacion`).auth(token, { type: 'bearer' }).send({ poligono: zona }).expect(400);
  }));
  it('no permite mover el terreno lejos de su zona delimitada, pero sí moverlo cerca', async () => probar(async ({ app, token }) => {
    const { body: { id } } = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    await request(app).put(`/api/terrenos/${id}/delimitacion`).auth(token, { type: 'bearer' }).send({ poligono: zona }).expect(200);
    const lejos = await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ latitud: -0.5 }).expect(400);
    expect(lejos.body.error).toContain('Elimina la delimitación');
    await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ latitud: -0.9301 }).expect(200);
  }));
});
