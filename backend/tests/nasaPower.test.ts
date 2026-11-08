import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { calcularRiesgoHelada, construirMensual, crearClienteNasa, diasMediosMes, PARAMETROS_NASA, procesarRespuestaNasa } from '../src/services/nasaPower.js';
import { buscarRespaldoClima } from '../src/data/respaldosClima.js';
import procedencia from '../src/data/clima/procedencia.json' with { type: 'json' };
import { cambiarValor, crearBasePrueba, crearRespuestaPrueba } from './fixtures/nasaPruebas.js';

describe('NASA POWER: procesamiento científico y procedencia', () => {
  it('conserva las ocho unidades y procesa doce meses de una respuesta real archivada', () => {
    const base = crearBasePrueba(); const meses = construirMensual(base, 3000);
    expect(base.periodo).toEqual({ inicio: 2001, fin: 2025 });
    expect(meses.map((mes) => mes.mes)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(meses[0]).toMatchObject({ t_min: 3.97, t_med: 11.86, t_max: 21.03, lluvia_mm: 124, humedad_suelo: 0.68, riesgo_helada: 'medio' });
    expect(meses[1]?.lluvia_mm).toBe(140.92);
    expect(PARAMETROS_NASA.map((clave) => base.parametros[clave].unidad)).toEqual(['C', 'C', 'C', 'mm/day', '%', '1', '1', 'MJ/m^2/day']);
  });
  it('verifica integridad y coordenadas exactas de los cinco respaldos reales', () => {
    expect(procedencia).toHaveLength(5);
    for (const registro of procedencia) {
      const texto = readFileSync(new URL(`../src/data/clima/${registro.archivo}`, import.meta.url));
      expect(createHash('sha256').update(texto).digest('hex')).toBe(registro.sha256);
      expect(buscarRespaldoClima(registro.latitud, registro.longitud)?.consultado_en).toBe(registro.consultado_en);
    }
    expect(buscarRespaldoClima(-0.930001, -78.62)).toBeNull();
  });
  it.each([null, -999, '3.9', Number.NaN, Infinity, -110])('preserva como nulo un valor ausente/inválido (%#)', (valor) => {
    const datos = crearRespuestaPrueba(); cambiarValor(datos, 'T2M_MIN', 'JAN', valor);
    const mes = construirMensual(procesarRespuestaNasa(datos, -0.93, -78.62, '2030-01-01T00:00:00.000Z'), 3500)[0];
    expect(mes?.t_min).toBeNull(); expect(mes?.riesgo_helada).toBeNull();
  });
  it('admite cero real, convierte relleno declarado y no sustituye humedad superficial por raíces', () => {
    const datos = crearRespuestaPrueba(); datos.header.fill_value = -888;
    cambiarValor(datos, 'PRECTOTCORR', 'JAN', 0); cambiarValor(datos, 'GWETROOT', 'JAN', -888);
    const mes = construirMensual(procesarRespuestaNasa(datos, -0.93, -78.62, '2030-01-01T00:00:00.000Z'), null)[0];
    expect(mes?.lluvia_mm).toBe(0); expect(mes?.humedad_suelo).toBeNull();
  });
  it('maneja parámetro ausente, unidades incompatibles y temperaturas incoherentes sin inventar', () => {
    const datos = crearRespuestaPrueba(); delete datos.properties.parameter.GWETROOT;
    const metadato = datos.parameters.PRECTOTCORR; if (metadato) metadato.units = 'mm/hour';
    cambiarValor(datos, 'T2M_MIN', 'JAN', 40);
    const base = procesarRespuestaNasa(datos, -0.93, -78.62, '2030-01-01T00:00:00.000Z');
    expect(construirMensual(base, null)[0]).toMatchObject({ t_min: null, t_med: null, t_max: null, lluvia_mm: null, humedad_suelo: null, riesgo_helada: null });
    expect(base.advertencias.join(' ')).toContain('unidad');
  });
  it('rechaza datos de otra ubicación, sin periodo y totalmente vacíos', () => {
    const datos = crearRespuestaPrueba();
    expect(() => procesarRespuestaNasa(datos, 1, 2, '2030-01-01T00:00:00.000Z')).toThrow();
    datos.header.range = 'Periodo desconocido';
    expect(() => procesarRespuestaNasa(datos, -0.93, -78.62, '2030-01-01T00:00:00.000Z')).toThrow();
    const vacios = crearRespuestaPrueba(); vacios.properties.parameter = {};
    expect(() => procesarRespuestaNasa(vacios, -0.93, -78.62, '2030-01-01T00:00:00.000Z')).toThrow();
  });
  it.each([[2, 2001, 2025, 28.24], [2, 1900, 1900, 28], [2, 2000, 2000, 29], [4, 2001, 2025, 30], [1, 2001, 2025, 31]])('calcula duración mensual multianual (%#)', (mes, inicio, fin, dias) => { expect(diasMediosMes(mes, inicio, fin)).toBe(dias); });
  it.each([[2, 3399, 'alto'], [2.001, 3399, 'medio'], [5, 0, 'medio'], [5.001, 0, 'bajo'], [6, 3400, 'medio'], [3, 3400, 'alto'], [1, 5000, 'alto'], [null, 3500, null]])('clasifica riesgo antes de redondear y aplica altitud (%#)', (minima, altitud, riesgo) => { expect(calcularRiesgoHelada(minima, altitud)).toBe(riesgo); });
  it('verifica timeout, HTTP no exitoso, JSON inválido y tamaño limitado sin Internet', async () => {
    for (const status of [400, 422, 429, 500]) await expect(crearClienteNasa(async () => new Response('{}', { status }))(-0.93, -78.62)).rejects.toThrow();
    await expect(crearClienteNasa(async () => new Response('html'))(-0.93, -78.62)).rejects.toThrow();
    await expect(crearClienteNasa(async () => new Response('x'.repeat(262145)))(-0.93, -78.62)).rejects.toThrow();
    await expect(crearClienteNasa(async () => { throw new TypeError('red'); })(-0.93, -78.62)).rejects.toThrow();
  });
  it('interrumpe realmente una solicitud que no responde', async () => {
    const solicitar: typeof fetch = async (_url, opciones) => new Promise((_resolver, rechazar) => {
      opciones?.signal?.addEventListener('abort', () => rechazar(new DOMException('Tiempo', 'AbortError')), { once: true });
    });
    await expect(crearClienteNasa(solicitar)(-0.93, -78.62)).rejects.toThrow();
  }, 8000);
  it('construye solo la URL NASA permitida y valida respuesta real simulada', async () => {
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(crearRespuestaPrueba())));
    await crearClienteNasa(solicitar, () => new Date('2030-01-01T00:00:00Z'))(-0.93, -78.62);
    expect(solicitar).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: 'error' }));
    const url = solicitar.mock.calls[0]?.[0]; expect(String(url)).toContain('community=AG');
    expect(String(url)).toContain('temporal/climatology/point');
  });
});
