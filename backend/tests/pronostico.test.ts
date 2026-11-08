import { describe, expect, it, vi } from 'vitest';
import { crearServicioPronostico, validarPronosticoVigente, calcularVigenciaPronostico, VIGENCIA_PRONOSTICO_MS } from '../src/services/pronostico.js';
import { ErrorPronostico } from '../src/services/openMeteo.js';
import { crearBasePronostico } from './fixtures/pronosticoPruebas.js';

const fecha = '2030-01-01T12:00:00.000Z';
function preparar(datos: unknown = null, actualizadoEn: Date | null = new Date(fecha)) { return { findUnique: vi.fn().mockResolvedValue(datos ? { datos, actualizadoEn } : null), upsert: vi.fn().mockResolvedValue({}) }; }
describe('Caché independiente de pronóstico', () => {
  it('reutiliza caché vigente y deduplica peticiones simultáneas', async () => {
    const cache = preparar(crearBasePronostico()); const proveedor = vi.fn();
    const servicio = crearServicioPronostico(() => cache, proveedor, () => new Date('2030-01-01T12:15:00Z'), 2);
    const resultados = await Promise.all([servicio(-0.93, -78.62), servicio(-0.93, -78.62)]);
    expect(resultados[0]?.estado_datos).toBe('cache'); expect(resultados[0]?.alertas).toHaveLength(3); expect(resultados[0]?.advertencias).toHaveLength(1);
    expect(proveedor).not.toHaveBeenCalled(); expect(cache.findUnique).toHaveBeenCalledTimes(1);
  });
  it('persiste una consulta nueva una sola vez y calcula el umbral fuera del JSON compartido', async () => {
    const cache = preparar(); const proveedor = vi.fn().mockResolvedValue(crearBasePronostico());
    const servicio = crearServicioPronostico(() => cache, proveedor, () => new Date(fecha), 0);
    const [resultado] = await Promise.all([servicio(-0.93, -78.62), servicio(-0.93, -78.62)]);
    expect(resultado?.estado_datos).toBe('open_meteo'); expect(resultado?.alertas).toHaveLength(1);
    expect(proveedor).toHaveBeenCalledTimes(1); expect(cache.upsert).toHaveBeenCalledTimes(1);
    expect(cache.upsert.mock.calls[0]?.[0]).toMatchObject({ create: { actualizadoEn: new Date(fecha), clave: 'open_meteo_forecast_v1_-0.93_-78.62' } });
  });
  it('vence a los 30 minutos y nunca devuelve dato vencido ante fallo externo', async () => {
    const base = crearBasePronostico(); expect(calcularVigenciaPronostico(base)).toBe(Date.parse(fecha) + VIGENCIA_PRONOSTICO_MS);
    const ahora = new Date('2030-01-01T12:30:00Z'); expect(validarPronosticoVigente(base, -0.93, -78.62, ahora)).toBeNull();
    const cache = preparar(base); const proveedor = vi.fn().mockRejectedValue(new ErrorPronostico());
    const servicio = crearServicioPronostico(() => cache, proveedor, () => ahora, 2);
    await expect(servicio(-0.93, -78.62)).rejects.toThrow(); await expect(servicio(-0.93, -78.62)).rejects.toThrow();
    expect(proveedor).toHaveBeenCalledTimes(1); expect(cache.upsert).not.toHaveBeenCalled();
  });
  it('refresca tras vencimiento y al llegar la medianoche de Ecuador aunque no pasen 30 minutos', async () => {
    const anterior = crearBasePronostico('2030-01-02T04:50:00.000Z'); const nueva = crearBasePronostico('2030-01-02T05:00:00.000Z');
    expect(calcularVigenciaPronostico(anterior)).toBe(Date.parse('2030-01-02T05:00:00Z'));
    const cache = preparar(anterior, new Date(anterior.consultado_en)); const proveedor = vi.fn().mockResolvedValue(nueva);
    const resultado = await crearServicioPronostico(() => cache, proveedor, () => new Date(nueva.consultado_en), 2)(-0.93, -78.62);
    expect(resultado.dias[0]?.fecha).toBe('2030-01-02'); expect(resultado.estado_datos).toBe('open_meteo');
  });
  it('rechaza caché corrupta, futura, de otro punto o con timestamp SQL alterado', async () => {
    expect(validarPronosticoVigente({}, -0.93, -78.62, new Date(fecha))).toBeNull();
    expect(validarPronosticoVigente({ ...crearBasePronostico(), consultado_en: 'invalida' }, -0.93, -78.62, new Date(fecha))).toBeNull();
    expect(validarPronosticoVigente(crearBasePronostico(), -1, -78.62, new Date(fecha))).toBeNull();
    expect(validarPronosticoVigente(crearBasePronostico(), -0.93, -78.62, new Date('2030-01-01T11:59:59Z'))).toBeNull();
    const cache = preparar(crearBasePronostico(), new Date('2030-01-01T11:00:00Z')); const proveedor = vi.fn().mockResolvedValue(crearBasePronostico());
    await crearServicioPronostico(() => cache, proveedor, () => new Date(fecha), 2)(-0.93, -78.62); expect(proveedor).toHaveBeenCalledOnce();
  });
  it('no oculta errores de PostgreSQL ni persiste respuestas inválidas de proveedor', async () => {
    const cache = preparar(); const proveedor = vi.fn().mockResolvedValue({});
    await expect(crearServicioPronostico(() => cache, proveedor)(-0.93, -78.62)).rejects.toThrow(); expect(cache.upsert).not.toHaveBeenCalled();
    cache.findUnique.mockRejectedValue(new Error('Fallo SQL de prueba'));
    await expect(crearServicioPronostico(() => cache, proveedor)(-0.93, -78.62)).rejects.toThrow('Fallo SQL');
  });
});
