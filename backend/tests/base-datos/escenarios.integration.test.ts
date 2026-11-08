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
import { cargarCultivos } from '../../src/data/catalogoCultivos.js';
import { cargarPlantillas } from '../../src/data/catalogoPlantillas.js';
import { crearBasePrueba } from '../fixtures/nasaPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) {
  const rollback = new Error('Rollback de escenarios');
  try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 30000 }); } catch (error: unknown) { if (error !== rollback) throw error; }
}
async function preparar(tx: Prisma.TransactionClient) {
  await cargarCultivos(tx); await cargarPlantillas(tx);
  const usuario = await tx.usuario.create({ data: { email: `escenarios-${randomUUID()}@example.invalid`, nombre: 'Fixture de escenarios', passwordHash: 'fixture_sin_clave_real' } });
  const ajeno = await tx.usuario.create({ data: { email: `escenarios-${randomUUID()}@example.invalid`, nombre: 'Fixture ajena', passwordHash: 'fixture_sin_clave_real' } });
  const tecnico = await tx.usuario.create({ data: { email: `escenarios-${randomUUID()}@example.invalid`, nombre: 'Fixture técnica', passwordHash: 'fixture_sin_clave_real', rol: 'tecnico' } });
  const terreno = await tx.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Simulación controlada', latitud: -0.93, longitud: -78.62, altitudM: 3000, tieneRiego: false, areaHa: 1 } });
  await tx.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01') } });
  const datos = crearBasePrueba(); const proveedor = vi.fn().mockResolvedValue(datos);
  const clima = crearServicioClima(() => tx.climaCache, proveedor, () => null, () => new Date('2030-01-02T00:00:00Z'));
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, consultarClima: clima });
  return { app, proveedor, datos, terreno, token: firmarToken(usuario.id, secreto), ajeno: firmarToken(ajeno.id, secreto), tecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Simulación integrada en PostgreSQL aislado, sin modificar historial ni clima', () => {
  it('los nueve escenarios extremos/cero son repetibles, reutilizan NASA y preservan los datos originales', async () => probar(async (tx) => {
    const { app, terreno, token, proveedor, datos } = await preparar(tx);
    const antes = { terreno: await tx.terreno.findMany(), siembras: await tx.siembra.findMany(), cultivos: await tx.cultivo.findMany(), plantillas: await tx.plantillaRotacion.findMany(), datos: structuredClone(datos) };
    const consultar = async (ruta: string, lluvia: number, temperatura: number) => request(app).get(`/api/terrenos/${terreno.id}/${ruta}?lluvia_pct=${lluvia}&temp_delta=${temperatura}`).auth(token, { type: 'bearer' }).expect(200);
    const baseCalendario = await consultar('calendario', 0, 0); const baseRotaciones = await consultar('rotaciones', 0, 0);
    const cache = await tx.climaCache.findMany(); let hayCambios = false;
    for (const lluvia of [-30, 0, 30]) for (const temperatura of [-2, 0, 2]) {
      const calendario = await consultar('calendario', lluvia, temperatura); const rotaciones = await consultar('rotaciones', lluvia, temperatura);
      expect(calendario.body.escenario).toEqual({ lluvia_pct: lluvia, temp_delta: temperatura }); expect(rotaciones.body.escenario).toEqual(calendario.body.escenario);
      expect(calendario.body.celdas).toHaveLength(120); expect(rotaciones.body.estrategias).toHaveLength(3);
      expect((await consultar('calendario', lluvia, temperatura)).body.celdas).toEqual(calendario.body.celdas);
      expect((await consultar('rotaciones', lluvia, temperatura)).body.estrategias).toEqual(rotaciones.body.estrategias);
      hayCambios ||= JSON.stringify(calendario.body.celdas) !== JSON.stringify(baseCalendario.body.celdas);
    }
    expect(hayCambios).toBe(true);
    expect((await consultar('calendario', 0, 0)).body.celdas).toEqual(baseCalendario.body.celdas);
    expect((await consultar('rotaciones', 0, 0)).body.estrategias).toEqual(baseRotaciones.body.estrategias);
    expect(await tx.terreno.findMany()).toEqual(antes.terreno); expect(await tx.siembra.findMany()).toEqual(antes.siembras); expect(await tx.cultivo.findMany()).toEqual(antes.cultivos); expect(await tx.plantillaRotacion.findMany()).toEqual(antes.plantillas);
    expect(await tx.climaCache.findMany()).toEqual(cache); expect(datos).toEqual(antes.datos); expect(proveedor).toHaveBeenCalledExactlyOnceWith(-0.93, -78.62);
  }));
  it('ambos endpoints aíslan propietarios y permiten al técnico leer los mismos escenarios', async () => probar(async (tx) => {
    const { app, terreno, token, ajeno, tecnico } = await preparar(tx);
    for (const ruta of ['calendario', 'rotaciones']) {
      const url = `/api/terrenos/${terreno.id}/${ruta}?lluvia_pct=-30&temp_delta=2`;
      await request(app).get(url).expect(401); const externo = await request(app).get(url).auth(ajeno, { type: 'bearer' }).expect(404);
      const ausente = await request(app).get(`/api/terrenos/${randomUUID()}/${ruta}`).auth(token, { type: 'bearer' }).expect(404); expect(externo.body).toEqual(ausente.body);
      const propia = await request(app).get(url).auth(token, { type: 'bearer' }).expect(200); const lectura = await request(app).get(url).auth(tecnico, { type: 'bearer' }).expect(200);
      expect(lectura.body[ruta === 'calendario' ? 'celdas' : 'estrategias']).toEqual(propia.body[ruta === 'calendario' ? 'celdas' : 'estrategias']);
    }
  }));
  it('rechaza límites indebidos y suplantación de contexto sin consultar NASA', async () => probar(async (tx) => {
    const { app, terreno, token, proveedor } = await preparar(tx);
    for (const ruta of ['calendario', 'rotaciones']) for (const consulta of ['lluvia_pct=-31', 'lluvia_pct=31', 'temp_delta=-2.1', 'temp_delta=2.1', 'temp_delta=NaN', 'lluvia_pct=', 'lluvia_pct=0&lluvia_pct=1', 'usuario_id=otro', 'altitud_m=3000']) {
      await request(app).get(`/api/terrenos/${terreno.id}/${ruta}?${consulta}`).auth(token, { type: 'bearer' }).expect(400);
    }
    expect(proveedor).not.toHaveBeenCalled();
  }));
});
