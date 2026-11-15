import type { PrismaClient } from '../generated/prisma/client.js';
import { buscarRespaldoClima } from '../data/respaldosClima.js';
import { construirMensual, crearClienteNasa, ErrorClima, esquemaClimatologiaBase, esClimatologiaCoherente } from './nasaPower.js';
import type { ClimatologiaBase } from './nasaPower.js';

export const VIGENCIA_CLIMA_MS = 30 * 86400000;
export type ObtenerCacheClima = () => Pick<PrismaClient['climaCache'], 'findUnique' | 'upsert'>;
export function claveClima(latitud: number, longitud: number): string { return `power_clim_v1_${latitud}_${longitud}`; }
type OrigenClima = 'nasa' | 'cache' | 'desactualizado' | 'respaldo';

export function validarBaseClima(datos: unknown, latitud: number, longitud: number, ahora: number): ClimatologiaBase | null {
  const resultado = esquemaClimatologiaBase.safeParse(datos);
  if (!resultado.success) return null;
  const base = resultado.data;
  if (base.latitud !== latitud || base.longitud !== longitud || Date.parse(base.consultado_en) > ahora) return null;
  if (!esClimatologiaCoherente(base)) return null;
  return base;
}

export function crearServicioClima(obtenerCache: ObtenerCacheClima, consultar = crearClienteNasa(), buscarRespaldo = buscarRespaldoClima, reloj = () => new Date()) {
  const pendientes = new Map<string, Promise<{ base: ClimatologiaBase; origen: OrigenClima }>>();
  const reintentos = new Map<string, number>();
  async function resolver(latitud: number, longitud: number): Promise<{ base: ClimatologiaBase; origen: OrigenClima }> {
    const clave = claveClima(latitud, longitud); const ahora = reloj().getTime();
    const guardado = await obtenerCache().findUnique({ where: { clave } });
    const candidata = guardado ? validarBaseClima(guardado.datos, latitud, longitud, ahora) : null;
    const anterior = candidata && guardado?.actualizadoEn?.getTime() === Date.parse(candidata.consultado_en) ? candidata : null;
    // Ambas fechas deben coincidir: nunca rejuvenecer el dato cambiando solo el timestamp SQL.
    if (anterior && guardado?.actualizadoEn?.getTime() === Date.parse(anterior.consultado_en) && ahora - Date.parse(anterior.consultado_en) < VIGENCIA_CLIMA_MS) return { base: anterior, origen: 'cache' };
    try {
      if ((reintentos.get(clave) ?? 0) > ahora) throw new ErrorClima();
      const base = await consultar(latitud, longitud);
      if (!validarBaseClima(base, latitud, longitud, reloj().getTime())) throw new ErrorClima();
      await obtenerCache().upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(base.consultado_en) }, update: { datos: base, actualizadoEn: new Date(base.consultado_en) } });
      reintentos.delete(clave);
      return { base, origen: 'nasa' };
    } catch (error: unknown) {
      if (!(error instanceof ErrorClima)) throw error;
      if (reintentos.size >= 500) { const primera = reintentos.keys().next().value; if (primera !== undefined) reintentos.delete(primera); }
      reintentos.set(clave, reloj().getTime() + 60000);
      const respaldo = buscarRespaldo(latitud, longitud);
      if (anterior && (!respaldo || Date.parse(anterior.consultado_en) >= Date.parse(respaldo.consultado_en))) return { base: anterior, origen: 'desactualizado' };
      if (respaldo && validarBaseClima(respaldo, latitud, longitud, reloj().getTime())) return { base: respaldo, origen: 'respaldo' };
      throw new ErrorClima();
    }
  }
  return async (latitud: number, longitud: number, altitudM: number | null) => {
    const clave = claveClima(latitud, longitud);
    let pendiente = pendientes.get(clave);
    if (!pendiente) { pendiente = resolver(latitud, longitud).finally(() => { pendientes.delete(clave); }); pendientes.set(clave, pendiente); }
    const { base, origen } = await pendiente;
    return { mensual: construirMensual(base, altitudM), fuente: 'NASA POWER' as const,
      resolucion: 'Meteorología: 0,5° × 0,625° (aprox. 50–70 km); radiación solar: 1° × 1°. Representa la zona, no el microclima del lote.',
      periodo: base.periodo, actualizado_en: base.consultado_en, estado_datos: origen,
      desactualizado: reloj().getTime() - Date.parse(base.consultado_en) >= VIGENCIA_CLIMA_MS,
      coordenadas: { latitud, longitud }, parametros: base.parametros, elevacion_celda_m: base.elevacion_celda_m ?? null,
      advertencias: [...base.advertencias, ...(altitudM === null ? ['Altitud del terreno desconocida: no se aplicó el ajuste de riesgo por altura.'] : [])],
      metodologia: 'Lluvia mensual estimada: mm/día × días medios del mes en el periodo (incluye bisiestos). Humedad del suelo: GWETROOT, índice 0–1, no porcentaje volumétrico. Riesgo heurístico según T2M_MIN y altitud; no son días de helada observados ni pronóstico.',
    };
  };
}
export type ServicioClima = ReturnType<typeof crearServicioClima>;
