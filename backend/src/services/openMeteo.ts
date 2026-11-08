import { z } from 'zod';
import { esFechaReal } from './validacionAgricola.js';

export const ZONA_PRONOSTICO = 'America/Guayaquil';
export class ErrorPronostico extends Error {
  constructor() { super('No hay un pronóstico vigente disponible para esta ubicación. Inténtalo de nuevo en un momento.'); }
}
const numero = z.number().finite();
const coordenadas = z.object({ latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180) });
const temperatura = numero.min(-100).max(70).nullable();
const precipitacion = numero.min(0).max(2000).nullable();
export function obtenerFechaEcuador(instante: Date): string {
  // Ecuador continental usa UTC-5: las fechas civiles no pasan por la zona horaria del servidor.
  return new Date(instante.getTime() - 5 * 3600000).toISOString().slice(0, 10);
}
export function sumarDia(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);
}
export const esquemaBasePronostico = z.object({
  version: z.literal(1), coordenadas, cuadricula: coordenadas, zona_horaria: z.literal(ZONA_PRONOSTICO), consultado_en: z.iso.datetime(),
  dias: z.array(z.object({ fecha: z.string().refine(esFechaReal), t_max: temperatura, t_min: temperatura, precipitacion_mm: precipitacion })).length(7),
}).refine((base) => {
  if (!Number.isFinite(Date.parse(base.consultado_en))) return false;
  const primero = base.dias[0];
  return primero !== undefined && primero.fecha === obtenerFechaEcuador(new Date(base.consultado_en))
    && base.dias.every((dia, indice) => dia.fecha === sumarDia(primero.fecha, indice) && (dia.t_min === null || dia.t_max === null || dia.t_min <= dia.t_max))
    && base.dias.some((dia) => dia.t_min !== null || dia.t_max !== null || dia.precipitacion_mm !== null)
    && Math.abs(base.coordenadas.latitud - base.cuadricula.latitud) <= 1
    && Math.min(Math.abs(base.coordenadas.longitud - base.cuadricula.longitud), 360 - Math.abs(base.coordenadas.longitud - base.cuadricula.longitud)) <= 1;
});
export type BasePronostico = z.infer<typeof esquemaBasePronostico>;
const esquemaProveedor = z.object({
  latitude: numero.min(-90).max(90), longitude: numero.min(-180).max(180), timezone: z.literal(ZONA_PRONOSTICO), utc_offset_seconds: z.literal(-18000),
  daily_units: z.object({ time: z.literal('iso8601'), temperature_2m_max: z.literal('°C'), temperature_2m_min: z.literal('°C'), precipitation_sum: z.literal('mm') }),
  daily: z.object({ time: z.array(z.string()).length(7), temperature_2m_max: z.array(temperatura).length(7), temperature_2m_min: z.array(temperatura).length(7), precipitation_sum: z.array(precipitacion).length(7) }),
});
export function obtenerUrlPronostico(latitud: number, longitud: number): URL {
  if (!coordenadas.safeParse({ latitud, longitud }).success) throw new ErrorPronostico();
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(latitud), longitude: String(longitud), daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', timezone: ZONA_PRONOSTICO, forecast_days: '7' }).toString();
  return url;
}
export function procesarPronostico(entrada: unknown, latitud: number, longitud: number, consultadoEn: string): BasePronostico {
  const lectura = esquemaProveedor.safeParse(entrada); if (!lectura.success) throw new ErrorPronostico();
  const datos = lectura.data;
  const base = esquemaBasePronostico.safeParse({ version: 1, coordenadas: { latitud, longitud }, cuadricula: { latitud: datos.latitude, longitud: datos.longitude }, zona_horaria: datos.timezone, consultado_en: consultadoEn,
    dias: datos.daily.time.map((fecha, indice) => ({ fecha, t_max: datos.daily.temperature_2m_max[indice], t_min: datos.daily.temperature_2m_min[indice], precipitacion_mm: datos.daily.precipitation_sum[indice] })) });
  if (!base.success) throw new ErrorPronostico();
  return base.data;
}
export function obtenerUmbralHelada(entorno: NodeJS.ProcessEnv = process.env): number {
  const texto = entorno.UMBRAL_HELADA_C ?? '2'; const valor = Number(texto);
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(texto) || !Number.isFinite(valor) || valor < -10 || valor > 10) throw new Error('UMBRAL_HELADA_C debe ser un número entre -10 y 10, con hasta dos decimales.');
  return valor;
}
export function generarAlertas(dias: BasePronostico['dias'], umbralC: number) {
  if (!Number.isFinite(umbralC) || umbralC < -10 || umbralC > 10) throw new Error('Umbral de helada inválido.');
  return dias.flatMap((dia) => {
    if (dia.t_min === null || dia.t_min > umbralC) return [];
    const nombre = new Intl.DateTimeFormat('es-EC', { weekday: 'long', timeZone: ZONA_PRONOSTICO }).format(new Date(`${dia.fecha}T12:00:00-05:00`));
    return [{ fecha: dia.fecha, tipo: 'helada' as const, mensaje: `Posible helada el ${nombre}. La temperatura mínima prevista es de ${dia.t_min.toLocaleString('es-EC')} °C. Revise las condiciones locales y las medidas de protección de sus cultivos.` }];
  });
}
export function crearClientePronostico(solicitar: typeof fetch = fetch, reloj = () => new Date()) {
  let activas = 0;
  const ventanas = [{ duracion: 60000, limite: 20, inicio: 0, cantidad: 0 }, { duracion: 3600000, limite: 200, inicio: 0, cantidad: 0 }, { duracion: 86400000, limite: 2000, inicio: 0, cantidad: 0 }];
  return async (latitud: number, longitud: number): Promise<BasePronostico> => {
    const ahora = reloj().getTime();
    for (const ventana of ventanas) if (ahora - ventana.inicio >= ventana.duracion) { ventana.inicio = ahora; ventana.cantidad = 0; }
    if (activas >= 2 || ventanas.some((ventana) => ventana.cantidad >= ventana.limite)) throw new ErrorPronostico();
    activas++; ventanas.forEach((ventana) => ventana.cantidad++);
    try {
      const respuesta = await solicitar(obtenerUrlPronostico(latitud, longitud), { signal: AbortSignal.timeout(6000), redirect: 'error', headers: { Accept: 'application/json' } });
      if (!respuesta.ok) { await respuesta.body?.cancel(); throw new ErrorPronostico(); }
      if (!respuesta.body) throw new ErrorPronostico();
      const lector = respuesta.body.getReader(); const partes: Uint8Array[] = []; let total = 0;
      try {
        while (true) {
          const parte = await lector.read(); if (parte.done) break;
          total += parte.value.byteLength;
          if (total > 65536) { await lector.cancel(); throw new ErrorPronostico(); }
          partes.push(parte.value);
        }
      } finally { lector.releaseLock(); }
      const entrada: unknown = JSON.parse(Buffer.concat(partes).toString('utf8'));
      return procesarPronostico(entrada, latitud, longitud, reloj().toISOString());
    } catch { throw new ErrorPronostico(); }
    finally { activas--; }
  };
}
