import { describe, expect, it, vi } from 'vitest';
import { crearServicioTendencia, claveTendencia, validarMensualGuardado, validarDiarioGuardado, VIGENCIA_TENDENCIA_MS } from '../src/services/tendencia.js';
import { ErrorTendencia } from '../src/services/nasaHistorico.js';
import { crearMensualPrueba, crearDiarioPrueba } from './fixtures/tendenciasPruebas.js';
// Estas pruebas ejercitan la ausencia de respaldo; el respaldo por celda se prueba en recuperacionNasa.test.ts.
const SIN_RESPALDO = { mensual: () => null, diario: () => null };

const fecha = '2030-01-01T00:00:00.000Z'; const ahora = new Date('2030-01-02T00:00:00Z');
function preparar(guardados = false, consulta = fecha) {
  const mensual = crearMensualPrueba(consulta); const diario = crearDiarioPrueba(consulta);
  const cache = { findUnique: vi.fn().mockImplementation(async ({ where }: { where: { clave: string } }) => guardados ? { datos: where.clave.includes('_mensual_') ? mensual : diario, actualizadoEn: new Date(consulta) } : null), upsert: vi.fn().mockResolvedValue({}) };
  const cliente = { mensual: vi.fn().mockResolvedValue(mensual), diario: vi.fn().mockResolvedValue(diario) };
  return { cache, cliente, servicio: crearServicioTendencia(() => cache, cliente, () => ahora, SIN_RESPALDO) };
}
describe('Persistencia y disponibilidad histórica', () => {
  it('reutiliza dos cachés válidas sin proveedor y conserva los veinte años', async () => {
    const { servicio, cliente, cache } = preparar(true); const resultado = await servicio(-0.93, -78.62);
    expect(resultado.anual).toHaveLength(20); expect(resultado.fuentes.mensual.estado_datos).toBe('cache'); expect(resultado.fuentes.diario.estado_datos).toBe('cache'); expect(cliente.mensual).not.toHaveBeenCalled(); expect(cliente.diario).not.toHaveBeenCalled(); expect(cache.upsert).not.toHaveBeenCalled();
  });
  it('deduplica llamadas simultáneas y persiste únicamente las series normalizadas', async () => {
    const { servicio, cliente, cache } = preparar(); const [a, b] = await Promise.all([servicio(-0.93, -78.62), servicio(-0.93, -78.62)]);
    expect(a).toEqual(b); expect(cliente.mensual).toHaveBeenCalledOnce(); expect(cliente.diario).toHaveBeenCalledOnce(); expect(cache.upsert).toHaveBeenCalledTimes(2); expect(a.fuentes.mensual.estado_datos).toBe('nasa');
  });
  it('vence a los treinta días exactos, conserva procedencia anterior y evita reintentos masivos', async () => {
    const anterior = new Date(ahora.getTime() - VIGENCIA_TENDENCIA_MS).toISOString(); const { servicio, cliente, cache } = preparar(true, anterior);
    cliente.mensual.mockRejectedValue(new ErrorTendencia()); cliente.diario.mockRejectedValue(new ErrorTendencia());
    const datos = await servicio(-0.93, -78.62); expect(datos.fuentes.mensual).toMatchObject({ estado_datos: 'desactualizado', desactualizado: true, actualizado_en: anterior });
    await servicio(-0.93, -78.62); expect(cliente.mensual).toHaveBeenCalledOnce(); expect(cache.upsert).not.toHaveBeenCalled();
  });
  it('actualiza las series vencidas cuando el proveedor vuelve a funcionar', async () => {
    const { cache } = preparar(true, '2029-01-01T00:00:00Z'); const { cliente } = preparar();
    const datos = await crearServicioTendencia(() => cache, cliente, () => ahora, SIN_RESPALDO)(-0.93, -78.62); expect(datos.fuentes.diario.estado_datos).toBe('nasa'); expect(cache.upsert).toHaveBeenCalledTimes(2);
  });
  it('si solo falla el diario no fabrica heladas ni elimina la lluvia disponible', async () => {
    const { servicio, cliente } = preparar(); cliente.diario.mockRejectedValue(new ErrorTendencia()); const datos = await servicio(-0.93, -78.62);
    expect(datos.anual.every((a) => a.dias_helada === null && a.lluvia_mm !== null)).toBe(true); expect(datos.cobertura_diaria.dias_validos).toBe(0); expect(datos.fuentes.diario.estado_datos).toBe('no_disponible');
  });
  it('si solo falla el mensual devuelve los conteos diarios identificando el resto ausente', async () => {
    const { servicio, cliente } = preparar(); cliente.mensual.mockRejectedValue(new ErrorTendencia()); const datos = await servicio(-0.93, -78.62);
    expect(datos.anual.every((a) => a.lluvia_mm === null && a.t_min === null && a.dias_helada === 0)).toBe(true);
  });
  it('sin información fiable rechaza y libera pendientes incluso ante fallo síncrono', async () => {
    const { cache } = preparar(); const cliente = { mensual: vi.fn(() => { throw new ErrorTendencia(); }), diario: vi.fn(() => { throw new ErrorTendencia(); }) };
    const servicio = crearServicioTendencia(() => cache, cliente, () => ahora, SIN_RESPALDO);
    await expect(servicio(-0.93, -78.62)).rejects.toBeInstanceOf(ErrorTendencia); await expect(servicio(-0.93, -78.62)).rejects.toBeInstanceOf(ErrorTendencia); expect(cache.findUnique).toHaveBeenCalledTimes(4);
  });
  it('rechaza cachés corruptas, futuras, ajenas y con valores imposibles', () => {
    expect(validarMensualGuardado({}, -0.93, -78.62, +ahora)).toBeNull(); expect(validarDiarioGuardado(crearDiarioPrueba('2031-01-01T00:00:00Z'), -0.93, -78.62, +ahora)).toBeNull();
    expect(validarMensualGuardado(crearMensualPrueba(fecha), -1, -78.62, +ahora)).toBeNull();
    const mensual = crearMensualPrueba(fecha); mensual.parametros.GWETTOP.valores[0] = 2; expect(validarMensualGuardado(mensual, -0.93, -78.62, +ahora)).toBeNull();
    const diario = crearDiarioPrueba(fecha); diario.valores[0] = -999; expect(validarDiarioGuardado(diario, -0.93, -78.62, +ahora)).toBeNull();
    expect(claveTendencia('mensual', -0.93, -78.62)).not.toBe(claveTendencia('mensual', -0.930001, -78.62));
  });
  it('no encubre errores internos SQL como caída de NASA ni acepta fechas SQL incoherentes', async () => {
    const { cache, cliente } = preparar(true); cache.findUnique.mockRejectedValue(new Error('SQL interno de prueba'));
    await expect(crearServicioTendencia(() => cache, cliente, undefined, SIN_RESPALDO)(-0.93, -78.62)).rejects.toThrow('SQL interno');
    cache.findUnique.mockResolvedValue({ datos: crearMensualPrueba(fecha), actualizadoEn: ahora });
    const datos = await crearServicioTendencia(() => cache, cliente, () => ahora, SIN_RESPALDO)(-0.93, -78.62); expect(datos.fuentes.mensual.estado_datos).toBe('nasa');
  });
});
