import { randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';
import { autenticar } from '../../src/middleware/auth.js';
import { permitirRoles } from '../../src/middleware/rol.js';
import { manejarErrores } from '../../src/middleware/errores.js';
import { AUDIENCIA_JWT, COSTE_BCRYPT, EMISOR_JWT, firmarToken } from '../../src/services/autenticacion.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) }) });
const secreto = randomBytes(48).toString('base64url');
const password = randomBytes(24).toString('base64url');
const datosRegistro = () => ({ email: `auth-${randomUUID()}@example.invalid`, nombre: 'Agricultora de prueba', password });
const rollback = new Error('Reversión de prueba');
async function probar(accion: (transaccion: Prisma.TransactionClient, aplicacion: ReturnType<typeof crearAplicacion>) => Promise<void>) {
  try {
    await prisma.$transaction(async (transaccion) => {
      const aplicacion = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => transaccion.usuario, obtenerSecreto: () => secreto });
      await accion(transaccion, aplicacion);
      throw rollback;
    }, { timeout: 30_000 });
  } catch (error: unknown) { if (error !== rollback) throw error; }
}
afterAll(async () => { await prisma.$disconnect(); });

describe('Autenticación HTTP con PostgreSQL aislado y rollback', () => {
  it('registra, normaliza correo, verifica bcrypt y persiste sin publicar hash', async () => probar(async (tx, app) => {
    const datos = datosRegistro();
    const respuesta = await request(app).post('/api/auth/registro').send({ ...datos, email: ` ${datos.email.toUpperCase()} ` }).expect(201);
    expect(respuesta.body.usuario.email === datos.email).toBe(true);
    expect(respuesta.body.usuario.rol).toBe('agricultor');
    expect(Object.keys(respuesta.body.usuario)).not.toContain('password_hash');
    expect(Object.keys(respuesta.body.usuario)).not.toContain('passwordHash');
    const guardado = await tx.usuario.findUniqueOrThrow({ where: { email: datos.email } });
    expect(await bcrypt.compare(password, guardado.passwordHash)).toBe(true);
    expect(bcrypt.getRounds(guardado.passwordHash)).toBe(COSTE_BCRYPT);
    expect(respuesta.headers['cache-control']).toBe('no-store');
    const yo = await request(app).get('/api/auth/yo').auth(respuesta.body.token, { type: 'bearer' }).expect(200);
    expect(yo.body).toEqual(respuesta.body.usuario);
    await request(app).post('/api/auth/registro').send(datos).expect(400);
  }));
  it.each([
    { email: 'correo-invalido' }, { nombre: ' ' }, { nombre: 'Nombre\0invalido' }, { password: 'corta' }, { password: 'á'.repeat(37) },
    { password: 'a'.repeat(73) }, { password: 'correcta-pero\0nula' }, { rol: 'tecnico' }, { id: randomUUID() }, { prioridad_agua: 5 },
  ])('rechaza registro inválido o campos protegidos (%#)', async (cambio) => probar(async (tx, app) => {
    const datos = { ...datosRegistro(), ...cambio };
    await request(app).post('/api/auth/registro').send(datos).expect(400);
    expect(await tx.usuario.count()).toBe(0);
  }));
  it('acepta exactamente 72 bytes sin truncar y distingue claves incorrectas', async () => probar(async (_tx, app) => {
    const datos = { ...datosRegistro(), password: 'á'.repeat(36) };
    await request(app).post('/api/auth/registro').send(datos).expect(201);
    await request(app).post('/api/auth/login').send({ email: datos.email, password: datos.password }).expect(200);
    const incorrecta = await request(app).post('/api/auth/login').send({ email: datos.email, password }).expect(401);
    const ausente = await request(app).post('/api/auth/login').send({ email: datosRegistro().email, password }).expect(401);
    expect(incorrecta.body).toEqual(ausente.body);
  }));
  it('impide consultas y cambios sin autenticación y limita intentos', async () => probar(async (_tx, app) => {
    await request(app).get('/api/auth/yo').expect(401);
    await request(app).put('/api/perfil').send({ nombre: 'Intruso' }).expect(401);
    for (let intento = 0; intento < 10; intento++) await request(app).post('/api/auth/login').send({}).expect(400);
    const respuesta = await request(app).post('/api/auth/login').send({}).expect(429);
    expect(respuesta.headers['retry-after']).toBeDefined();
    expect(Object.keys(respuesta.body)).toEqual(['error']);
  }));
  it('rechaza JWT alterado, expirado, algoritmo distinto y usuario inexistente', async () => probar(async (_tx, app) => {
    const registro = await request(app).post('/api/auth/registro').send(datosRegistro()).expect(201);
    const id: string = registro.body.usuario.id;
    const opciones = { subject: id, issuer: EMISOR_JWT, audience: AUDIENCIA_JWT };
    const tokens = [
      registro.body.token.slice(0, -8) + 'alterado',
      jwt.sign({}, secreto, { ...opciones, algorithm: 'HS256', expiresIn: -1 }),
      jwt.sign({}, secreto, { ...opciones, algorithm: 'HS384', expiresIn: 900 }),
      jwt.sign({}, secreto, { ...opciones, algorithm: 'HS256', expiresIn: 900, audience: 'otro' }),
      firmarToken(randomUUID(), secreto),
    ];
    for (const token of tokens) await request(app).get('/api/auth/yo').auth(token, { type: 'bearer' }).expect(401);
  }));
  it('actualiza solo el perfil autenticado y conserva campos públicos', async () => probar(async (tx, app) => {
    const registro = await request(app).post('/api/auth/registro').send(datosRegistro()).expect(201);
    const token: string = registro.body.token;
    const otro = await tx.usuario.create({ data: { email: datosRegistro().email, passwordHash: await bcrypt.hash(password, COSTE_BCRYPT), nombre: 'Otro usuario' } });
    const respuesta = await request(app).put('/api/perfil').auth(token, { type: 'bearer' }).send({ nombre: 'Nombre actualizado', parroquia: 'Latacunga', telefono: '+593 99 123 4567', prioridad_agua: 5, prioridad_suelo: 1, prioridad_ingresos: 4 }).expect(200);
    expect(respuesta.body.prioridad_agua).toBe(5);
    expect(respuesta.body.password_hash).toBeUndefined();
    expect(respuesta.body.passwordHash).toBeUndefined();
    expect((await tx.usuario.findUniqueOrThrow({ where: { id: registro.body.usuario.id } })).nombre).toBe('Nombre actualizado');
    expect((await tx.usuario.findUniqueOrThrow({ where: { id: otro.id } })).nombre).toBe('Otro usuario');
    await request(app).put('/api/perfil').auth(token, { type: 'bearer' }).send({ parroquia: '', telefono: '' }).expect(200).expect(({ body }) => { expect(body.parroquia).toBeNull(); expect(body.telefono).toBeNull(); });
  }));
  it.each([{ rol: 'tecnico' }, { id: randomUUID() }, { password: 'otra' }, { prioridad_agua: 0 }, { prioridad_suelo: 6 }, { prioridad_ingresos: 1.5 }, { prioridad_agua: '5' }, { telefono: 'abc' }, {}])('rechaza cambios protegidos y prioridades inválidas (%#)', async (cambio) => probar(async (_tx, app) => {
    const registro = await request(app).post('/api/auth/registro').send(datosRegistro()).expect(201);
    await request(app).put('/api/perfil').auth(registro.body.token, { type: 'bearer' }).send(cambio).expect(400);
  }));
  it('autoriza técnicos según la base y aplica roles reutilizables sin confiar en claims', async () => probar(async (tx, app) => {
    const registro = await request(app).post('/api/auth/registro').send(datosRegistro()).expect(201);
    const id: string = registro.body.usuario.id;
    const protegido = express();
    protegido.get('/lectura-tecnica', autenticar(() => tx.usuario, () => secreto), permitirRoles('tecnico'), (_req, res) => { res.json({ ok: true }); });
    protegido.get('/edicion-agricultor', autenticar(() => tx.usuario, () => secreto), permitirRoles('agricultor'), (_req, res) => { res.json({ ok: true }); });
    protegido.use(manejarErrores);
    const tokenConRolFalso = jwt.sign({ rol: 'tecnico' }, secreto, { subject: id, issuer: EMISOR_JWT, audience: AUDIENCIA_JWT, expiresIn: 900 });
    await request(protegido).get('/lectura-tecnica').auth(tokenConRolFalso, { type: 'bearer' }).expect(403);
    await tx.usuario.update({ where: { id }, data: { rol: 'tecnico' } });
    await request(protegido).get('/lectura-tecnica').auth(registro.body.token, { type: 'bearer' }).expect(200);
    await request(protegido).get('/edicion-agricultor').auth(registro.body.token, { type: 'bearer' }).expect(403);
    const ingreso = await request(app).post('/api/auth/login').send({ email: registro.body.usuario.email, password }).expect(200);
    expect(ingreso.body.usuario.rol).toBe('tecnico');
    await tx.usuario.delete({ where: { id } });
    await request(app).get('/api/auth/yo').auth(registro.body.token, { type: 'bearer' }).expect(401);
  }));
  it('protege JSON, tamaño y preflight CORS', async () => probar(async (_tx, app) => {
    await request(app).post('/api/auth/registro').set('Content-Type', 'application/json').send('{').expect(400);
    await request(app).post('/api/auth/registro').send({ nombre: 'x'.repeat(17000) }).expect(400);
    const cors = await request(app).options('/api/perfil').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'PUT').set('Access-Control-Request-Headers', 'authorization,content-type').expect(204);
    expect(cors.headers['access-control-allow-methods']).toContain('PUT');
    expect(cors.headers['access-control-allow-headers']).toContain('Authorization');
    await request(app).post('/api/auth/login').set('Origin', 'https://ajeno.invalid').send({}).expect(403);
  }));
});
