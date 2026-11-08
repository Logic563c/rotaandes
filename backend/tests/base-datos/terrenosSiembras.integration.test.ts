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
import { cargarCultivos } from '../../src/data/catalogoCultivos.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
const parcela = { nombre: 'Parcela de prueba', latitud: -0.93, longitud: -78.62, area_ha: 1.25, tiene_riego: false, tipo_suelo: 'franco' };
const datosSiembra = { cultivo_id: 'papa', fecha_siembra: '2024-02-29', fecha_cosecha: null, notas: null };
interface ContextoPrueba { tx: Prisma.TransactionClient; app: ReturnType<typeof crearAplicacion>; token: string; tokenAjeno: string; tokenTecnico: string; usuarioId: string; altitud: ReturnType<typeof vi.fn<(latitud: number, longitud: number) => Promise<number | null>>> }
async function probar(accion: (contexto: ContextoPrueba) => Promise<void>) {
  const rollback = new Error('Reversión de la prueba agrícola');
  try {
    await prisma.$transaction(async (tx) => {
      await cargarCultivos(tx);
      const usuario = async (rol: string) => tx.usuario.create({ data: { email: `agricola-${randomUUID()}@example.invalid`, nombre: 'Fixture aislada', passwordHash: 'fixture_sin_credencial_real', rol } });
      const propio = await usuario('agricultor'); const ajeno = await usuario('agricultor'); const tecnico = await usuario('tecnico');
      const altitud = vi.fn<(latitud: number, longitud: number) => Promise<number | null>>().mockResolvedValue(2775);
      const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, obtenerAltitud: altitud });
      await accion({ tx, app, usuarioId: propio.id, token: firmarToken(propio.id, secreto), tokenAjeno: firmarToken(ajeno.id, secreto), tokenTecnico: firmarToken(tecnico.id, secreto), altitud });
      throw rollback;
    }, { timeout: 30000 });
  } catch (error: unknown) { if (error !== rollback) throw error; }
}
afterAll(async () => { await prisma.$disconnect(); });

describe('Terrenos y siembras HTTP / PostgreSQL aislado', () => {
  it('carga el catálogo público idempotente sin crear otras entidades', async () => probar(async ({ app, tx }) => {
    const antes = await tx.cultivo.findMany({ orderBy: { id: 'asc' } });
    await cargarCultivos(tx);
    expect(await tx.cultivo.findMany({ orderBy: { id: 'asc' } })).toEqual(antes);
    const respuesta = await request(app).get('/api/cultivos').expect(200);
    expect(respuesta.body).toHaveLength(10);
    expect(respuesta.body.find((cultivo: { id: string }) => cultivo.id === 'vicia_avena').fija_nitrogeno).toBe(true);
    expect(await tx.terreno.count()).toBe(0);
    expect(await tx.plantillaRotacion.count()).toBe(0);
  }));
  it('crea, lista, consulta, actualiza y elimina terreno con altitud de servidor', async () => probar(async ({ app, tx, token, usuarioId, altitud }) => {
    const creacion = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const id: string = creacion.body.id;
    expect(creacion.body).toMatchObject({ ...parcela, usuario_id: usuarioId, altitud_m: 2775 });
    expect(typeof creacion.body.area_ha).toBe('number');
    const listado = await request(app).get('/api/terrenos').auth(token, { type: 'bearer' }).expect(200);
    expect(listado.body).toHaveLength(1);
    await request(app).get(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).expect(200);
    await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ nombre: 'Parcela editada', area_ha: 0.29, tiene_riego: true }).expect(200);
    expect(altitud).toHaveBeenCalledTimes(1);
    altitud.mockResolvedValueOnce(null);
    await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ latitud: -0.94 }).expect(200).expect(({ body }) => { expect(body.altitud_m).toBeNull(); });
    expect(altitud).toHaveBeenCalledWith(-0.94, -78.62);
    expect((await tx.terreno.findUniqueOrThrow({ where: { id } })).altitudM).toBeNull();
    await request(app).delete(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).expect(204);
    expect(await tx.terreno.count()).toBe(0);
  }));
  it('permite crear terreno sin altitud y sin campos opcionales', async () => probar(async ({ app, token, altitud }) => {
    altitud.mockResolvedValue(null);
    const respuesta = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send({ nombre: 'Parcela simple', latitud: 0, longitud: 0 }).expect(201);
    expect(respuesta.body).toMatchObject({ altitud_m: null, area_ha: null, tiene_riego: false, tipo_suelo: null });
  }));
  it('reintenta una altitud nula al guardar la ubicación y rechaza cambios inválidos sin alterar el terreno', async () => probar(async ({ app, token, altitud, tx }) => {
    altitud.mockResolvedValueOnce(null);
    const terreno = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const id: string = terreno.body.id;
    await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ latitud: parcela.latitud, longitud: parcela.longitud }).expect(200).expect(({ body }) => { expect(body.altitud_m).toBe(2775); });
    for (const datos of [{ usuario_id: randomUUID() }, { altitud_m: 1 }, { longitud: -181 }, { area_ha: -1 }, { tipo_suelo: 'otro' }, {}]) {
      await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send(datos).expect(400);
    }
    expect((await tx.terreno.findUniqueOrThrow({ where: { id } })).nombre).toBe(parcela.nombre);
    expect(altitud).toHaveBeenCalledTimes(2);
  }));
  it.each([{ latitud: 91 }, { latitud: -91 }, { longitud: 181 }, { latitud: '0' }, { nombre: ' ' }, { nombre: 'Nombre\0invalido' }, { area_ha: -1 }, { area_ha: 0 }, { area_ha: 1000000 }, { area_ha: 0.001 }, { tiene_riego: 'false' }, { tipo_suelo: 'inventado' }, { usuario_id: randomUUID() }, { altitud_m: 3100 }, { id: randomUUID() }])('rechaza terreno inválido y campos del servidor (%#)', async (cambio) => probar(async ({ app, tx, token, altitud }) => {
    await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send({ ...parcela, ...cambio }).expect(400);
    expect(altitud).not.toHaveBeenCalled();
    expect(await tx.terreno.count()).toBe(0);
  }));
  it('oculta terrenos y siembras ajenos en todas las rutas y no filtra usuarios', async () => probar(async ({ app, token, tokenAjeno, tx }) => {
    const terreno = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const id: string = terreno.body.id;
    const siembra = await request(app).post(`/api/terrenos/${id}/siembras`).auth(token, { type: 'bearer' }).send(datosSiembra).expect(201);
    await request(app).get('/api/terrenos').auth(tokenAjeno, { type: 'bearer' }).expect(200, []);
    const ajeno = await request(app).get(`/api/terrenos/${id}`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    const inexistente = await request(app).get(`/api/terrenos/${randomUUID()}`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    expect(ajeno.body).toEqual(inexistente.body);
    await request(app).put(`/api/terrenos/${id}`).auth(tokenAjeno, { type: 'bearer' }).send({ nombre: 'Intruso' }).expect(404);
    await request(app).delete(`/api/terrenos/${id}`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    await request(app).get(`/api/terrenos/${id}/siembras`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    await request(app).post(`/api/terrenos/${id}/siembras`).auth(tokenAjeno, { type: 'bearer' }).send(datosSiembra).expect(404);
    await request(app).put(`/api/siembras/${siembra.body.id}`).auth(tokenAjeno, { type: 'bearer' }).send({ notas: 'Intruso' }).expect(404);
    await request(app).delete(`/api/siembras/${siembra.body.id}`).auth(tokenAjeno, { type: 'bearer' }).expect(404);
    expect(await tx.siembra.count()).toBe(1);
    expect(terreno.body.usuario).toBeUndefined(); expect(terreno.body.password_hash).toBeUndefined();
  }));
  it('el técnico consulta todos los terrenos e historiales pero no escribe', async () => probar(async ({ app, token, tokenTecnico }) => {
    const terreno = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const id: string = terreno.body.id;
    const siembra = await request(app).post(`/api/terrenos/${id}/siembras`).auth(token, { type: 'bearer' }).send(datosSiembra).expect(201);
    await request(app).get('/api/terrenos').auth(tokenTecnico, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body).toHaveLength(1); });
    await request(app).get(`/api/terrenos/${id}`).auth(tokenTecnico, { type: 'bearer' }).expect(200);
    await request(app).get(`/api/terrenos/${id}/siembras`).auth(tokenTecnico, { type: 'bearer' }).expect(200);
    await request(app).post('/api/terrenos').auth(tokenTecnico, { type: 'bearer' }).send(parcela).expect(403);
    await request(app).put(`/api/terrenos/${id}`).auth(tokenTecnico, { type: 'bearer' }).send({ nombre: 'Técnico' }).expect(403);
    await request(app).delete(`/api/terrenos/${id}`).auth(tokenTecnico, { type: 'bearer' }).expect(403);
    await request(app).post(`/api/terrenos/${id}/siembras`).auth(tokenTecnico, { type: 'bearer' }).send(datosSiembra).expect(403);
    await request(app).put(`/api/siembras/${siembra.body.id}`).auth(tokenTecnico, { type: 'bearer' }).send({ notas: 'Cambio' }).expect(403);
    await request(app).delete(`/api/siembras/${siembra.body.id}`).auth(tokenTecnico, { type: 'bearer' }).expect(403);
  }));
  it('persiste fechas DATE, edita, limpia cosecha, ordena historial y aplica cascada', async () => probar(async ({ app, token, tx }) => {
    const terreno = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const id: string = terreno.body.id;
    const siembra = await request(app).post(`/api/terrenos/${id}/siembras`).auth(token, { type: 'bearer' }).send(datosSiembra).expect(201);
    expect(siembra.body.fecha_siembra).toBe('2024-02-29'); expect(siembra.body.fecha_cosecha).toBeNull();
    await request(app).put(`/api/siembras/${siembra.body.id}`).auth(token, { type: 'bearer' }).send({ cultivo_id: 'haba', fecha_cosecha: '2024-09-01', notas: 'Registro de prueba' }).expect(200);
    await request(app).put(`/api/siembras/${siembra.body.id}`).auth(token, { type: 'bearer' }).send({ fecha_siembra: '2025-01-01' }).expect(400);
    await request(app).put(`/api/siembras/${siembra.body.id}`).auth(token, { type: 'bearer' }).send({ fecha_cosecha: null }).expect(200).expect(({ body }) => { expect(body.fecha_cosecha).toBeNull(); });
    await request(app).post(`/api/terrenos/${id}/siembras`).auth(token, { type: 'bearer' }).send({ ...datosSiembra, cultivo_id: 'quinua', fecha_siembra: '2025-01-01' }).expect(201);
    const historial = await request(app).get(`/api/terrenos/${id}/siembras`).auth(token, { type: 'bearer' }).expect(200);
    expect(historial.body.map((fila: { fecha_siembra: string }) => fila.fecha_siembra)).toEqual(['2025-01-01', '2024-02-29']);
    await request(app).delete(`/api/siembras/${siembra.body.id}`).auth(token, { type: 'bearer' }).expect(204);
    expect(await tx.siembra.count()).toBe(1);
    await request(app).delete(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).expect(204);
    expect(await tx.siembra.count()).toBe(0);
  }));
  it.each([{ fecha_siembra: '2026-02-29' }, { fecha_siembra: '2026-04-31' }, { fecha_siembra: '' }, { fecha_siembra: '2026-01-01T00:00:00Z' }, { fecha_cosecha: '' }, { fecha_cosecha: '2024-02-28' }, { cultivo_id: 'no_existe' }, { terreno_id: randomUUID() }, { usuario_id: randomUUID() }, { notas: 'x'.repeat(2001) }])('rechaza siembra inválida y asociaciones enviadas por el cliente (%#)', async (cambio) => probar(async ({ app, token, tx }) => {
    const terreno = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    await request(app).post(`/api/terrenos/${terreno.body.id}/siembras`).auth(token, { type: 'bearer' }).send({ ...datosSiembra, ...cambio }).expect(400);
    expect(await tx.siembra.count()).toBe(0);
  }));
  it('valida UUID y exige autenticación en todas las rutas privadas', async () => probar(async ({ app, token }) => {
    const id = randomUUID();
    await request(app).get('/api/terrenos/invalido').auth(token, { type: 'bearer' }).expect(400);
    await request(app).get(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).expect(404);
    await request(app).put(`/api/siembras/${id}`).auth(token, { type: 'bearer' }).send({ notas: 'Prueba' }).expect(404);
    await request(app).delete('/api/siembras/invalido').auth(token, { type: 'bearer' }).expect(400);
    await request(app).get('/api/terrenos').expect(401);
    await request(app).post('/api/terrenos').send(parcela).expect(401);
    await request(app).get(`/api/terrenos/${id}`).expect(401);
    await request(app).put(`/api/terrenos/${id}`).send(parcela).expect(401);
    await request(app).delete(`/api/terrenos/${id}`).expect(401);
    await request(app).get(`/api/terrenos/${id}/siembras`).expect(401);
    await request(app).post(`/api/terrenos/${id}/siembras`).send(datosSiembra).expect(401);
    await request(app).put(`/api/siembras/${id}`).send(datosSiembra).expect(401);
    await request(app).delete(`/api/siembras/${id}`).expect(401);
  }));
  it('rechaza cambios de asociación, cultivo y fecha al editar una siembra', async () => probar(async ({ app, token, tx }) => {
    const terreno = await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send(parcela).expect(201);
    const siembra = await request(app).post(`/api/terrenos/${terreno.body.id}/siembras`).auth(token, { type: 'bearer' }).send(datosSiembra).expect(201);
    for (const datos of [{ terreno_id: randomUUID() }, { cultivo_id: 'no_existe' }, { fecha_cosecha: '' }, { fecha_siembra: '2026-02-30' }, { fecha_cosecha: '2024-02-28' }, {}]) {
      await request(app).put(`/api/siembras/${siembra.body.id}`).auth(token, { type: 'bearer' }).send(datos).expect(400);
    }
    expect((await tx.siembra.findUniqueOrThrow({ where: { id: siembra.body.id } })).fechaSiembra.toISOString().slice(0, 10)).toBe('2024-02-29');
  }));
});
