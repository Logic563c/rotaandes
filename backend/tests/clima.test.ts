import { describe, expect, it, vi } from 'vitest';
import { crearServicioClima, validarBaseClima, VIGENCIA_CLIMA_MS } from '../src/services/clima.js';
import { ErrorClima } from '../src/services/nasaPower.js';
import { crearBasePrueba } from './fixtures/nasaPruebas.js';

const ahora = new Date('2030-01-02T00:00:00.000Z');
const base = () => crearBasePrueba('2030-01-01T00:00:00.000Z');
function preparar(datos: unknown = null, fecha: Date | null = new Date('2030-01-01T00:00:00Z')) {
  return { findUnique: vi.fn().mockResolvedValue(datos === null ? null : { clave: 'prueba', datos, actualizadoEn: fecha }), upsert: vi.fn().mockResolvedValue({}) };
}
describe('Caché y disponibilidad de climatología', () => {
  it('reutiliza caché válida sin NASA y calcula el riesgo con la altitud de cada terreno', async () => {
    const cache = preparar(base()); const nasa = vi.fn().mockResolvedValue(base());
    const servicio = crearServicioClima(() => cache, nasa, () => null, () => ahora);
    const [bajo, alto] = await Promise.all([servicio(-0.93, -78.62, 3000), servicio(-0.93, -78.62, 3500)]);
    expect(nasa).not.toHaveBeenCalled(); expect(cache.findUnique).toHaveBeenCalledTimes(1);
    expect(bajo.estado_datos).toBe('cache'); expect(bajo.mensual[0]?.riesgo_helada).toBe('medio'); expect(alto.mensual[0]?.riesgo_helada).toBe('alto');
  });
  it('deduplica consulta nueva, persiste JSON y fecha original', async () => {
    const cache = preparar(); const nasa = vi.fn().mockResolvedValue(base());
    const servicio = crearServicioClima(() => cache, nasa, () => null, () => ahora);
    const resultados = await Promise.all([servicio(-0.93, -78.62, null), servicio(-0.93, -78.62, 0)]);
    expect(nasa).toHaveBeenCalledTimes(1); expect(cache.upsert).toHaveBeenCalledTimes(1); expect(resultados[0]?.estado_datos).toBe('nasa');
    expect(resultados[0]?.actualizado_en).toBe('2030-01-01T00:00:00.000Z');
  });
  it('refresca una caché vencida y permite el mismo resultado anterior ante caída', async () => {
    const antigua = crearBasePrueba('2029-11-01T00:00:00.000Z');
    const cache = preparar(antigua, new Date(antigua.consultado_en)); const nasa = vi.fn().mockRejectedValue(new ErrorClima());
    const servicio = crearServicioClima(() => cache, nasa, () => null, () => ahora);
    const resultado = await servicio(-0.93, -78.62, 3000);
    expect(resultado.estado_datos).toBe('desactualizado'); expect(resultado.desactualizado).toBe(true); expect(resultado.actualizado_en).toBe(antigua.consultado_en);
    await servicio(-0.93, -78.62, 3000); expect(nasa).toHaveBeenCalledTimes(1); expect(cache.upsert).not.toHaveBeenCalled();
  });
  it('usa respaldo exacto identificado y nunca uno de otra localización', async () => {
    const cache = preparar(); const nasa = vi.fn().mockRejectedValue(new ErrorClima());
    const servicio = crearServicioClima(() => cache, nasa, (latitud) => latitud === -0.93 ? base() : null, () => ahora);
    expect((await servicio(-0.93, -78.62, null)).estado_datos).toBe('respaldo');
    await expect(servicio(-0.94, -78.62, null)).rejects.toThrow('No hay climatología fiable');
  });
  it('descarta caché corrupta, futura, unidades erróneas y timestamp SQL diferente', async () => {
    expect(validarBaseClima({}, -0.93, -78.62, ahora.getTime())).toBeNull();
    expect(validarBaseClima(base(), -1, -78.62, ahora.getTime())).toBeNull();
    expect(validarBaseClima(crearBasePrueba('2031-01-01T00:00:00Z'), -0.93, -78.62, ahora.getTime())).toBeNull();
    const incorrecta = base(); incorrecta.parametros.T2M.unidad = 'F';
    expect(validarBaseClima(incorrecta, -0.93, -78.62, ahora.getTime())).toBeNull();
    const cache = preparar(base(), ahora); const nasa = vi.fn().mockResolvedValue(base());
    await crearServicioClima(() => cache, nasa, () => null, () => ahora)(-0.93, -78.62, null);
    expect(nasa).toHaveBeenCalledTimes(1);
  });
  it('vence al cumplir exactamente 30 días y no encubre fallos internos de base', async () => {
    const antigua = crearBasePrueba(new Date(ahora.getTime() - VIGENCIA_CLIMA_MS).toISOString());
    const cache = preparar(antigua, new Date(antigua.consultado_en)); const nasa = vi.fn().mockResolvedValue(base());
    expect((await crearServicioClima(() => cache, nasa, () => null, () => ahora)(-0.93, -78.62, 1)).estado_datos).toBe('nasa');
    cache.findUnique.mockRejectedValueOnce(new Error('Fallo SQL de prueba'));
    await expect(crearServicioClima(() => cache, nasa)(-0.93, -78.62, 1)).rejects.toThrow();
  });
});
