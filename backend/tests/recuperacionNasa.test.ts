// Regresiones de la auditoría del 9-11-2026: coordenadas redondeadas a milésimas por NASA POWER,
// reintentos acotados, cola de concurrencia y respaldo NASA oficial por celda de cuadrícula.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { coincideCoordenadaNasa, crearClienteNasa, ErrorClima, PARAMETROS_NASA, procesarRespuestaNasa } from '../src/services/nasaPower.js';
import { compartenCeldaNasa, obtenerCeldaNasa } from '../src/services/cuadriculaNasa.js';
import { buscarRespaldoClima } from '../src/data/respaldosClima.js';
import { crearServicioClima } from '../src/services/clima.js';
import procedenciaCeldas from '../src/data/clima/celdas/procedencia.json' with { type: 'json' };
import { crearRespuestaPrueba } from './fixtures/nasaPruebas.js';
import procedenciaTendencia from '../src/data/tendencia/procedencia.json' with { type: 'json' };
import { buscarRespaldoDiario, buscarRespaldoMensual } from '../src/data/respaldosTendencia.js';
import { crearServicioTendencia } from '../src/services/tendencia.js';
import { ErrorTendencia } from '../src/services/nasaHistorico.js';

const JSON_NASA = { 'content-type': 'application/json' };
const responder = () => new Response(JSON.stringify(crearRespuestaPrueba()), { headers: JSON_NASA });
const opcionesRapidas = { tiempoEsperaMs: 200, esperaReintentoMs: 1 };

describe('Coordenadas devueltas por NASA POWER v2.10.1', () => {
  it('acepta el redondeo a milésimas observado en producción para un punto marcado en el mapa', () => {
    const datos = crearRespuestaPrueba(); datos.geometry.coordinates = [-78.616, -0.935, 2958.26];
    const base = procesarRespuestaNasa(datos, -0.934512, -78.615873, '2030-01-01T00:00:00.000Z');
    expect(base.latitud).toBe(-0.934512); expect(base.longitud).toBe(-78.615873);
    expect(base.advertencias[0]).toContain('menor precisión');
  });
  it('sigue rechazando otra ubicación, precisiones no compatibles y valores no finitos', () => {
    expect(coincideCoordenadaNasa(-0.935, -0.934512)).toBe(true);
    expect(coincideCoordenadaNasa(-0.936, -0.934512)).toBe(false);
    expect(coincideCoordenadaNasa(-0.9345, -0.934512)).toBe(false);
    expect(coincideCoordenadaNasa(-0.93, -0.934512)).toBe(true);
    expect(coincideCoordenadaNasa(-0.94, -0.934512)).toBe(false);
    expect(coincideCoordenadaNasa(Number.NaN, -0.93)).toBe(false);
    expect(coincideCoordenadaNasa(undefined, -0.93)).toBe(false);
  });
});

describe('Cliente NASA: reintentos, tiempo de espera y concurrencia', () => {
  it('reintenta una vez un fallo transitorio (503) y devuelve el dato real', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 503, headers: JSON_NASA })).mockImplementation(async () => responder());
    const base = await crearClienteNasa(solicitar, () => new Date('2030-01-01T00:00:00Z'), opcionesRapidas)(-0.93, -78.62);
    expect(base.parametros.T2M_MIN.valores[0]).toBe(3.97); expect(solicitar).toHaveBeenCalledTimes(2);
  });
  it('no reintenta un rechazo definitivo (400) ni un contenido que no es JSON', async () => {
    const rechazo = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 400, headers: JSON_NASA }));
    await expect(crearClienteNasa(rechazo, undefined, opcionesRapidas)(-0.93, -78.62)).rejects.toMatchObject({ motivo: 'http_rechazo', estadoHttp: 400 });
    expect(rechazo).toHaveBeenCalledTimes(1);
    const html = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }));
    await expect(crearClienteNasa(html, undefined, opcionesRapidas)(-0.93, -78.62)).rejects.toMatchObject({ motivo: 'contenido' });
    expect(html).toHaveBeenCalledTimes(1);
  });
  it('agota los dos intentos ante caída de red y clasifica el motivo sin datos fabricados', async () => {
    const solicitar = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('red'));
    await expect(crearClienteNasa(solicitar, undefined, opcionesRapidas)(-0.93, -78.62)).rejects.toMatchObject({ motivo: 'red' });
    expect(solicitar).toHaveBeenCalledTimes(2);
  });
  it('pone en cola la tercera consulta simultánea en lugar de rechazarla al instante', async () => {
    let activas = 0; let maximo = 0;
    const solicitar: typeof fetch = async () => { activas++; maximo = Math.max(maximo, activas); await new Promise((resolver) => { setTimeout(resolver, 20); }); activas--; return responder(); };
    const cliente = crearClienteNasa(solicitar, () => new Date('2030-01-01T00:00:00Z'), opcionesRapidas);
    const resultados = await Promise.all([cliente(-0.93, -78.62), cliente(-0.93, -78.62), cliente(-0.93, -78.62)]);
    expect(resultados).toHaveLength(3); expect(maximo).toBe(2);
  });
  it('limita la cola de espera para no acumular solicitudes sin fin', async () => {
    const solicitar: typeof fetch = async () => { await new Promise((resolver) => { setTimeout(resolver, 20); }); return responder(); };
    const cliente = crearClienteNasa(solicitar, () => new Date('2030-01-01T00:00:00Z'), { ...opcionesRapidas, maximoEnEspera: 1 });
    const resultados = await Promise.allSettled([cliente(-0.93, -78.62), cliente(-0.93, -78.62), cliente(-0.93, -78.62), cliente(-0.93, -78.62)]);
    expect(resultados.filter((resultado) => resultado.status === 'rejected')).toHaveLength(1);
    const rechazo = resultados.find((resultado) => resultado.status === 'rejected');
    expect(rechazo?.status === 'rejected' && rechazo.reason instanceof ErrorClima && rechazo.reason.motivo).toBe('limite_local');
  });
});

describe('Cuadrícula nativa NASA POWER', () => {
  it('reproduce los bordes observados en consultas reales', () => {
    // Bordes verificados: latitud -0,75; longitud -78,4375 (meteorología) y -79 (radiación).
    expect(compartenCeldaNasa(obtenerCeldaNasa(-0.93, -78.441), obtenerCeldaNasa(-0.93, -78.62))).toBe(true);
    expect(compartenCeldaNasa(obtenerCeldaNasa(-0.93, -78.434), obtenerCeldaNasa(-0.93, -78.62))).toBe(false);
    expect(compartenCeldaNasa(obtenerCeldaNasa(-0.751, -78.62), obtenerCeldaNasa(-0.93, -78.62))).toBe(true);
    expect(compartenCeldaNasa(obtenerCeldaNasa(-0.749, -78.62), obtenerCeldaNasa(-0.93, -78.62))).toBe(false);
    expect(compartenCeldaNasa(obtenerCeldaNasa(-0.93, -78.999), obtenerCeldaNasa(-0.93, -78.62))).toBe(true);
    expect(compartenCeldaNasa(obtenerCeldaNasa(-0.93, -79.001), obtenerCeldaNasa(-0.93, -78.62))).toBe(false);
  });
  it('no asigna celda a un punto exactamente sobre un borde ni a coordenadas inválidas', () => {
    expect(obtenerCeldaNasa(-0.75, -78.62)).toBeNull();
    expect(obtenerCeldaNasa(-0.93, -78.4375)).toBeNull();
    expect(obtenerCeldaNasa(-1, -78.62)).toBeNull();
    expect(obtenerCeldaNasa(Number.NaN, -78.62)).toBeNull();
    expect(obtenerCeldaNasa(-0.93, 200)).toBeNull();
  });
});

describe('Respaldo oficial NASA por celda', () => {
  it('conserva 16 respuestas reales íntegras, una por cada pareja de celdas distinta', () => {
    expect(procedenciaCeldas).toHaveLength(16);
    const claves = new Set(procedenciaCeldas.map((registro) => JSON.stringify(registro.celda)));
    expect(claves.size).toBe(16);
    for (const registro of procedenciaCeldas) {
      const bytes = readFileSync(new URL(`../src/data/clima/celdas/${registro.archivo}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(registro.sha256);
      expect(registro.url).toContain(`latitude=${registro.latitud}&longitude=${registro.longitud}`);
      expect(JSON.stringify(obtenerCeldaNasa(registro.latitud, registro.longitud))).toBe(JSON.stringify(registro.celda));
    }
  });
  it('coincide valor por valor con el respaldo exacto de Latacunga descargado otro día en la misma celda', () => {
    const exacto = buscarRespaldoClima(-0.93, -78.62);
    const celda = buscarRespaldoClima(-0.930001, -78.62);
    expect(exacto && celda).toBeTruthy();
    for (const clave of PARAMETROS_NASA) expect(celda?.parametros[clave].valores).toEqual(exacto?.parametros[clave].valores);
  });
  it('cubre Latacunga, Pujilí, Saquisilí, Salcedo y el páramo marcados con decimales de mapa', () => {
    for (const [latitud, longitud] of [[-0.934512, -78.615873], [-0.961234, -78.701111], [-0.836789, -78.664321], [-1.043211, -78.589876], [-0.701234, -78.551234]] as const) {
      const respaldo = buscarRespaldoClima(latitud, longitud);
      expect(respaldo?.latitud).toBe(latitud); expect(respaldo?.longitud).toBe(longitud);
      expect(respaldo?.advertencias[0]).toMatch(/Respaldo NASA POWER archivado.*no una medición del lote/);
    }
  });
  it('no ofrece respaldo fuera de las celdas descargadas ni sobre un borde', () => {
    expect(buscarRespaldoClima(-2.5, -78.6)).toBeNull();
    expect(buscarRespaldoClima(-0.75, -78.62)).toBeNull();
  });
  it('el servicio usa el respaldo de la celda cuando NASA cae y no hay caché, sin escribirlo como consulta nueva', async () => {
    const cache = { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
    const servicio = crearServicioClima(() => cache, vi.fn().mockRejectedValue(new ErrorClima('tiempo_agotado')), buscarRespaldoClima, () => new Date('2026-11-10T00:00:00Z'));
    const resultado = await servicio(-0.934512, -78.615873, 2800);
    expect(resultado.estado_datos).toBe('respaldo'); expect(resultado.mensual).toHaveLength(12);
    expect(resultado.mensual[0]?.t_min).toBe(3.97); expect(resultado.actualizado_en).toBe(procedenciaCeldas.find((registro) => registro.latitud === -0.875 && registro.longitud === -78.719)?.consultado_en);
    expect(cache.upsert).not.toHaveBeenCalled();
  });
});

describe('Respaldo oficial NASA de tendencias 2005–2024 por celda MERRA-2', () => {
  it('conserva 18 series reales íntegras (mensual y diaria) de 9 celdas distintas', () => {
    expect(procedenciaTendencia).toHaveLength(18);
    expect(new Set(procedenciaTendencia.map((registro) => `${registro.tipo}:${registro.celda.fila}:${registro.celda.columna}`)).size).toBe(18);
    for (const registro of procedenciaTendencia) {
      const bytes = readFileSync(new URL(`../src/data/tendencia/${registro.archivo}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(registro.sha256);
      expect(registro.url).toContain(registro.tipo === 'mensual' ? 'temporal/monthly/point' : 'temporal/daily/point');
    }
  });
  it('identifica el respaldo como regional y conserva la ubicación del terreno', () => {
    const mensual = buscarRespaldoMensual(-0.934512, -78.615873); const diario = buscarRespaldoDiario(-0.934512, -78.615873);
    expect(mensual?.latitud).toBe(-0.934512); expect(diario?.longitud).toBe(-78.615873);
    expect(mensual?.advertencias[0]).toMatch(/misma celda MERRA-2.*no una medición del lote/);
    expect(diario?.valores.filter((valor) => valor !== null).length).toBeGreaterThan(7000);
    expect(buscarRespaldoMensual(-2.5, -78.6)).toBeNull(); expect(buscarRespaldoDiario(-0.75, -78.62)).toBeNull();
  });
  it('el servicio devuelve tendencias con estado respaldo cuando NASA cae, sin escribir caché', async () => {
    const cache = { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
    const cliente = { mensual: vi.fn().mockRejectedValue(new ErrorTendencia()), diario: vi.fn().mockRejectedValue(new ErrorTendencia()) };
    const datos = await crearServicioTendencia(() => cache, cliente, () => new Date('2026-11-10T00:00:00Z'))(-0.934512, -78.615873);
    expect(datos.fuentes.mensual.estado_datos).toBe('respaldo'); expect(datos.fuentes.diario.estado_datos).toBe('respaldo');
    expect(datos.anual).toHaveLength(20); expect(datos.anual.some((anio) => anio.dias_helada !== null)).toBe(true);
    expect(cache.upsert).not.toHaveBeenCalled();
  });
});
