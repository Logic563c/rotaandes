import { z } from 'zod';

export const PARAMETROS_NASA = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'GWETTOP', 'GWETROOT', 'ALLSKY_SFC_SW_DWN'] as const;
export const MESES_NASA = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;
type ParametroNasa = typeof PARAMETROS_NASA[number];
const numero = z.number().finite();
export const esquemaClimatologiaBase = z.object({
  version: z.literal(1), latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180),
  periodo: z.object({ inicio: z.number().int().min(1900).max(9999), fin: z.number().int().min(1900).max(9999) }).refine((valor) => valor.inicio <= valor.fin && valor.fin - valor.inicio <= 200),
  consultado_en: z.iso.datetime(), version_api: z.string(), fuentes: z.array(z.string()), advertencias: z.array(z.string()),
  parametros: z.record(z.enum(PARAMETROS_NASA), z.object({ unidad: z.string(), valores: z.array(numero.nullable()).length(12) })),
});
export type ClimatologiaBase = z.infer<typeof esquemaClimatologiaBase>;
export class ErrorClima extends Error {
  constructor() { super('No hay climatología fiable disponible para esta ubicación. Inténtalo más tarde.'); }
}
const unidades: Record<ParametroNasa, string> = { T2M: 'C', T2M_MIN: 'C', T2M_MAX: 'C', PRECTOTCORR: 'mm/day', RH2M: '%', GWETTOP: '1', GWETROOT: '1', ALLSKY_SFC_SW_DWN: 'MJ/m^2/day' };
const limites: Record<ParametroNasa, [number, number]> = { T2M: [-100, 70], T2M_MIN: [-100, 70], T2M_MAX: [-100, 70], PRECTOTCORR: [0, 2000], RH2M: [0, 100], GWETTOP: [0, 1], GWETROOT: [0, 1], ALLSKY_SFC_SW_DWN: [0, 60] };
const esquemaRespuesta = z.object({
  type: z.literal('Feature'), geometry: z.object({ type: z.literal('Point'), coordinates: z.array(numero).min(2).max(3) }),
  header: z.object({ fill_value: numero, range: z.string().optional(), start: z.string().optional(), end: z.string().optional(), api: z.object({ version: z.string() }), sources: z.array(z.string()) }),
  properties: z.object({ parameter: z.record(z.string(), z.unknown()) }),
  parameters: z.record(z.string(), z.unknown()),
});

export function obtenerUrlNasa(latitud: number, longitud: number): URL {
  if (!Number.isFinite(latitud) || Math.abs(latitud) > 90 || !Number.isFinite(longitud) || Math.abs(longitud) > 180) throw new ErrorClima();
  const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
  url.search = new URLSearchParams({ parameters: PARAMETROS_NASA.join(','), community: 'AG', latitude: String(latitud), longitude: String(longitud), format: 'JSON' }).toString();
  return url;
}

export function procesarRespuestaNasa(entrada: unknown, latitud: number, longitud: number, consultadoEn: string): ClimatologiaBase {
  const lectura = esquemaRespuesta.safeParse(entrada);
  if (!lectura.success) throw new ErrorClima();
  const respuesta = lectura.data;
  if (respuesta.geometry.coordinates[0] !== longitud || respuesta.geometry.coordinates[1] !== latitud) throw new ErrorClima();
  const periodoDeclarado = respuesta.header.range?.match(/January (\d{4})\s*-\s*December (\d{4})/);
  const inicio = Number(periodoDeclarado?.[1] ?? respuesta.header.start?.slice(0, 4));
  const fin = Number(periodoDeclarado?.[2] ?? respuesta.header.end?.slice(0, 4));
  const advertencias: string[] = [];
  const vacio = () => ({ unidad: 'no disponible', valores: Array<number | null>(12).fill(null) });
  const parametros: Record<ParametroNasa, { unidad: string; valores: (number | null)[] }> = {
    T2M: vacio(), T2M_MIN: vacio(), T2M_MAX: vacio(), PRECTOTCORR: vacio(), RH2M: vacio(), GWETTOP: vacio(), GWETROOT: vacio(), ALLSKY_SFC_SW_DWN: vacio(),
  };
  for (const parametro of PARAMETROS_NASA) {
    const metadatos = z.object({ units: z.string(), longname: z.string() }).safeParse(respuesta.parameters[parametro]);
    const serie = z.record(z.string(), z.unknown()).safeParse(respuesta.properties.parameter[parametro]);
    const unidad = metadatos.success ? metadatos.data.units : 'no disponible';
    const [minimo, maximo] = limites[parametro];
    const valores = MESES_NASA.map((mes) => {
      const valor = serie.success ? serie.data[mes] : undefined;
      return unidad === unidades[parametro] && typeof valor === 'number' && Number.isFinite(valor)
        && valor !== respuesta.header.fill_value && valor !== -999 && valor >= minimo && valor <= maximo ? valor : null;
    });
    if (unidad !== unidades[parametro]) advertencias.push(`${parametro}: unidad ausente o incompatible (${unidad}); no se usa ni convierte por suposición.`);
    const ausentes = valores.filter((valor) => valor === null).length;
    if (ausentes) advertencias.push(`${parametro}: ${ausentes} meses sin datos válidos; se conservan nulos.`);
    parametros[parametro] = { unidad, valores };
  }
  for (let indice = 0; indice < 12; indice++) {
    const minima = parametros.T2M_MIN.valores[indice]; const media = parametros.T2M.valores[indice]; const maxima = parametros.T2M_MAX.valores[indice];
    if ((minima != null && maxima != null && minima > maxima) || (media != null && minima != null && media < minima) || (media != null && maxima != null && media > maxima)) {
      parametros.T2M_MIN.valores[indice] = null; parametros.T2M.valores[indice] = null; parametros.T2M_MAX.valores[indice] = null;
      advertencias.push(`Mes ${indice + 1}: temperaturas incoherentes; se conservan nulas.`);
    }
  }
  if (!['T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR', 'GWETROOT'].some((clave) => {
    const parametro = PARAMETROS_NASA.find((valor) => valor === clave);
    return parametro !== undefined && parametros[parametro].valores.some((valor) => valor !== null);
  })) throw new ErrorClima();
  const resultado = esquemaClimatologiaBase.safeParse({ version: 1, latitud, longitud, periodo: { inicio, fin }, consultado_en: consultadoEn,
    version_api: respuesta.header.api.version, fuentes: respuesta.header.sources, parametros, advertencias });
  if (!resultado.success) throw new ErrorClima();
  return resultado.data;
}

export function diasMediosMes(mes: number, inicio: number, fin: number): number {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(inicio) || !Number.isInteger(fin) || inicio < 1900 || fin > 9999 || inicio > fin || fin - inicio > 200) throw new ErrorClima();
  if (mes !== 2) return [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1] ?? 0;
  let bisiestos = 0;
  for (let anio = inicio; anio <= fin; anio++) if (anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) bisiestos++;
  return 28 + bisiestos / (fin - inicio + 1);
}
export function esClimatologiaCoherente(base: ClimatologiaBase): boolean {
  for (const clave of PARAMETROS_NASA) {
    if (base.parametros[clave].valores.some((valor) => valor !== null && (base.parametros[clave].unidad !== unidades[clave] || valor < limites[clave][0] || valor > limites[clave][1]))) return false;
  }
  for (let indice = 0; indice < 12; indice++) {
    const minima = base.parametros.T2M_MIN.valores[indice]; const media = base.parametros.T2M.valores[indice]; const maxima = base.parametros.T2M_MAX.valores[indice];
    if ((minima != null && maxima != null && minima > maxima) || (media != null && minima != null && media < minima) || (media != null && maxima != null && media > maxima)) return false;
  }
  return [base.parametros.T2M, base.parametros.T2M_MIN, base.parametros.T2M_MAX, base.parametros.PRECTOTCORR, base.parametros.GWETROOT].some((serie) => serie.valores.some((valor) => valor !== null));
}
export function calcularRiesgoHelada(minima: number | null, altitudM: number | null): 'alto' | 'medio' | 'bajo' | null {
  if (minima === null || !Number.isFinite(minima)) return null;
  const nivel = minima <= 2 ? 2 : minima <= 5 ? 1 : 0;
  return (['bajo', 'medio', 'alto'] as const)[Math.min(2, nivel + (altitudM !== null && altitudM >= 3400 ? 1 : 0))] ?? null;
}
export function construirMensual(base: ClimatologiaBase, altitudM: number | null) {
  return MESES_NASA.map((_mes, indice) => {
    const minima = base.parametros.T2M_MIN.valores[indice] ?? null;
    const lluvia = base.parametros.PRECTOTCORR.valores[indice] ?? null;
    return { mes: indice + 1, t_min: minima, t_max: base.parametros.T2M_MAX.valores[indice] ?? null,
      t_med: base.parametros.T2M.valores[indice] ?? null,
      lluvia_mm: lluvia === null ? null : Math.round(lluvia * diasMediosMes(indice + 1, base.periodo.inicio, base.periodo.fin) * 100) / 100,
      humedad_suelo: base.parametros.GWETROOT.valores[indice] ?? null, riesgo_helada: calcularRiesgoHelada(minima, altitudM) };
  });
}

export function crearClienteNasa(solicitar: typeof fetch = fetch, reloj: () => Date = () => new Date()) {
  let activas = 0; let ventana = 0; let cantidad = 0;
  return async (latitud: number, longitud: number): Promise<ClimatologiaBase> => {
    const ahora = reloj().getTime();
    if (ahora - ventana >= 60000) { ventana = ahora; cantidad = 0; }
    if (activas >= 2 || cantidad >= 20) throw new ErrorClima();
    activas++; cantidad++;
    try {
      const respuesta = await solicitar(obtenerUrlNasa(latitud, longitud), { signal: AbortSignal.timeout(6000), redirect: 'error', headers: { Accept: 'application/json' } });
      if (!respuesta.ok) { await respuesta.body?.cancel(); throw new ErrorClima(); }
      if (!respuesta.body) throw new ErrorClima();
      const lector = respuesta.body.getReader(); const partes: Uint8Array[] = []; let total = 0;
      try {
        while (true) {
          const parte = await lector.read(); if (parte.done) break;
          total += parte.value.byteLength;
          if (total > 262144) { await lector.cancel(); throw new ErrorClima(); }
          partes.push(parte.value);
        }
      } finally { lector.releaseLock(); }
      const datos: unknown = JSON.parse(Buffer.concat(partes).toString('utf8'));
      return procesarRespuestaNasa(datos, latitud, longitud, reloj().toISOString());
    } catch { throw new ErrorClima(); }
    finally { activas--; }
  };
}
