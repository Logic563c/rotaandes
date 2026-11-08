import { describe, expect, it, vi } from 'vitest';
import { crearClientePronostico, obtenerFechaEcuador, generarAlertas, obtenerUmbralHelada, obtenerUrlPronostico, procesarPronostico } from '../src/services/openMeteo.js';
import { crearBasePronostico, crearRespuestaPronostico } from './fixtures/pronosticoPruebas.js';

const fecha = '2030-01-01T12:00:00.000Z';
describe('Open-Meteo: siete días, fechas civiles y alertas preventivas', () => {
  it('valida unidades, siete días y coordenadas de cuadrícula distintas de las solicitadas', () => {
    const base = crearBasePronostico(); expect(base.dias).toHaveLength(7);
    expect(base.dias[0]).toEqual({ fecha: '2030-01-01', t_max: 18, t_min: 1.5, precipitacion_mm: 0 });
    expect(base.cuadricula).not.toEqual(base.coordenadas); expect(base.dias[3]?.t_min).toBeNull();
    const url = obtenerUrlPronostico(-0.93, -78.62);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toEqual({ latitude: '-0.93', longitude: '-78.62', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', timezone: 'America/Guayaquil', forecast_days: '7' });
  });
  it('alerta con mínima <=2, sin redondear, sin altitud y sin evaluar valores nulos', () => {
    const dias = crearBasePronostico().dias; const alertas = generarAlertas(dias, 2);
    expect(alertas.map((alerta) => alerta.fecha)).toEqual(['2030-01-01', '2030-01-02', '2030-01-06']);
    expect(alertas[0]).toMatchObject({ tipo: 'helada' }); expect(alertas[0]?.mensaje).toContain('martes'); expect(alertas[0]?.mensaje).toContain('1,5 °C');
    expect(generarAlertas(dias, 0).map((alerta) => alerta.fecha)).toEqual(['2030-01-06']);
    expect(generarAlertas(dias.map((dia) => ({ ...dia, t_min: 5 })), 2)).toEqual([]);
  });
  it.each([['2030-01-02T04:59:59Z', '2030-01-01'], ['2030-01-02T05:00:00Z', '2030-01-02'], ['2032-03-01T04:00:00Z', '2032-02-29']])('respeta medianoche UTC-5 (%s)', (instante, dia) => { expect(obtenerFechaEcuador(new Date(instante))).toBe(dia); });
  it('acepta siete fechas consecutivas al cambiar mes/año y en febrero bisiesto', () => {
    expect(crearBasePronostico('2032-02-27T12:00:00.000Z').dias[2]?.fecha).toBe('2032-02-29');
    expect(crearBasePronostico('2030-12-29T12:00:00.000Z').dias[6]?.fecha).toBe('2031-01-04');
  });
  it.each(['', ' ', 'abc', 'NaN', 'Infinity', '2e0', '2,5', '11', '-11', '2.001'])('rechaza configuración inválida %s', (valor) => { expect(() => obtenerUmbralHelada({ UMBRAL_HELADA_C: valor })).toThrow('UMBRAL_HELADA_C'); });
  it('permite configurar el umbral y conserva 2 por defecto', () => { expect(obtenerUmbralHelada({})).toBe(2); expect(obtenerUmbralHelada({ UMBRAL_HELADA_C: '-1.25' })).toBe(-1.25); expect(() => generarAlertas([], NaN)).toThrow(); });
  it.each([Number.NaN, Infinity, -999, -101, 71, '1.5'])('rechaza mínima inválida (%#) sin convertirla en cero', (valor) => {
    const respuesta = crearRespuestaPronostico(); const entrada = { ...respuesta, daily: { ...respuesta.daily, temperature_2m_min: [valor, ...respuesta.daily.temperature_2m_min.slice(1)] } };
    expect(() => procesarPronostico(entrada, -0.93, -78.62, fecha)).toThrow();
  });
  it('rechaza estructuras vacías, arreglos desiguales, fechas inválidas/duplicadas/vencidas y zonas equivocadas', () => {
    const original = crearRespuestaPronostico();
    const variantes: unknown[] = [{}, null, { ...original, daily: null }, { ...original, timezone: 'UTC' }, { ...original, utc_offset_seconds: 0 },
      { ...original, daily_units: { ...original.daily_units, temperature_2m_min: '°F' } }, { ...original, daily_units: { ...original.daily_units, precipitation_sum: 'inch' } },
      { ...original, daily: { ...original.daily, temperature_2m_max: [18] } }, { ...original, latitude: 10 }];
    for (const entrada of variantes) expect(() => procesarPronostico(entrada, -0.93, -78.62, fecha)).toThrow();
    for (const dia of ['2030-02-30', '2030-01-01', '2029-12-31']) {
      const respuesta = crearRespuestaPronostico(); respuesta.daily.time[1] = dia;
      expect(() => procesarPronostico(respuesta, -0.93, -78.62, fecha)).toThrow();
    }
    expect(() => procesarPronostico(original, -0.93, -78.62, '2030-01-02T12:00:00Z')).toThrow();
  });
  it('rechaza precipitación negativa, temperaturas incoherentes y todos los datos nulos', () => {
    const respuesta = crearRespuestaPronostico(); respuesta.daily.precipitation_sum[0] = -1;
    expect(() => procesarPronostico(respuesta, -0.93, -78.62, fecha)).toThrow();
    respuesta.daily.precipitation_sum[0] = 0; respuesta.daily.temperature_2m_min[0] = 30;
    expect(() => procesarPronostico(respuesta, -0.93, -78.62, fecha)).toThrow();
    respuesta.daily.temperature_2m_min.fill(null); respuesta.daily.temperature_2m_max.fill(null); respuesta.daily.precipitation_sum.fill(null);
    expect(() => procesarPronostico(respuesta, -0.93, -78.62, fecha)).toThrow();
  });
  it('controla HTTP, JSON, red, cuerpo ausente y límite de tamaño', async () => {
    const respuestas = [new Response('{}', { status: 400 }), new Response('{}', { status: 429 }), new Response('{}', { status: 500 }), new Response('html'), new Response(null), new Response('x'.repeat(65537))];
    for (const respuesta of respuestas) await expect(crearClientePronostico(async () => respuesta)(-0.93, -78.62)).rejects.toThrow('No hay un pronóstico');
    await expect(crearClientePronostico(async () => { throw new TypeError('red privada'); })(-0.93, -78.62)).rejects.toThrow('No hay un pronóstico');
    expect(() => obtenerUrlPronostico(91, NaN)).toThrow();
  });
  it('aborta realmente una solicitud que no responde sin depender de Internet', async () => {
    const solicitar: typeof fetch = async (_url, opciones) => new Promise((_resolver, rechazar) => { opciones?.signal?.addEventListener('abort', () => rechazar(new DOMException('Tiempo', 'AbortError')), { once: true }); });
    await expect(crearClientePronostico(solicitar)(-0.93, -78.62)).rejects.toThrow();
  }, 8000);
  it('limita concurrencia y solicitudes externas y fija redirecciones rechazadas', async () => {
    const pendiente = Promise.withResolvers<Response>(); const solicitar = vi.fn<typeof fetch>().mockImplementation(async () => (await pendiente.promise).clone());
    const cliente = crearClientePronostico(solicitar, () => new Date(fecha));
    const primera = cliente(-0.93, -78.62); const segunda = cliente(-0.93, -78.62);
    await expect(cliente(-0.93, -78.62)).rejects.toThrow();
    pendiente.resolve(new Response(JSON.stringify(crearRespuestaPronostico())));
    await Promise.all([primera, segunda]);
    expect(solicitar).toHaveBeenCalledTimes(2); expect(solicitar).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: 'error' }));
    const secuencial = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(crearRespuestaPronostico())));
    const limitado = crearClientePronostico(secuencial, () => new Date(fecha));
    for (let indice = 0; indice < 20; indice++) await limitado(-0.93, -78.62);
    await expect(limitado(-0.93, -78.62)).rejects.toThrow(); expect(secuencial).toHaveBeenCalledTimes(20);
  });
});
