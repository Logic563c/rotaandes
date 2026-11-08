import type { PrismaClient } from '../generated/prisma/client.js';
import { crearClientePronostico, ErrorPronostico, esquemaBasePronostico, obtenerFechaEcuador, generarAlertas, obtenerUmbralHelada, sumarDia } from './openMeteo.js';
import type { BasePronostico } from './openMeteo.js';

export const VIGENCIA_PRONOSTICO_MS = 30 * 60000;
export type ObtenerCachePronostico = () => Pick<PrismaClient['climaCache'], 'findUnique' | 'upsert'>;
export function obtenerClavePronostico(latitud: number, longitud: number) { return `open_meteo_forecast_v1_${latitud}_${longitud}`; }
export function calcularVigenciaPronostico(base: BasePronostico): number {
  const siguienteDia = sumarDia(obtenerFechaEcuador(new Date(base.consultado_en)), 1);
  return Math.min(Date.parse(base.consultado_en) + VIGENCIA_PRONOSTICO_MS, Date.parse(`${siguienteDia}T00:00:00-05:00`));
}
export function validarPronosticoVigente(entrada: unknown, latitud: number, longitud: number, ahora: Date): BasePronostico | null {
  const resultado = esquemaBasePronostico.safeParse(entrada); if (!resultado.success) return null;
  const base = resultado.data;
  return base.coordenadas.latitud === latitud && base.coordenadas.longitud === longitud && Date.parse(base.consultado_en) <= ahora.getTime()
    && ahora.getTime() < calcularVigenciaPronostico(base) ? base : null;
}
export function crearServicioPronostico(obtenerCache: ObtenerCachePronostico, consultar = crearClientePronostico(), reloj = () => new Date(), umbralC = obtenerUmbralHelada()) {
  generarAlertas([], umbralC);
  const pendientes = new Map<string, Promise<{ base: BasePronostico; origen: 'open_meteo' | 'cache' }>>();
  const fallos = new Map<string, number>();
  async function resolver(latitud: number, longitud: number): Promise<{ base: BasePronostico; origen: 'open_meteo' | 'cache' }> {
    const clave = obtenerClavePronostico(latitud, longitud); const ahora = reloj();
    const guardado = await obtenerCache().findUnique({ where: { clave } });
    const anterior = guardado ? validarPronosticoVigente(guardado.datos, latitud, longitud, ahora) : null;
    if (anterior && guardado?.actualizadoEn?.getTime() === Date.parse(anterior.consultado_en)) return { base: anterior, origen: 'cache' };
    if ((fallos.get(clave) ?? 0) > ahora.getTime()) throw new ErrorPronostico();
    let base: BasePronostico;
    try {
      const resultado = await consultar(latitud, longitud);
      const validado = validarPronosticoVigente(resultado, latitud, longitud, reloj());
      if (!validado) throw new ErrorPronostico(); base = validado;
    } catch (error: unknown) {
      if (!(error instanceof ErrorPronostico)) throw error;
      if (fallos.size >= 500) { const primera = fallos.keys().next().value; if (primera !== undefined) fallos.delete(primera); }
      fallos.set(clave, reloj().getTime() + 60000); throw error;
    }
    await obtenerCache().upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(base.consultado_en) }, update: { datos: base, actualizadoEn: new Date(base.consultado_en) } });
    fallos.delete(clave); return { base, origen: 'open_meteo' };
  }
  return async (latitud: number, longitud: number) => {
    const clave = obtenerClavePronostico(latitud, longitud); let pendiente = pendientes.get(clave);
    if (!pendiente) { pendiente = resolver(latitud, longitud).finally(() => { pendientes.delete(clave); }); pendientes.set(clave, pendiente); }
    const { base, origen } = await pendiente;
    if (!validarPronosticoVigente(base, latitud, longitud, reloj())) throw new ErrorPronostico();
    const incompletos = base.dias.filter((dia) => dia.t_min === null || dia.t_max === null || dia.precipitacion_mm === null);
    return { dias: base.dias, alertas: generarAlertas(base.dias, umbralC), fuente: 'Open-Meteo' as const, actualizado_en: base.consultado_en,
      vigente_hasta: new Date(calcularVigenciaPronostico(base)).toISOString(), estado_datos: origen, zona_horaria: base.zona_horaria, coordenadas: base.coordenadas, cuadricula: base.cuadricula,
      unidades: { temperatura: '°C' as const, precipitacion: 'mm' as const }, umbral_helada_c: umbralC,
      advertencias: incompletos.length ? [`${incompletos.length} días tienen datos incompletos. Sin mínima válida no se puede evaluar una posible helada; no se sustituyen datos por cero.`] : [],
      aviso: 'Alerta preventiva basada en un pronóstico, no confirma que ocurrirá una helada. Representa una zona modelada, no una medición exacta del lote. No se aplican correcciones adicionales por altitud. Consulte las condiciones locales y el criterio de un técnico agrícola.',
    };
  };
}
export type ServicioPronostico = ReturnType<typeof crearServicioPronostico>;
