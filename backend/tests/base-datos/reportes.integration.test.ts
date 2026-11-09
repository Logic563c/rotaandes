import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';
import { firmarToken, publicarUsuario } from '../../src/services/autenticacion.js';
import { crearServicioReportes } from '../../src/services/reportes.js';
import type { DatosReporte } from '../../src/services/reportes.js';
import { ErrorClima } from '../../src/services/nasaPower.js';
import { ErrorPronostico } from '../../src/services/openMeteo.js';
import { ErrorTendencia } from '../../src/services/nasaHistorico.js';
import { cargarCultivos } from '../../src/data/catalogoCultivos.js';
import { cargarPlantillas } from '../../src/data/catalogoPlantillas.js';
import { reportePrueba } from '../fixtures/reportePruebas.js';
import { leerPdf } from '../fixtures/leerPdf.js';
import { crearServicioTendencia } from '../../src/services/tendencia.js';
import { crearMensualPrueba, crearDiarioPrueba } from '../fixtures/tendenciasPruebas.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
const secreto = randomBytes(48).toString('base64url'); const ahora = () => new Date('2030-01-01T12:01:00Z');
async function probar(accion: (tx: Prisma.TransactionClient) => Promise<void>) { const rollback = new Error('Rollback PDF'); try { await prisma.$transaction(async (tx) => { await accion(tx); throw rollback; }, { timeout: 30000 }); } catch (error: unknown) { if (error !== rollback) throw error; } }
async function preparar(tx: Prisma.TransactionClient) {
  await cargarCultivos(tx); await cargarPlantillas(tx);
  const crear = (rol: string) => tx.usuario.create({ data: { email: `reporte-${randomUUID()}@example.invalid`, passwordHash: 'fixture_sin_clave_real', rol, nombre: 'Nombre privado que no debe publicarse', telefono: '0999999999' } });
  const usuario = await crear('agricultor'); const ajeno = await crear('agricultor'); const tecnico = await crear('tecnico');
  const terreno = await tx.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Viña Ñandú de Pujilí', latitud: -0.93, longitud: -78.62, altitudM: 3000, areaHa: 1.2, tieneRiego: false } });
  await tx.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2028-10-01'), notas: 'Nota confidencial innecesaria para el informe' } });
  const datos = reportePrueba(); const clima = vi.fn().mockResolvedValue(datos.clima); const pronostico = vi.fn().mockResolvedValue(datos.pronostico);
  const tendencia = crearServicioTendencia(() => tx.climaCache, { mensual: vi.fn().mockResolvedValue(crearMensualPrueba()), diario: vi.fn().mockResolvedValue(crearDiarioPrueba()) }, ahora);
  const servicio = crearServicioReportes(() => tx, clima, pronostico, tendencia, ahora);
  const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => tx.usuario, obtenerBase: () => tx, obtenerSecreto: () => secreto, generarReporte: servicio });
  return { app, terreno, clima, pronostico, servicio, usuario: publicarUsuario(usuario), token: firmarToken(usuario.id, secreto), ajeno: firmarToken(ajeno.id, secreto), tecnico: firmarToken(tecnico.id, secreto) };
}
afterAll(async () => { await prisma.$disconnect(); });
describe('Informe PDF HTTP con datos y motores PostgreSQL reales aislados', () => {
  it('autenticación y acceso horizontal se comprueban antes de los proveedores', async () => probar(async (tx) => {
    const { app, terreno, ajeno, clima } = await preparar(tx); const ruta = `/api/terrenos/${terreno.id}/reporte.pdf`;
    await request(app).get(ruta).expect(401); await request(app).get(ruta).auth('invalido', { type: 'bearer' }).expect(401); await request(app).get(ruta).auth(ajeno, { type: 'bearer' }).expect(404); expect(clima).not.toHaveBeenCalled();
  }));
  it('rechaza UUID, recurso inexistente y consultas adicionales', async () => probar(async (tx) => {
    const { app, token, terreno, clima } = await preparar(tx);
    await request(app).get('/api/terrenos/invalido/reporte.pdf').auth(token, { type: 'bearer' }).expect(400);
    await request(app).get(`/api/terrenos/${randomUUID()}/reporte.pdf`).auth(token, { type: 'bearer' }).expect(404);
    await request(app).get(`/api/terrenos/${terreno.id}/reporte.pdf?lluvia_pct=30`).auth(token, { type: 'bearer' }).expect(400); expect(clima).not.toHaveBeenCalled();
  }));
  it('descarga un PDF auténtico con historial/cálculos/fuentes y sin datos privados', async () => probar(async (tx) => {
    const { app, terreno, token, clima, pronostico } = await preparar(tx); const antes = await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } });
    const respuesta = await request(app).get(`/api/terrenos/${terreno.id}/reporte.pdf`).auth(token, { type: 'bearer' }).expect(200).expect('Content-Type', /application\/pdf/);
    expect(respuesta.headers['content-disposition']).toBe(`attachment; filename="rotaandes-${terreno.id}.pdf"`); expect(Buffer.isBuffer(respuesta.body)).toBe(true);
    const documento = await leerPdf(respuesta.body); for (const texto of ['Viña Ñandú', 'NASA POWER', 'Open-Meteo', 'Papa', '2028-10-01']) expect(documento.texto.includes(texto)).toBe(true);
    for (const privado of ['Nombre privado', '0999999999', 'Nota confidencial', 'password_hash', token]) expect(documento.texto.includes(privado)).toBe(false);
    expect(documento.texto.includes('2005')).toBe(true); expect(clima).toHaveBeenCalledOnce(); expect(pronostico).toHaveBeenCalledOnce(); expect(await tx.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(antes); expect(await tx.siembra.count()).toBe(1);
  }));
  it('permite lectura al técnico y mantiene prohibición de escritura', async () => probar(async (tx) => {
    const { app, terreno, tecnico } = await preparar(tx); await request(app).get(`/api/terrenos/${terreno.id}/reporte.pdf`).auth(tecnico, { type: 'bearer' }).expect(200);
    await request(app).delete(`/api/terrenos/${terreno.id}`).auth(tecnico, { type: 'bearer' }).expect(403);
  }));
  it('fallo de proveedores conserva secciones verificables, nunca falsos datos ni éxito JSON', async () => probar(async (tx) => {
    const { terreno, usuario, clima, pronostico } = await preparar(tx); clima.mockRejectedValue(new ErrorClima()); pronostico.mockRejectedValue(new ErrorPronostico());
    const servicio = crearServicioReportes(() => tx, clima, pronostico, async () => { throw new ErrorTendencia(); }, ahora);
    const { texto } = await leerPdf(await servicio(terreno.id, usuario)); expect(texto.includes('Climatología no disponible')).toBe(true); expect(texto.includes('Estado de heladas desconocido')).toBe(true); expect(texto.includes('Viña Ñandú')).toBe(true);
  }));
  it('un fallo SQL/interno no se disfraza de informe parcial correcto', async () => probar(async (tx) => {
    const { app, terreno, token, clima } = await preparar(tx); clima.mockRejectedValue(new Error('Fallo interno controlado de prueba'));
    const respuesta = await request(app).get(`/api/terrenos/${terreno.id}/reporte.pdf`).auth(token, { type: 'bearer' }).expect(500); expect(respuesta.headers['content-type']).toContain('application/json'); expect(Object.keys(respuesta.body)).toEqual(['error']);
  }));
  it('limita concurrencia y admite recuperación sin liberar el cupo mientras sigue el trabajo', async () => probar(async (tx) => {
    const { terreno, usuario, clima, pronostico } = await preparar(tx); const pendiente = Promise.withResolvers<DatosReporte['clima']>(); clima.mockReturnValueOnce(pendiente.promise);
    const servicio = crearServicioReportes(() => tx, clima, pronostico, async () => { throw new ErrorTendencia(); }, ahora);
    const primera = servicio(terreno.id, usuario); await vi.waitFor(() => expect(clima).toHaveBeenCalledOnce()); await expect(servicio(terreno.id, usuario)).rejects.toMatchObject({ codigoHttp: 429 });
    pendiente.resolve(reportePrueba().clima); await primera; expect((await servicio(terreno.id, usuario)).subarray(0, 5).toString()).toBe('%PDF-');
  }));
  it('no trunca historiales excesivos ni realiza llamadas cuando la descarga ya fue cancelada', async () => probar(async (tx) => {
    const { terreno, usuario, servicio, clima } = await preparar(tx); const control = new AbortController(); control.abort(); await expect(servicio(terreno.id, usuario, control.signal)).rejects.toThrow('cancelada');
    await tx.siembra.createMany({ data: Array.from({ length: 200 }, () => ({ terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2028-01-01') })) });
    await expect(servicio(terreno.id, usuario)).rejects.toThrow('200 siembras'); expect(clima).not.toHaveBeenCalled();
  }));
  it('al agotar el plazo no renderiza una respuesta tardía y conserva el cupo hasta finalizar', async () => probar(async (tx) => {
    const { terreno, usuario, clima, pronostico } = await preparar(tx); const pendiente = Promise.withResolvers<DatosReporte['clima']>(); clima.mockReturnValueOnce(pendiente.promise);
    const renderizar = vi.fn().mockResolvedValue(Buffer.from('resultado controlado del planificador; no es evidencia PDF'));
    const servicio = crearServicioReportes(() => tx, clima, pronostico, async () => { throw new ErrorTendencia(); }, ahora, renderizar, 40);
    await expect(servicio(terreno.id, usuario)).rejects.toMatchObject({ codigoHttp: 500 }); await expect(servicio(terreno.id, usuario)).rejects.toMatchObject({ codigoHttp: 429 });
    pendiente.resolve(reportePrueba().clima);
    await vi.waitFor(async () => { expect((await servicio(terreno.id, usuario)).toString()).toContain('planificador'); }); expect(renderizar).toHaveBeenCalledOnce();
  }));
});
