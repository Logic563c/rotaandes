import { z } from 'zod';
import { coincideCoordenadaNasa } from './nasaPower.js';

export const ANIOS_HISTORICOS = Array.from({ length: 20 }, (_, indice) => 2005 + indice);
export const PARAMETROS_HISTORICOS = ['PRECTOTCORR', 'T2M_MIN', 'GWETTOP'] as const;
type ParametroHistorico = typeof PARAMETROS_HISTORICOS[number];
export type TipoHistorico = 'mensual' | 'diario';
export class ErrorTendencia extends Error {
  constructor() { super('No hay series históricas fiables disponibles para esta ubicación. Reintenta más tarde.'); }
}
export function diasDelMes(anio: number, mes: number): number {
  if (!Number.isInteger(anio) || anio < 1900 || anio > 9999 || !Number.isInteger(mes) || mes < 1 || mes > 12) throw new ErrorTendencia();
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}
export const FECHAS_HISTORICAS = ANIOS_HISTORICOS.flatMap((anio) => Array.from({ length: 12 }, (_, mes) =>
  Array.from({ length: diasDelMes(anio, mes + 1) }, (_, dia) => `${anio}${String(mes + 1).padStart(2, '0')}${String(dia + 1).padStart(2, '0')}`))).flat();
const MESES_HISTORICOS = ANIOS_HISTORICOS.flatMap((anio) => Array.from({ length: 12 }, (_, indice) => `${anio}${String(indice + 1).padStart(2, '0')}`));
const numero = z.number().finite();
const periodoDeclarado = z.object({ inicio: z.iso.date(), fin: z.iso.date() }).refine((p) => p.inicio >= '2005-01-01' && p.fin <= '2024-12-31' && p.inicio <= p.fin);
const metadatos = z.object({ version: z.literal(1), latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180),
  consultado_en: z.iso.datetime(), periodo: z.object({ inicio: z.literal(2005), fin: z.literal(2024) }), periodo_declarado: periodoDeclarado,
  version_api: z.string().min(1), fuentes: z.array(z.string()).min(1), tiempo: z.literal('LST'), advertencias: z.array(z.string()),
});
const serieMensual = z.object({ unidad: z.string(), valores: z.array(numero.nullable()).length(240) });
export const esquemaBaseMensual = metadatos.extend({ tipo: z.literal('mensual'), parametros: z.object({ PRECTOTCORR: serieMensual, T2M_MIN: serieMensual, GWETTOP: serieMensual }) });
export const esquemaBaseDiaria = metadatos.extend({ tipo: z.literal('diario'), unidad: z.literal('C'), valores: z.array(numero.nullable()).length(FECHAS_HISTORICAS.length) });
export type BaseMensual = z.infer<typeof esquemaBaseMensual>;
export type BaseDiaria = z.infer<typeof esquemaBaseDiaria>;
export type MetadatosHistoricos = z.infer<typeof metadatos>;
const unidades = { PRECTOTCORR: 'mm/day', T2M_MIN: 'C', GWETTOP: '1' } as const;
const limites: Record<ParametroHistorico, readonly [number, number]> = { PRECTOTCORR: [0, 2000], T2M_MIN: [-100, 70], GWETTOP: [0, 1] };
const respuestaNasa = z.object({ type: z.literal('Feature'), geometry: z.object({ type: z.literal('Point'), coordinates: z.array(numero).min(2).max(3) }),
  header: z.object({ fill_value: numero, time_standard: z.literal('LST'), start: z.string().regex(/^\d{8}$/), end: z.string().regex(/^\d{8}$/), api: z.object({ version: z.string().min(1) }), sources: z.array(z.string()).min(1) }),
  parameters: z.record(z.string(), z.unknown()), properties: z.object({ parameter: z.record(z.string(), z.unknown()) }),
});
function fechaIso(fecha: string) { return `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}`; }
function prepararRespuesta(entrada: unknown, latitud: number, longitud: number, consultadoEn: string) {
  obtenerUrlHistorico('mensual', latitud, longitud);
  const lectura = respuestaNasa.safeParse(entrada); if (!lectura.success) throw new ErrorTendencia();
  const respuesta = lectura.data; const [lon, lat] = respuesta.geometry.coordinates;
  if (!coincideCoordenadaNasa(lat, latitud) || !coincideCoordenadaNasa(lon, longitud)) throw new ErrorTendencia();
  const avisos: string[] = [];
  if (lat !== latitud || lon !== longitud) avisos.push(`NASA devolvió coordenadas redondeadas (${lat}, ${lon}); se conserva el punto solicitado (${latitud}, ${longitud}) y la resolución regional.`);
  const base = metadatos.safeParse({ version: 1, latitud, longitud, consultado_en: consultadoEn, periodo: { inicio: 2005, fin: 2024 },
    periodo_declarado: { inicio: fechaIso(respuesta.header.start), fin: fechaIso(respuesta.header.end) }, version_api: respuesta.header.api.version,
    fuentes: respuesta.header.sources, tiempo: respuesta.header.time_standard, advertencias: avisos });
  if (!base.success) throw new ErrorTendencia();
  return { respuesta, base: base.data };
}
function leerSerie(parametro: ParametroHistorico, respuesta: z.infer<typeof respuestaNasa>, claves: readonly string[]) {
  const meta = z.object({ units: z.string(), longname: z.string() }).safeParse(respuesta.parameters[parametro]);
  const serie = z.record(z.string(), z.unknown()).safeParse(respuesta.properties.parameter[parametro]);
  const unidad = meta.success ? meta.data.units : 'no disponible'; const [minimo, maximo] = limites[parametro];
  const valores = claves.map((fecha) => {
    const fechaCompleta = fecha.length === 6 ? `${fecha}01` : fecha;
    const fechaFinal = fecha.length === 6 ? `${fecha}${diasDelMes(Number(fecha.slice(0, 4)), Number(fecha.slice(4, 6)))}` : fecha;
    const valor = serie.success ? serie.data[fecha] : undefined;
    return fechaCompleta >= respuesta.header.start && fechaFinal <= respuesta.header.end && unidad === unidades[parametro]
      && typeof valor === 'number' && Number.isFinite(valor) && valor !== -999 && valor !== respuesta.header.fill_value && valor >= minimo && valor <= maximo ? valor : null;
  });
  const ausentes = valores.filter((v) => v === null).length;
  const advertencias = [...(unidad !== unidades[parametro] ? [`${parametro}: unidad ausente o incompatible (${unidad}); no se interpreta por suposición.`] : []),
    ...(ausentes ? [`${parametro}: ${ausentes} de ${claves.length} registros sin valor válido; se conservan nulos.`] : [])];
  return { unidad, valores, advertencias };
}
export function procesarMensualHistorico(entrada: unknown, latitud: number, longitud: number, consultadoEn: string): BaseMensual {
  const { respuesta, base } = prepararRespuesta(entrada, latitud, longitud, consultadoEn);
  const lluvia = leerSerie('PRECTOTCORR', respuesta, MESES_HISTORICOS); const minima = leerSerie('T2M_MIN', respuesta, MESES_HISTORICOS); const humedad = leerSerie('GWETTOP', respuesta, MESES_HISTORICOS);
  if (!lluvia.valores.some((v) => v !== null) && !minima.valores.some((v) => v !== null)) throw new ErrorTendencia();
  return esquemaBaseMensual.parse({ ...base, tipo: 'mensual', parametros: { PRECTOTCORR: lluvia, T2M_MIN: minima, GWETTOP: humedad },
    advertencias: [...base.advertencias, ...lluvia.advertencias, ...minima.advertencias, ...humedad.advertencias] });
}
export function procesarDiarioHistorico(entrada: unknown, latitud: number, longitud: number, consultadoEn: string): BaseDiaria {
  const { respuesta, base } = prepararRespuesta(entrada, latitud, longitud, consultadoEn);
  const minima = leerSerie('T2M_MIN', respuesta, FECHAS_HISTORICAS);
  if (minima.unidad !== 'C' || !minima.valores.some((v) => v !== null)) throw new ErrorTendencia();
  return esquemaBaseDiaria.parse({ ...base, tipo: 'diario', unidad: minima.unidad, valores: minima.valores, advertencias: [...base.advertencias, ...minima.advertencias] });
}
export function esMensualCoherente(base: BaseMensual): boolean {
  return PARAMETROS_HISTORICOS.every((p) => base.parametros[p].valores.every((v, indice) => {
    const mes = MESES_HISTORICOS[indice]; if (!mes) return false;
    const inicio = `${mes.slice(0, 4)}-${mes.slice(4)}-01`; const fin = `${mes.slice(0, 4)}-${mes.slice(4)}-${diasDelMes(Number(mes.slice(0, 4)), Number(mes.slice(4)))}`;
    return v === null || (base.parametros[p].unidad === unidades[p] && v >= limites[p][0] && v <= limites[p][1] && inicio >= base.periodo_declarado.inicio && fin <= base.periodo_declarado.fin);
  }))
    && [base.parametros.PRECTOTCORR, base.parametros.T2M_MIN].some((s) => s.valores.some((v) => v !== null));
}
export function esDiarioCoherente(base: BaseDiaria): boolean {
  return base.valores.some((v) => v !== null) && base.valores.every((v, indice) => {
    const fecha = FECHAS_HISTORICAS[indice];
    return v === null || (fecha !== undefined && v >= -100 && v <= 70 && fechaIso(fecha) >= base.periodo_declarado.inicio && fechaIso(fecha) <= base.periodo_declarado.fin);
  });
}
export function obtenerUrlHistorico(tipo: TipoHistorico, latitud: number, longitud: number): URL {
  if (!Number.isFinite(latitud) || Math.abs(latitud) > 90 || !Number.isFinite(longitud) || Math.abs(longitud) > 180) throw new ErrorTendencia();
  const url = new URL(`https://power.larc.nasa.gov/api/temporal/${tipo === 'mensual' ? 'monthly' : 'daily'}/point`);
  url.search = new URLSearchParams({ parameters: tipo === 'mensual' ? PARAMETROS_HISTORICOS.join(',') : 'T2M_MIN', community: 'AG',
    latitude: String(latitud), longitude: String(longitud), start: tipo === 'mensual' ? '2005' : '20050101', end: tipo === 'mensual' ? '2024' : '20241231', format: 'JSON', ...(tipo === 'diario' ? { 'time-standard': 'LST' } : {}) }).toString();
  return url;
}
export function crearClienteHistoricoNasa(solicitar: typeof fetch = fetch, reloj: () => Date = () => new Date()) {
  let activas = 0; let llamadas: number[] = [];
  async function consultar(tipo: TipoHistorico, latitud: number, longitud: number): Promise<unknown> {
    const ahora = reloj().getTime(); llamadas = llamadas.filter((t) => ahora - t < 3600000);
    if (activas >= 2 || llamadas.length >= 120 || llamadas.filter((t) => ahora - t < 60000).length >= 12) throw new ErrorTendencia();
    llamadas.push(ahora); activas++;
    try {
      const respuesta = await solicitar(obtenerUrlHistorico(tipo, latitud, longitud), { signal: AbortSignal.timeout(15000), redirect: 'error', headers: { Accept: 'application/json' } });
      if (!respuesta.ok || !respuesta.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !respuesta.body || Number(respuesta.headers.get('content-length') ?? 0) > 1048576) { await respuesta.body?.cancel(); throw new ErrorTendencia(); }
      const lector = respuesta.body.getReader(); const partes: Uint8Array[] = []; let total = 0;
      try { for (;;) { const parte = await lector.read(); if (parte.done) break; total += parte.value.byteLength; if (total > 1048576) { await lector.cancel(); throw new ErrorTendencia(); } partes.push(parte.value); } }
      finally { lector.releaseLock(); }
      return JSON.parse(Buffer.concat(partes).toString('utf8')) as unknown;
    } catch { throw new ErrorTendencia(); } finally { activas--; }
  }
  return {
    mensual: async (lat: number, lon: number) => procesarMensualHistorico(await consultar('mensual', lat, lon), lat, lon, reloj().toISOString()),
    diario: async (lat: number, lon: number) => procesarDiarioHistorico(await consultar('diario', lat, lon), lat, lon, reloj().toISOString()),
  };
}
