import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';
import { firmarToken } from '../../src/services/autenticacion.js';
import { cargarCultivos } from '../../src/data/catalogoCultivos.js';

let intercalarLectura: (() => Promise<void>) | undefined;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
async function probar(accion: (tx: Prisma.TransactionClient, token: string, terrenoId: string) => Promise<void>) {
  const rollback = new Error('Rollback de auditoría de concurrencia');
  try { await prisma.$transaction(async (tx) => {
    const consultar = tx.siembra.findFirst.bind(tx.siembra);
    // Intercala una escritura SQL real justo después de leer; no cambia el cliente de producción.
    vi.spyOn(tx.siembra, 'findFirst').mockImplementation((argumentos) => {
      const consulta = consultar(argumentos); const encadenar = consulta.then.bind(consulta);
      consulta.then = (cumplir, rechazar) => encadenar(async (fila) => {
        const accionIntercalada = intercalarLectura; intercalarLectura = undefined;
        if (accionIntercalada) await accionIntercalada(); return fila;
      }).then(cumplir, rechazar);
      return consulta;
    });
    await cargarCultivos(tx);
    const usuario = await tx.usuario.create({ data: { email: `auditoria-${randomUUID()}@example.invalid`, nombre: 'Prueba aislada', passwordHash: 'fixture_sin_credencial_real' } });
    const terreno = await tx.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Nombre inicial', latitud: -0.93, longitud: -78.62, altitudM: 2775 } });
    await accion(tx, firmarToken(usuario.id, secreto), terreno.id); throw rollback;
  }, { timeout: 20000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
afterEach(() => { intercalarLectura = undefined; vi.restoreAllMocks(); }); afterAll(async () => { await prisma.$disconnect(); });
describe('Auditoría: escrituras intercaladas reales en PostgreSQL aislado', () => {
  it('editar solo el nombre no restaura ubicación, altitud, área, riego ni suelo omitidos', async () => probar(async (tx, token, id) => {
    const consultar = tx.terreno.findFirst.bind(tx.terreno);
    vi.spyOn(tx.terreno, 'findFirst').mockImplementation((argumentos) => {
      const consulta = consultar(argumentos); const encadenar = consulta.then.bind(consulta);
      consulta.then = (cumplir, rechazar) => encadenar(async (fila) => {
        await tx.terreno.update({ where: { id }, data: { latitud: -0.94, longitud: -78.63, altitudM: 2900, areaHa: 2.5, tieneRiego: true, tipoSuelo: 'franco' } });
        return fila;
      }).then(cumplir, rechazar);
      return consulta;
    });
    const altitud = vi.fn<() => Promise<number | null>>();
    const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, obtenerAltitud: altitud });
    await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ nombre: 'Solo nombre' }).expect(200);
    expect(await tx.terreno.findUniqueOrThrow({ where: { id } })).toMatchObject({ nombre: 'Solo nombre', latitud: -0.94, longitud: -78.63, altitudM: 2900, tieneRiego: true, tipoSuelo: 'franco' });
    expect((await tx.terreno.findUniqueOrThrow({ where: { id } })).areaHa?.toString()).toBe('2.5');
    expect(altitud).not.toHaveBeenCalled();
  }));
  it('un guardado de coordenadas lento conserva un nombre cambiado mientras esperaba al proveedor', async () => probar(async (tx, token, id) => {
    const leyendo = Promise.withResolvers<void>(); const continuar = Promise.withResolvers<number | null>();
    const altitud = vi.fn(async () => { leyendo.resolve(); return continuar.promise; });
    const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, obtenerAltitud: altitud });
    const pendiente = request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ latitud: -0.94 }).then((respuesta) => respuesta);
    await leyendo.promise;
    try { await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ nombre: 'Nombre actualizado' }).expect(200); }
    finally { continuar.resolve(2800); }
    expect((await pendiente).status).toBe(200);
    expect(await tx.terreno.findUniqueOrThrow({ where: { id } })).toMatchObject({ nombre: 'Nombre actualizado', latitud: -0.94, altitudM: 2800 });
  }));
  it('rechaza un par de coordenadas calculado sobre una ubicación que cambió durante la consulta', async () => probar(async (tx, token, id) => {
    const leyendo = Promise.withResolvers<void>(); const continuar = Promise.withResolvers<number | null>();
    const altitud = vi.fn<() => Promise<number | null>>().mockImplementationOnce(async () => { leyendo.resolve(); return continuar.promise; }).mockResolvedValue(2900);
    const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, obtenerAltitud: altitud });
    const pendiente = request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ latitud: -0.94 }).then((respuesta) => respuesta);
    await leyendo.promise;
    try { await request(app).put(`/api/terrenos/${id}`).auth(token, { type: 'bearer' }).send({ longitud: -78.63 }).expect(200); }
    finally { continuar.resolve(2800); }
    expect((await pendiente).status).toBe(400);
    expect(await tx.terreno.findUniqueOrThrow({ where: { id } })).toMatchObject({ latitud: -0.93, longitud: -78.63, altitudM: 2900 });
  }));
  it('editar solo notas conserva cultivo y fechas guardados después de la lectura inicial', async () => probar(async (tx, token, terrenoId) => {
    const siembra = await tx.siembra.create({ data: { terrenoId, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01'), fechaCosecha: new Date('2025-12-01') } });
    intercalarLectura = async () => { await tx.siembra.update({ where: { id: siembra.id }, data: { cultivoId: 'haba', fechaSiembra: new Date('2025-02-01'), fechaCosecha: new Date('2025-11-01') } }); };
    const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto });
    await request(app).put(`/api/siembras/${siembra.id}`).auth(token, { type: 'bearer' }).send({ notas: 'Nueva nota' }).expect(200);
    expect(await tx.siembra.findUniqueOrThrow({ where: { id: siembra.id } })).toMatchObject({ cultivoId: 'haba', fechaSiembra: new Date('2025-02-01'), fechaCosecha: new Date('2025-11-01'), notas: 'Nueva nota' });
  }));
  it('rechaza fechas validadas contra un historial que cambió antes de escribir', async () => probar(async (tx, token, terrenoId) => {
    const siembra = await tx.siembra.create({ data: { terrenoId, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01'), fechaCosecha: new Date('2025-12-01') } });
    intercalarLectura = async () => { await tx.siembra.update({ where: { id: siembra.id }, data: { fechaCosecha: new Date('2025-06-01') } }); };
    const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto });
    await request(app).put(`/api/siembras/${siembra.id}`).auth(token, { type: 'bearer' }).send({ fecha_siembra: '2025-10-01' }).expect(400);
    expect(await tx.siembra.findUniqueOrThrow({ where: { id: siembra.id } })).toMatchObject({ fechaSiembra: new Date('2025-01-01'), fechaCosecha: new Date('2025-06-01') });
  }));
});
