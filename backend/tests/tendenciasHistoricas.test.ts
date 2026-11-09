import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import procedencia from './fixtures/tendencias/procedencia.json' with { type: 'json' };
import { respuestaMensualPrueba, respuestaDiariaPrueba, cambiarDatoHistorico, crearMensualPrueba, crearDiarioPrueba } from './fixtures/tendenciasPruebas.js';
import { procesarMensualHistorico, procesarDiarioHistorico, FECHAS_HISTORICAS, diasDelMes, crearClienteHistoricoNasa, ErrorTendencia, obtenerUrlHistorico } from '../src/services/nasaHistorico.js';
import { construirAnual, calcularTendencia, describirCoberturaDiaria } from '../src/services/analisisTendencia.js';

afterEach(() => { vi.restoreAllMocks(); });
describe('NASA histórico: unidades, cobertura y estadística sin inventar datos', () => {
  it('conserva procedencia y hashes de las dos respuestas reales, sin Internet en tests', () => {
    for (const fuente of procedencia) expect(createHash('sha256').update(readFileSync(new URL(`./fixtures/tendencias/${fuente.archivo}`, import.meta.url))).digest('hex')).toBe(fuente.sha256);
  });
  it('verifica 240 meses y 7305 días reales, extremos mensuales frente a diarios independientes', () => {
    const meses = crearMensualPrueba(); const dias = crearDiarioPrueba(); const anual = construirAnual(meses, dias);
    expect(anual).toHaveLength(20); expect(FECHAS_HISTORICAS).toHaveLength(7305);
    expect(anual.every((a) => a.lluvia_mm !== null && a.t_min !== null && a.dias_helada === 0)).toBe(true);
    for (const fila of anual) {
      const indices = FECHAS_HISTORICAS.flatMap((fecha, i) => fecha.startsWith(String(fila.anio)) ? [i] : []);
      const valores = indices.map((i) => dias.valores[i]).filter((v): v is number => v != null);
      expect(fila.t_min).toBe(Math.min(...valores)); expect(valores.length).toBe(fila.cobertura.dias_esperados);
    }
    expect(describirCoberturaDiaria(dias)).toEqual({ inicio: '2005-01-01', fin: '2024-12-31', dias_validos: 7305, dias_esperados: 7305 });
  });
  it('lluvia = mm/día × días reales, ignora mes 13 y respeta años bisiestos', () => {
    const base = crearMensualPrueba(); base.parametros.PRECTOTCORR.valores.fill(2);
    const anual = construirAnual(base, null);
    expect(anual.find((a) => a.anio === 2005)?.lluvia_mm).toBe(730); expect(anual.find((a) => a.anio === 2008)?.lluvia_mm).toBe(732);
    expect(diasDelMes(2000, 2)).toBe(29); expect(diasDelMes(1900, 2)).toBe(28); expect(() => diasDelMes(2005, 13)).toThrow();
  });
  it.each([null, -999, '3.2', NaN, Infinity, -1])('un mes de lluvia inválido %s anula solo su total anual y no se sustituye por cero', (valor) => {
    const respuesta = respuestaMensualPrueba(); cambiarDatoHistorico(respuesta, 'PRECTOTCORR', '200502', valor);
    const fila = construirAnual(procesarMensualHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z'), crearDiarioPrueba())[0];
    expect(fila?.lluvia_mm).toBeNull(); expect(fila?.cobertura.meses_lluvia).toBe(11); expect(fila?.t_min).not.toBeNull();
  });
  it('conserva cero auténtico, no convierte ausencia de GWETTOP en humedad cero', () => {
    const respuesta = respuestaMensualPrueba(); const lluvia = respuesta.properties.parameter.PRECTOTCORR; if (!lluvia) throw new Error('Fixture');
    for (const fecha of Object.keys(lluvia)) lluvia[fecha] = 0;
    delete respuesta.properties.parameter.GWETTOP;
    const anual = construirAnual(procesarMensualHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z'), null);
    expect(anual.every((a) => a.lluvia_mm === 0 && a.humedad_suelo === null && a.dias_helada === null)).toBe(true);
  });
  it('anula unidades incompatibles sin asumir totales mm y rechaza respuesta sin variables principales', () => {
    const respuesta = respuestaMensualPrueba(); const meta = respuesta.parameters.PRECTOTCORR; if (!meta) throw new Error('Fixture'); meta.units = 'mm';
    const base = procesarMensualHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z'); expect(base.parametros.PRECTOTCORR.valores.every((v) => v === null)).toBe(true);
    delete respuesta.properties.parameter.T2M_MIN; expect(() => procesarMensualHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z')).toThrow(ErrorTendencia);
  });
  it('T2M_MIN anual usa el menor extremo mensual y no la media de doce mínimos', () => {
    const base = crearMensualPrueba(); base.parametros.T2M_MIN.valores.fill(8); base.parametros.T2M_MIN.valores[1] = -1;
    expect(construirAnual(base, null)[0]?.t_min).toBe(-1);
    base.parametros.T2M_MIN.valores[1] = null; expect(construirAnual(base, null)[0]?.t_min).toBeNull();
  });
  it('cuenta ≤0 °C (incluye cero), excluye +0.01 y no usa umbral preventivo de 2 °C', () => {
    const base = crearDiarioPrueba(); base.valores.fill(2); base.valores[0] = 0; base.valores[1] = -0.01; base.valores[2] = 0.01;
    expect(construirAnual(null, base)[0]?.dias_helada).toBe(2);
    base.valores[3] = null; expect(construirAnual(null, base)[0]?.dias_helada).toBeNull();
  });
  it('año bisiesto sin 29 de febrero no publica un recuento parcial', () => {
    const respuesta = respuestaDiariaPrueba(); cambiarDatoHistorico(respuesta, 'T2M_MIN', '20080229', -999);
    const fila = construirAnual(null, procesarDiarioHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z')).find((a) => a.anio === 2008);
    expect(fila?.dias_helada).toBeNull(); expect(fila?.cobertura.dias_temperatura).toBe(365); expect(fila?.cobertura.dias_esperados).toBe(366);
  });
  it('reconoce periodos parciales y fechas inválidas, sin reconstruir días ausentes', () => {
    const respuesta = respuestaDiariaPrueba(); respuesta.header.start = '20100101'; cambiarDatoHistorico(respuesta, 'T2M_MIN', '20050230', -5);
    const base = procesarDiarioHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z');
    expect(describirCoberturaDiaria(base).inicio).toBe('2010-01-01'); expect(construirAnual(null, base)[0]?.dias_helada).toBeNull();
    respuesta.header.start = '20100230'; expect(() => procesarDiarioHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z')).toThrow();
  });
  it('sin diario o sin parámetro válido no inventa días de helada', () => {
    const respuesta = respuestaDiariaPrueba(); delete respuesta.properties.parameter.T2M_MIN;
    expect(() => procesarDiarioHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z')).toThrow();
    expect(construirAnual(crearMensualPrueba(), null).every((a) => a.dias_helada === null)).toBe(true);
  });
  it('acepta únicamente la precisión observada y rechaza otra localización o estándar temporal', () => {
    expect(procesarMensualHistorico(respuestaMensualPrueba(), -0.93002, -78.620248, '2030-01-01T00:00:00Z').advertencias.join()).toContain('redondeadas');
    expect(() => procesarMensualHistorico(respuestaMensualPrueba(), -0.95, -78.62, '2030-01-01T00:00:00Z')).toThrow();
    const respuesta = respuestaDiariaPrueba(); respuesta.header.time_standard = 'UTC'; expect(() => procesarDiarioHistorico(respuesta, -0.93, -78.62, '2030-01-01T00:00:00Z')).toThrow();
    expect(() => obtenerUrlHistorico('diario', NaN, -78.62)).toThrow();
  });
  it('OLS calcula pendiente por año/década y extremos; no equipara diferencia con ajuste', () => {
    const anual: ReturnType<typeof construirAnual> = construirAnual(crearMensualPrueba(), null).map((a, i) => ({ ...a, lluvia_mm: i * 2 + 100 }));
    const t = calcularTendencia(anual, 'lluvia_mm'); expect(t.pendiente_anual).toBe(2); expect(t.pendiente_decada).toBe(20); expect(t.diferencia_2005_2024).toBe(38); expect(t.direccion).toBe('ascendente');
    anual[19] = { ...anual[19], anio: 2024, lluvia_mm: null, t_min: null, humedad_suelo: null, dias_helada: null, cobertura: { meses_lluvia: 0, meses_temperatura: 0, meses_humedad: 0, dias_temperatura: 0, dias_esperados: 366 } };
    expect(calcularTendencia(anual, 'lluvia_mm').diferencia_2005_2024).toBeNull();
  });
  it('requiere 15 años completos, excluye nulos, identifica pendiente cero y descendente', () => {
    const anual = construirAnual(null, crearDiarioPrueba()); expect(calcularTendencia(anual, 'dias_helada').direccion).toBe('sin_cambio');
    expect(calcularTendencia(anual.map((a, i) => ({ ...a, lluvia_mm: 100 - i })), 'lluvia_mm').direccion).toBe('descendente');
    const t = calcularTendencia(anual.map((a, i) => ({ ...a, lluvia_mm: i < 14 ? i : null })), 'lluvia_mm'); expect(t.n).toBe(14); expect(t.pendiente_anual).toBeNull(); expect(t.anios_excluidos).toHaveLength(6);
  });
  it('es determinista y no modifica datos base', () => {
    const mensual = crearMensualPrueba(); const diario = crearDiarioPrueba(); const copia = structuredClone({ mensual, diario });
    expect(construirAnual(mensual, diario)).toEqual(construirAnual(mensual, diario)); expect({ mensual, diario }).toEqual(copia);
  });
  it('redondea la pendiente por década después de escalar el ajuste, sin acumular redondeos', () => {
    const anual = construirAnual(crearMensualPrueba(), null).map((a, i) => ({ ...a, lluvia_mm: 100 + i / 3 }));
    const resumen = calcularTendencia(anual, 'lluvia_mm'); expect(resumen.pendiente_anual).toBe(0.333333); expect(resumen.pendiente_decada).toBe(3.333333);
  });
});

describe('Cliente NASA histórico: errores y presupuesto acotado', () => {
  it('usa URLs oficiales y valida ambas respuestas con unidades originales', async () => {
    const solicitar = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(respuestaMensualPrueba())).mockResolvedValueOnce(Response.json(respuestaDiariaPrueba()));
    const cliente = crearClienteHistoricoNasa(solicitar); expect((await cliente.mensual(-0.93, -78.62)).parametros.PRECTOTCORR.unidad).toBe('mm/day'); expect((await cliente.diario(-0.93, -78.62)).valores).toHaveLength(7305);
    expect(String(solicitar.mock.calls[1]?.[0])).toContain('time-standard=LST');
  });
  it.each([400, 422, 429, 500])('HTTP %s produce un error controlado', async (estado) => {
    await expect(crearClienteHistoricoNasa(async () => new Response('error', { status: estado })).mensual(-0.93, -78.62)).rejects.toBeInstanceOf(ErrorTendencia);
  });
  it('rechaza MIME, JSON, red y tamaño excesivo', async () => {
    for (const respuesta of [new Response('{}'), new Response('{mal', { headers: { 'content-type': 'application/json' } }), new Response('x'.repeat(1048577), { headers: { 'content-type': 'application/json' } })]) await expect(crearClienteHistoricoNasa(async () => respuesta).mensual(-0.93, -78.62)).rejects.toBeInstanceOf(ErrorTendencia);
    await expect(crearClienteHistoricoNasa(async () => { throw new TypeError('red'); }).diario(-0.93, -78.62)).rejects.toBeInstanceOf(ErrorTendencia);
  });
  it('el presupuesto por minuto evita solicitudes externas ilimitadas', async () => {
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(respuestaMensualPrueba()));
    const cliente = crearClienteHistoricoNasa(solicitar, () => new Date('2030-01-01T00:00:00Z'));
    for (let i = 0; i < 12; i++) await cliente.mensual(-0.93, -78.62);
    await expect(cliente.mensual(-0.93, -78.62)).rejects.toBeInstanceOf(ErrorTendencia); expect(solicitar).toHaveBeenCalledTimes(12);
  });
  it('propaga la señal de timeout de 15 segundos y limita dos consultas simultáneas', async () => {
    const control = new AbortController(); const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(control.signal);
    const solicitar: typeof fetch = async (_url, opciones) => new Promise<Response>((_resolver, rechazar) => { opciones?.signal?.addEventListener('abort', () => rechazar(new Error('timeout')), { once: true }); });
    const cliente = crearClienteHistoricoNasa(solicitar); const primera = cliente.mensual(-0.93, -78.62); const segunda = cliente.diario(-0.93, -78.62);
    const comprobar = Promise.all([expect(primera).rejects.toBeInstanceOf(ErrorTendencia), expect(segunda).rejects.toBeInstanceOf(ErrorTendencia)]);
    await expect(cliente.mensual(-1, -79)).rejects.toBeInstanceOf(ErrorTendencia);
    expect(timeout).toHaveBeenCalledWith(15000); control.abort(); await comprobar; timeout.mockRestore();
  }, 20000);
});
