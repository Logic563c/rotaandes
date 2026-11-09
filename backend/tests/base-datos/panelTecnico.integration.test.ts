import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';
import { firmarToken } from '../../src/services/autenticacion.js';
import { crearServicioPanelTecnico } from '../../src/services/panelTecnico.js';
import { crearTecnicoLocal } from '../../src/services/aprovisionarTecnico.js';
import { obtenerClavePronostico } from '../../src/services/pronostico.js';
import { cargarCultivos } from '../../src/data/catalogoCultivos.js';
import { crearBasePronostico } from '../fixtures/pronosticoPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url'); const fecha = '2030-01-01T12:00:00.000Z';
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback técnico'); try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 30000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  await cargarCultivos(tx);
  const crear = (rol: string, parroquia: string | null) => tx.usuario.create({ data: { email: `panel-${randomUUID()}@example.invalid`, nombre: 'Cuenta privada de prueba', passwordHash: 'fixture_sin_clave_real', telefono: '0999999999', parroquia, rol } });
  const agricultor = await crear('agricultor', 'Pujilí'); const segundo = await crear('agricultor', null); const tecnico = await crear('tecnico', null);
  const terreno = await tx.terreno.create({ data: { usuarioId: agricultor.id, nombre: 'A - Parcela con historial', latitud: -0.93, longitud: -78.62, areaHa: 1 } });
  const vacio = await tx.terreno.create({ data: { usuarioId: segundo.id, nombre: 'B - Parcela sin siembra', latitud: -0.94, longitud: -78.63 } });
  await tx.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01'), notas: 'Nota privada que el panel no necesita' } });
  const ultima = await tx.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'haba', fechaSiembra: new Date('2026-01-01') } });
  const cache = tx.climaCache; vi.spyOn(cache, 'findMany');
  const servicio = crearServicioPanelTecnico(() => tx, () => tx.usuario, () => cache, () => new Date('2030-01-01T12:01:00Z'));
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarPanelTecnico: servicio });
  return { app, terreno, vacio, ultima, agricultor, tecnico, token: firmarToken(tecnico.id, secreto), tokenAgricultor: firmarToken(agricultor.id, secreto), cache };
}
afterAll(async () => { await prisma.$disconnect(); });
afterEach(() => { vi.restoreAllMocks(); });
describe('Panel técnico HTTP/PostgreSQL, rollback y privacidad', () => {
  it('JWT y rol se verifican antes de consultar terrenos', async () => probar(async (tx) => {
    const { app, tokenAgricultor, cache } = await preparar(tx);
    await request(app).get('/api/tecnico/terrenos').expect(401); await request(app).get('/api/tecnico/terrenos').auth('invalido', { type: 'bearer' }).expect(401);
    await request(app).get('/api/tecnico/terrenos').auth(tokenAgricultor, { type: 'bearer' }).expect(403); expect(cache.findMany).not.toHaveBeenCalled();
  }));
  it('un token emitido previamente deja de acceder si PostgreSQL ya no autoriza el rol técnico', async () => probar(async (tx) => {
    const { app, token, tecnico } = await preparar(tx);
    await tx.usuario.update({ where: { id: tecnico.id }, data: { rol: 'agricultor' } });
    await request(app).get('/api/tecnico/terrenos').auth(token, { type: 'bearer' }).expect(403);
  }));
  it('muestra última siembra, terrenos vacíos y alerta desde una única lectura de caché, sin datos personales', async () => probar(async (tx) => {
    const { app, token, terreno, ultima, cache } = await preparar(tx); const base = crearBasePronostico(fecha); const clave = obtenerClavePronostico(-0.93, -78.62);
    await tx.climaCache.create({ data: { clave, datos: base, actualizadoEn: new Date(fecha) } });
    const antes = await tx.terreno.findMany(); const siembras = await tx.siembra.findMany();
    const respuesta = await request(app).get('/api/tecnico/terrenos').auth(token, { type: 'bearer' }).expect(200);
    expect(respuesta.body.terrenos).toHaveLength(2); expect(respuesta.body.terrenos[0]).toMatchObject({ id: terreno.id, parroquia_perfil: 'Pujilí', ultima_siembra: { id: ultima.id, cultivo_id: 'haba' }, helada: { estado: 'posible_helada', dias_evaluados: 6 } });
    expect(respuesta.body.terrenos[1]).toMatchObject({ parroquia_perfil: null, ultima_siembra: null, helada: { estado: 'desconocido' } }); expect(cache.findMany).toHaveBeenCalledOnce();
    const texto = JSON.stringify(respuesta.body); for (const privado of ['passwordHash', 'password_hash', 'email', 'telefono', 'usuario_id', 'Nota privada', 'Cuenta privada']) expect(texto).not.toContain(privado);
    expect(await tx.terreno.findMany()).toEqual(antes); expect(await tx.siembra.findMany()).toEqual(siembras); expect(await tx.climaCache.findUnique({ where: { clave } })).toMatchObject({ datos: base, actualizadoEn: new Date(fecha) });
  }));
  it('parroquia usa el perfil sin inferencia geográfica; cultivo filtra historial aunque el último sea otro', async () => probar(async (tx) => {
    const { app, token, terreno } = await preparar(tx);
    for (const consulta of ['parroquia=pujil%C3%AD', 'cultivo=papa', 'parroquia=Pujil%C3%AD&cultivo=pap' + 'a']) await request(app).get(`/api/tecnico/terrenos?${consulta}`).auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => { expect(body.terrenos.map((t: { id: string }) => t.id)).toEqual([terreno.id]); expect(body.terrenos[0].ultima_siembra.cultivo_id).toBe('haba'); });
    await request(app).get('/api/tecnico/terrenos?parroquia=NoRegistrada').auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => expect(body.terrenos).toEqual([]));
    for (const consulta of ['cultivo=no_registrado', 'pagina=0', 'cultivo=papa&cultivo=haba', 'parroquia[a]=x', 'latitud=0']) await request(app).get(`/api/tecnico/terrenos?${consulta}`).auth(token, { type: 'bearer' }).expect(400);
  }));
  it('desempata últimas siembras por creación no nula y luego UUID, sin tomar el orden de inserción', async () => probar(async (tx) => {
    const { app, token, terreno } = await preparar(tx);
    for (const id of ['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001']) await tx.siembra.create({ data: { id, terrenoId: terreno.id, cultivoId: 'cebada', fechaSiembra: new Date('2031-01-01'), creadoEn: new Date('2026-01-01') } });
    await tx.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2031-01-01'), creadoEn: null } });
    await request(app).get('/api/tecnico/terrenos').auth(token, { type: 'bearer' }).expect(200).expect(({ body }) => expect(body.terrenos[0].ultima_siembra.id).toBe('00000000-0000-4000-8000-000000000002'));
  }));
  it('pagina cincuenta terrenos sin truncar el acceso al resto ni consultar proveedores', async () => probar(async (tx) => {
    const { app, token, agricultor } = await preparar(tx);
    await tx.terreno.createMany({ data: Array.from({ length: 49 }, (_, i) => ({ usuarioId: agricultor.id, nombre: `Terreno adicional ${i}`, latitud: -0.93, longitud: -78.62 })) });
    const primera = await request(app).get('/api/tecnico/terrenos').auth(token, { type: 'bearer' }).expect(200); const segunda = await request(app).get('/api/tecnico/terrenos?pagina=2').auth(token, { type: 'bearer' }).expect(200);
    expect(primera.body.terrenos).toHaveLength(50); expect(segunda.body.terrenos).toHaveLength(1); expect(primera.body.paginacion).toMatchObject({ total: 51, paginas: 2 }); expect(primera.body.terrenos.some((t: { id: string }) => t.id === segunda.body.terrenos[0].id)).toBe(false);
  }));
  it('el técnico no puede escribir terrenos/siembras ni modificar perfiles ajenos; agricultor conserva aislamiento', async () => probar(async (tx) => {
    const { app, token, terreno, vacio, ultima, tokenAgricultor, agricultor } = await preparar(tx);
    await request(app).post('/api/terrenos').auth(token, { type: 'bearer' }).send({ nombre: 'No autorizado', latitud: -1, longitud: -78 }).expect(403);
    await request(app).put(`/api/terrenos/${terreno.id}`).auth(token, { type: 'bearer' }).send({ nombre: 'No' }).expect(403);
    await request(app).delete(`/api/terrenos/${terreno.id}`).auth(token, { type: 'bearer' }).expect(403);
    await request(app).post(`/api/terrenos/${terreno.id}/siembras`).auth(token, { type: 'bearer' }).send({ cultivo_id: 'papa', fecha_siembra: '2026-01-01' }).expect(403);
    await request(app).put(`/api/siembras/${ultima.id}`).auth(token, { type: 'bearer' }).send({ notas: 'No' }).expect(403); await request(app).delete(`/api/siembras/${ultima.id}`).auth(token, { type: 'bearer' }).expect(403);
    await request(app).put('/api/perfil').auth(token, { type: 'bearer' }).send({ usuario_id: agricultor.id, rol: 'tecnico' }).expect(400);
    await request(app).get(`/api/terrenos/${vacio.id}`).auth(tokenAgricultor, { type: 'bearer' }).expect(404);
    expect(await tx.terreno.count()).toBe(2); expect(await tx.siembra.count()).toBe(2);
  }));
  it('aprovisiona técnico solo con entrada válida y hash seguro; duplicado no cambia agricultor ni clave', async () => probar(async (tx) => {
    const { agricultor } = await preparar(tx); const password = randomBytes(24).toString('base64url'); const email = `tecnico-${randomUUID()}@example.invalid`;
    const creado = await crearTecnicoLocal({ email, nombre: 'Técnico temporal', password }, () => tx.usuario); const cuenta = await tx.usuario.findUniqueOrThrow({ where: { id: creado.id } });
    expect(cuenta.rol).toBe('tecnico'); expect(await bcrypt.compare(password, cuenta.passwordHash)).toBe(true); expect(bcrypt.getRounds(cuenta.passwordHash)).toBe(12); expect(Object.keys(creado)).toEqual(['id']);
    await expect(crearTecnicoLocal({ email: agricultor.email, nombre: 'Intento de ascenso', password }, () => tx.usuario)).rejects.toThrow('Ya existe'); expect(await tx.usuario.findUniqueOrThrow({ where: { id: agricultor.id } })).toEqual(agricultor);
    await expect(crearTecnicoLocal({ email, nombre: 'Otro', password: 'corta', rol: 'tecnico' }, () => tx.usuario)).rejects.toThrow();
  }));
});
