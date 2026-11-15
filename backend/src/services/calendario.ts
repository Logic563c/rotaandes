import { z } from 'zod';
import { calcularRiesgoHelada } from './nasaPower.js';
import { CATEGORIAS_CULTIVO, CICLO_CORTO_MAX_DIAS, DIAS_POR_MES, FUENTES_AGRONOMICAS, IDS_CULTIVOS_NUEVOS, IDS_CULTIVOS_ORIGINALES, obtenerPerfil } from '../data/perfilesAgronomicos.js';
import type { ClaveFuente, PerfilAgronomico } from '../data/perfilesAgronomicos.js';

// Calendario de siembra v3 (PROYECTO.md §7.2). Evalúa todo el ciclo del cultivo, no solo el mes de siembra, con
// criterios separados y explicados: época, altitud, temperatura media, heladas y agua. Precedencia del estado:
// una exclusión justificada → no recomendado; si no, un dato o una fuente ausente → no determinado; si no, algún
// riesgo manejable → posible con precaución; si no → recomendado. Ningún dato ausente se convierte en favorable.
export const IDS_CULTIVOS_CALENDARIO = [...IDS_CULTIVOS_ORIGINALES, ...IDS_CULTIVOS_NUEVOS] as const;
export const MESES_CALENDARIO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** Gradiente de temperatura media observado en los Andes ecuatorianos (Córdova et al., 2016). */
export const GRADIENTE_TEMPERATURA_MEDIA_C_POR_KM = 6.9;
/** Gradiente de temperatura mínima observado en los Andes ecuatorianos (Córdova et al., 2016). */
export const GRADIENTE_TEMPERATURA_MINIMA_C_POR_KM = 5.5;
export const VERSION_CALENDARIO = 'calendario_ciclo_v3';
export class ErrorCalendario extends Error { constructor() { super('No se puede calcular el calendario con los datos disponibles. Revisa el catálogo y la información climática.'); } }
const numero = z.number().finite();
export const esquemaEscenarioCalendario = z.strictObject({ lluviaPct: numero.min(-30).max(30), tempDelta: numero.min(-2).max(2) });
export type EscenarioCalendario = z.infer<typeof esquemaEscenarioCalendario>;
const esquemaCultivo = z.object({
  id: z.enum(IDS_CULTIVOS_CALENDARIO), nombre: z.string().min(1),
  altitudMin: numero.int().nullable().default(null), altitudMax: numero.int().nullable().default(null),
  cicloMeses: numero.int().min(1).max(12),
  mesesSiembra: z.array(numero.int().min(1).max(12)).max(12).refine((meses) => new Set(meses).size === meses.length),
  lluviaMinMensualMm: numero.min(0).nullable().default(null), toleranciaHelada: numero.int().min(1).max(5).nullable().default(null),
}).refine((cultivo) => (cultivo.altitudMin === null) === (cultivo.altitudMax === null) && (cultivo.altitudMin === null || cultivo.altitudMax === null || cultivo.altitudMin <= cultivo.altitudMax));
export const esquemaCultivosCalendario = z.array(esquemaCultivo).min(1).max(IDS_CULTIVOS_CALENDARIO.length)
  .refine((cultivos) => new Set(cultivos.map((cultivo) => cultivo.id)).size === cultivos.length);
export type CultivoCalendario = z.infer<typeof esquemaCultivo>;
const esquemaMes = z.object({ mes: numero.int().min(1).max(12), t_min: numero.min(-100).max(70).nullable().default(null), t_max: numero.min(-100).max(70).nullable().default(null),
  t_med: numero.min(-100).max(70).nullable().default(null),
  lluvia_mm: numero.min(0).max(62000).nullable().default(null), riesgo_helada: z.enum(['bajo', 'medio', 'alto']).nullable().default(null) })
  .refine((mes) => (mes.t_min === null || mes.t_max === null || mes.t_min <= mes.t_max) && (mes.t_med === null || ((mes.t_min === null || mes.t_min <= mes.t_med) && (mes.t_max === null || mes.t_med <= mes.t_max))));
const esquemaEntrada = z.object({
  terreno: z.object({ altitudM: numero.int().min(-12000).max(9000).nullable(), tieneRiego: z.boolean().nullable(), areaHa: numero.positive().max(999999.99).nullable() }),
  cultivos: esquemaCultivosCalendario,
  mensual: z.array(esquemaMes).max(12).refine((meses) => new Set(meses.map((mes) => mes.mes)).size === meses.length),
  escenario: esquemaEscenarioCalendario.default({ lluviaPct: 0, tempDelta: 0 }),
  elevacionCeldaM: numero.min(-500).max(9000).nullable().default(null),
});
export type TerrenoCalendario = z.infer<typeof esquemaEntrada>['terreno'];
export type MesCalendario = z.input<typeof esquemaMes>;
type MesNormalizado = z.infer<typeof esquemaMes>;
export type EstadoCalendario = 'recomendado' | 'posible_con_cuidado' | 'no_recomendado' | 'no_determinado';
export interface CeldaCalendario { cultivo_id: string; mes: number; estado: EstadoCalendario; resumen: string; motivo: string }
type Efecto = 'favorable' | 'informativo' | 'precaucion' | 'indeterminado' | 'excluye';
type Criterio = 'epoca' | 'altitud' | 'temperatura' | 'helada' | 'agua';
interface Factor { criterio: Criterio; efecto: Efecto; texto: string; breve: string }
/** Acción práctica sugerida para cada motivo breve de precaución o de dato faltante; no altera el estado. */
const ACCIONES: Record<string, string> = {
  'altitud del terreno desconocida': 'revisa la ubicación del terreno en el mapa para estimar su altitud',
  'altitud desconocida': 'revisa la ubicación del terreno en el mapa para estimar su altitud',
  'temperatura NASA sin dato': 'vuelve a consultar más tarde; si continúa, pide apoyo a un técnico',
  'rango de temperatura sin fuente': 'pregunta a un técnico si el cultivo se adapta a tu zona',
  'riesgo de helada sin dato': 'vuelve a consultar más tarde',
  'no se sabe cuánto resiste las heladas': 'pregunta a un técnico o al MAG/INIAP si hay variedades resistentes a heladas, o elige un mes cuyo ciclo no tenga riesgo alto',
  'no se sabe si el terreno tiene riego': 'indica al editar el terreno si tiene riego',
  'no se sabe cuánta agua necesita sin riego': 'si puedes regar, indícalo en el terreno; si no, consulta a un técnico cuánta agua necesita este cultivo',
  'no se sabe cuánta agua necesita': 'si puedes regar, indícalo en el terreno; si no, consulta a un técnico cuánta agua necesita este cultivo',
  'lluvia NASA sin dato': 'vuelve a consultar más tarde',
  'fuera de la época referencial': 'confirma la época de siembra con un técnico o con agricultores de tu zona',
  'altitud fuera del rango referencial': 'usa una variedad adaptada a tu altitud',
  'fuentes de temperatura y altitud no coinciden': 'usa una variedad adaptada a tu altitud y confírmala con un técnico',
  'temperatura en el límite (sin ajuste por altitud)': 'vuelve a consultar en unos días, cuando se actualicen los datos de NASA',
  'temperatura sin ajuste por altitud': 'vuelve a consultar en unos días, cuando se actualicen los datos de NASA',
  'falta la altitud de la celda NASA': 'vuelve a consultar el clima; si el proveedor sigue sin responder, pide apoyo a un técnico',
  'no se ha confirmado agua permanente': 'confirma con un técnico si hay agua limpia y constante o suelo saturado durante todo el ciclo; tener riego por sí solo no lo confirma',
  'riesgo alto de helada en el ciclo': 'protege el cultivo en noches frías, prefiere variedades tolerantes o elige otro mes',
  'riesgo medio de helada': 'vigila las noches frías y protege el cultivo si hace falta',
  'lluvia justa para el ciclo': 'prepara riego de apoyo por si el año es seco',
  'meses secos en el ciclo': 'prepara riego de apoyo para los meses secos',
  'necesita agua permanente': 'asegura agua limpia y constante durante todo el ciclo',
};
const ETIQUETA_CRITERIO: Record<Criterio, string> = { epoca: 'Época', altitud: 'Altitud', temperatura: 'Temperatura', helada: 'Heladas', agua: 'Agua' };

export function aplicarEscenarioCalendario(mensual: MesCalendario[], altitudM: number | null, escenario: EscenarioCalendario): MesNormalizado[] {
  const validado = esquemaEscenarioCalendario.safeParse(escenario); if (!validado.success) throw new ErrorCalendario();
  return mensual.map((entrada) => {
    const mes = esquemaMes.parse(entrada);
    const minima = mes.t_min === null ? null : mes.t_min + escenario.tempDelta;
    return { ...mes, t_min: minima, t_max: mes.t_max === null ? null : mes.t_max + escenario.tempDelta, t_med: mes.t_med === null ? null : mes.t_med + escenario.tempDelta,
      lluvia_mm: mes.lluvia_mm === null ? null : mes.lluvia_mm * (1 + escenario.lluviaPct / 100),
      riesgo_helada: mes.riesgo_helada === null ? null : calcularRiesgoHelada(minima, altitudM) };
  });
}
function mostrarNumero(valor: number, decimales = 1): string { return valor.toLocaleString('es-EC', { maximumFractionDigits: decimales }); }
const nombreMes = (mes: number) => MESES_CALENDARIO[mes - 1] ?? String(mes);
function listaMeses(meses: number[]): string { return meses.length === 12 ? 'todo el año' : meses.map(nombreMes).join(', '); }
function citar(...claves: ClaveFuente[]): string { return [...new Set(claves)].map((clave) => FUENTES_AGRONOMICAS[clave].cita).join('; '); }
const esOriginal = (id: string) => (IDS_CULTIVOS_ORIGINALES as readonly string[]).includes(id);

/** Clase de respuesta a heladas: catálogo §10 (tolerancia 1-5) para los originales; perfil con fuente para los nuevos. */
type ClaseHelada = 'sensible' | 'moderada' | 'tolera_helada_leve' | 'tolerante' | 'desconocida';
function claseHelada(cultivo: CultivoCalendario, perfil: PerfilAgronomico): ClaseHelada {
  if (cultivo.toleranciaHelada !== null) return cultivo.toleranciaHelada <= 1 ? 'sensible' : cultivo.toleranciaHelada === 2 ? 'moderada' : 'tolerante';
  return perfil.respuesta_helada ?? 'desconocida';
}

interface Contexto { terreno: TerrenoCalendario; meses: Map<number, MesNormalizado>; escenario: EscenarioCalendario; elevacionCeldaM: number | null; lluviaAnual: number | null }
type Riesgo = 'bajo' | 'medio' | 'alto';
/**
 * Indicador preventivo del calendario: mínima regional ajustada una sola vez a la altitud del terreno.
 * No sumar además el escalón regional de 3400 m. La climatología no mide noches extremas ni garantiza
 * ausencia de heladas; la vista de clima conserva su indicador regional, identificado como tal.
 */
function riesgoHeladaMes(mes: number, contexto: Contexto): { riesgo: Riesgo | null; ajustado: boolean } {
  const clima = contexto.meses.get(mes); const general = clima?.riesgo_helada ?? null;
  const altitud = contexto.terreno.altitudM; const elevacion = contexto.elevacionCeldaM;
  if (general === null || clima?.t_min == null || altitud === null || elevacion === null) return { riesgo: general, ajustado: false };
  const ajustado = calcularRiesgoHelada(clima.t_min - GRADIENTE_TEMPERATURA_MINIMA_C_POR_KM * (altitud - elevacion) / 1000, null);
  if (ajustado === null) return { riesgo: general, ajustado: false };
  return { riesgo: ajustado, ajustado: true };
}

function evaluarEpoca(cultivo: CultivoCalendario, perfil: PerfilAgronomico, mes: number): Factor {
  if (cultivo.mesesSiembra.length === 0) return { criterio: 'epoca', efecto: 'informativo', breve: 'sin época documentada',
    texto: 'Las fuentes consultadas no indican una época de siembra para la sierra; se evalúa solo con clima, altitud y agua.' };
  if (cultivo.mesesSiembra.includes(mes)) return { criterio: 'epoca', efecto: 'favorable', breve: 'dentro de la época',
    texto: !esOriginal(cultivo.id) && perfil.siembra_todo_el_anio_iniap ? `INIAP (2011) indica que las hortalizas pueden sembrarse durante todo el año; se recomiendan siembras escalonadas.`
      : `${nombreMes(mes)} pertenece a la época referencial del catálogo del proyecto (${listaMeses(cultivo.mesesSiembra)}).` };
  return { criterio: 'epoca', efecto: 'informativo', breve: 'fuera de la época referencial',
    texto: `${nombreMes(mes)} está fuera de la época referencial del catálogo del proyecto (${listaMeses(cultivo.mesesSiembra)}). Esa época no está validada localmente y no excluye la siembra por sí sola; confirme la época con un técnico.` };
}

function altitudDentro(cultivo: CultivoCalendario, perfil: PerfilAgronomico, altitud: number): boolean | null {
  const rango = cultivo.altitudMin !== null && cultivo.altitudMax !== null ? { min: cultivo.altitudMin, max: cultivo.altitudMax } : perfil.altitud_documentada_m;
  return rango ? altitud >= rango.min && altitud <= rango.max : null;
}
function evaluarAltitud(cultivo: CultivoCalendario, perfil: PerfilAgronomico, altitud: number | null): Factor {
  if (altitud === null) return { criterio: 'altitud', efecto: 'indeterminado', breve: 'altitud del terreno desconocida', texto: 'Altitud del terreno desconocida: no se puede comparar con el cultivo ni estimar su temperatura.' };
  const delCatalogo = cultivo.altitudMin !== null && cultivo.altitudMax !== null;
  const rango = delCatalogo ? { min: cultivo.altitudMin ?? 0, max: cultivo.altitudMax ?? 0 } : perfil.altitud_documentada_m;
  if (!rango) return { criterio: 'altitud', efecto: 'informativo', breve: 'sin rango de altitud documentado', texto: `Altitud estimada del terreno: ${altitud} m. No hay un rango de altitud documentado para este cultivo en Ecuador; se usa la temperatura estimada para esa altitud.` };
  const origen = delCatalogo ? 'rango referencial del catálogo del proyecto' : `rango documentado (${citar(perfil.fuente_altitud ?? 'naranjo_melloco_2018')})`;
  const dentro = altitud >= rango.min && altitud <= rango.max;
  return dentro ? { criterio: 'altitud', efecto: 'favorable', breve: 'altitud dentro del rango', texto: `Altitud estimada del terreno: ${altitud} m, dentro del ${origen}: ${rango.min}-${rango.max} m.` }
    : { criterio: 'altitud', efecto: 'informativo', breve: 'altitud fuera del rango referencial', texto: `Altitud estimada del terreno: ${altitud} m, fuera del ${origen}: ${rango.min}-${rango.max} m. Ese rango no es un límite validado; la temperatura decide si hay una incompatibilidad.` };
}

function mesesDelCiclo(mesSiembra: number, cantidad: number): number[] { return Array.from({ length: Math.min(12, cantidad) }, (_valor, desplazamiento) => (mesSiembra - 1 + desplazamiento) % 12 + 1); }

function evaluarTemperatura(cultivo: CultivoCalendario, perfil: PerfilAgronomico, ciclo: number[], contexto: Contexto): Factor {
  const rango = perfil.temperatura;
  if (!rango) return { criterio: 'temperatura', efecto: 'indeterminado', breve: 'rango de temperatura sin fuente', texto: 'No hay un rango de temperatura con fuente para este cultivo.' };
  const altitud = contexto.terreno.altitudM;
  if (altitud === null) return { criterio: 'temperatura', efecto: 'indeterminado', breve: 'altitud desconocida', texto: 'Sin altitud del terreno no se estima su temperatura media.' };
  const ajuste = contexto.elevacionCeldaM === null ? null : -GRADIENTE_TEMPERATURA_MEDIA_C_POR_KM * (altitud - contexto.elevacionCeldaM) / 1000;
  if (ajuste === null) return { criterio: 'temperatura', efecto: 'indeterminado', breve: 'falta la altitud de la celda NASA', texto: 'La fuente climática no informa la altitud de su cuadrícula: falta ese dato para estimar la temperatura del terreno. No se ha comprobado una incompatibilidad térmica; falta información.' };
  const valores: { mes: number; temperatura: number }[] = [];
  for (const mes of ciclo) {
    const clima = contexto.meses.get(mes);
    const media = clima?.t_med ?? (clima?.t_min != null && clima.t_max != null ? (clima.t_min + clima.t_max) / 2 : null);
    if (media === null || media === undefined) return { criterio: 'temperatura', efecto: 'indeterminado', breve: 'temperatura NASA sin dato', texto: `Temperatura media NASA sin dato válido en ${nombreMes(mes)}: no se evalúa el ciclo completo.` };
    valores.push({ mes, temperatura: media + (ajuste ?? 0) });
  }
  const fuera = valores.filter((valor) => valor.temperatura < rango.minima || valor.temperatura > rango.maxima);
  const bajoOptimo = valores.filter((valor) => valor.temperatura < rango.optima_min);
  const minimaCiclo = Math.min(...valores.map((valor) => valor.temperatura)); const maximaCiclo = Math.max(...valores.map((valor) => valor.temperatura));
  const descripcionAjuste = `ajustada de la celda NASA (${mostrarNumero(contexto.elevacionCeldaM ?? 0, 0)} m) a ${altitud} m con ${mostrarNumero(GRADIENTE_TEMPERATURA_MEDIA_C_POR_KM)} °C/km (Córdova et al., 2016): ${ajuste >= 0 ? '+' : ''}${mostrarNumero(ajuste)} °C`;
  const datos = `Temperatura media estimada del ciclo: ${mostrarNumero(minimaCiclo)} a ${mostrarNumero(maximaCiclo)} °C (${descripcionAjuste}). Rango de crecimiento EcoCrop: ${rango.minima}-${rango.maxima} °C; óptimo ${rango.optima_min}-${rango.optima_max} °C.`;
  if (fuera.length) {
    const texto = `${datos} Fuera del rango en: ${fuera.map((valor) => `${nombreMes(valor.mes)} (${mostrarNumero(valor.temperatura)} °C)`).join(', ')}.`;
    const localAdmite = altitudDentro(cultivo, perfil, altitud) === true;
    if (localAdmite) return { criterio: 'temperatura', efecto: 'indeterminado', breve: 'fuentes de temperatura y altitud no coinciden',
      texto: `${texto} El rango de altitud local admite el cultivo, pero el rango genérico de EcoCrop no: las fuentes no coinciden. Verifique una variedad adaptada a esta altitud.` };
    return { criterio: 'temperatura', efecto: 'excluye', breve: minimaCiclo < rango.minima ? 'demasiado frío para el cultivo' : 'demasiado calor para el cultivo',
      texto: `${texto} Un cultivo no se desarrolla bien con temperatura media fuera de su rango documentado.` };
  }
  const nota = bajoOptimo.length ? ` Por debajo del óptimo en ${bajoOptimo.length} de ${valores.length} meses: el crecimiento es más lento y el ciclo puede acercarse a su duración máxima.` : ' Dentro del óptimo todo el ciclo.';
  return { criterio: 'temperatura', efecto: 'favorable', breve: 'temperatura adecuada',
    texto: `${datos}${nota}` };
}

function evaluarHelada(cultivo: CultivoCalendario, perfil: PerfilAgronomico, ciclo: number[], contexto: Contexto): Factor {
  const clase = claseHelada(cultivo, perfil);
  const riesgos = ciclo.map((mes) => ({ mes, ...riesgoHeladaMes(mes, contexto) }));
  const algunoAjustado = riesgos.some((valor) => valor.ajustado);
  const detalle = `Riesgo de helada en los ${ciclo.length} meses del ciclo: ${riesgos.map((valor) => `${nombreMes(valor.mes)} ${valor.riesgo ?? 'sin dato'}`).join('; ')}. Indicador preventivo con la mínima promedio NASA (T2M_MIN)${algunoAjustado ? ', ajustada una sola vez a la altitud del terreno (5,5 °C/km, Córdova et al., 2016)' : ''}; no son heladas observadas ni temperaturas extremas nocturnas.`;
  const origenClase = perfil.fuente_helada && cultivo.toleranciaHelada === null ? `${citar(perfil.fuente_helada)}: ${clase === 'tolera_helada_leve' ? 'tolera heladas leves; no implica resistencia a heladas fuertes ni valida la variedad local' : 'puede sufrir daño cerca de 0 °C'}.`
    : clase === 'desconocida' ? 'No hay una fuente verificada sobre su tolerancia a heladas; sembrar todo el año no demuestra resistencia al frío.'
      : `Tolerancia a heladas del catálogo del proyecto: ${cultivo.toleranciaHelada}/5 (referencial).`;
  const hayAlto = riesgos.some((valor) => valor.riesgo === 'alto'); const hayMedio = riesgos.some((valor) => valor.riesgo === 'medio');
  const sinDato = riesgos.some((valor) => valor.riesgo === null);
  const mesesAlto = riesgos.filter((valor) => valor.riesgo === 'alto').map((valor) => nombreMes(valor.mes)).join(', ');
  const texto = (conclusion: string) => `${detalle} ${origenClase} ${conclusion}`;
  if (sinDato) return { criterio: 'helada', efecto: 'indeterminado', breve: 'riesgo de helada sin dato', texto: texto('Falta el riesgo de algún mes del ciclo; la tolerancia no sustituye el dato climático.') };
  if (clase === 'sensible') {
    if (hayAlto) return { criterio: 'helada', efecto: 'excluye', breve: 'heladas probables en un cultivo sensible', texto: texto(`Cultivo sensible con riesgo alto en ${mesesAlto}: no se recomienda.`) };
    if (hayMedio) return { criterio: 'helada', efecto: 'precaucion', breve: 'riesgo medio de helada', texto: texto('Cultivo sensible con riesgo medio: precaución.') };
  } else if (clase === 'moderada') {
    if (hayAlto || hayMedio) return { criterio: 'helada', efecto: 'precaucion', breve: hayAlto ? 'riesgo alto de helada en el ciclo' : 'riesgo medio de helada',
      texto: texto(hayAlto ? `Riesgo alto en ${mesesAlto}: posible daño; se puede sembrar con precaución (variedad, época y protección).` : 'Riesgo medio: precaución.') };
  } else if (clase === 'tolera_helada_leve') {
    if (hayAlto) return { criterio: 'helada', efecto: 'precaucion', breve: 'riesgo alto de helada en el ciclo', texto: texto(`Riesgo alto en ${mesesAlto}: proteja el cultivo o elija otro mes.`) };
    if (hayMedio) return { criterio: 'helada', efecto: 'informativo', breve: 'riesgo medio de helada', texto: texto('Indicador medio: vigilar las noches frías; la tolerancia documentada a heladas leves no demuestra un daño en estas condiciones.') };
  } else if (clase === 'tolerante') {
    if (hayAlto || sinDato) return { criterio: 'helada', efecto: 'informativo', breve: 'vigilar heladas fuertes', texto: texto('El catálogo lo considera tolerante; vigilar heladas fuertes.') };
  } else {
    if (hayAlto) return { criterio: 'helada', efecto: 'indeterminado', breve: 'no se sabe cuánto resiste las heladas', texto: texto(`Hay riesgo alto en ${mesesAlto} y no se conoce cuánto resiste el cultivo: no se determina.`) };
    if (hayMedio) return { criterio: 'helada', efecto: 'indeterminado', breve: 'no se sabe cuánto resiste las heladas', texto: texto('Indicador de frío medio con tolerancia desconocida: falta información esencial para evaluar el daño.') };
  }
  return { criterio: 'helada', efecto: 'favorable', breve: 'riesgo de helada bajo', texto: texto(hayMedio ? 'El riesgo medio no limita a este cultivo según su tolerancia referencial.' : 'Riesgo bajo en todo el ciclo.') };
}

function lluviaDelCiclo(ciclo: number[], dias: number, meses: Map<number, MesNormalizado>): number | null {
  let total = 0; let restante = dias / DIAS_POR_MES;
  for (const mes of ciclo) {
    const lluvia = meses.get(mes)?.lluvia_mm; if (lluvia === null || lluvia === undefined) return null;
    total += lluvia * Math.min(1, restante); restante -= 1; if (restante <= 0) break;
  }
  return total;
}
function evaluarAgua(cultivo: CultivoCalendario, perfil: PerfilAgronomico, ciclo: number[], dias: number, contexto: Contexto): Factor[] {
  const riego = contexto.terreno.tieneRiego;
  const factores: Factor[] = [];
  const anual = contexto.lluviaAnual; const ecocrop = perfil.lluvia_anual_mm;
  if (anual !== null && ecocrop && anual > ecocrop.optima_max) factores.push({ criterio: 'agua', efecto: 'informativo', breve: 'zona lluviosa',
    texto: `Lluvia anual de la zona (NASA): ${mostrarNumero(anual, 0)} mm, por encima del óptimo anual de EcoCrop (${ecocrop.optima_min}-${ecocrop.optima_max} mm${anual > ecocrop.maxima ? `; supera también su máximo de ${ecocrop.maxima} mm` : ''}). Vigile drenaje y enfermedades por humedad.` });
  if (perfil.requiere_agua_permanente) {
    factores.unshift({ criterio: 'agua', efecto: 'indeterminado', breve: 'no se ha confirmado agua permanente', texto: 'Necesita agua corriente o suelo saturado durante todo el ciclo (EcoCrop). Declarar riego no confirma esa disponibilidad ni la calidad del agua; no declarar riego tampoco descarta un manantial o suelo saturado. Falta confirmar esa condición: no se determina la siembra con el dato actual.' });
    return factores;
  }
  if (riego === true) {
    factores.unshift({ criterio: 'agua', efecto: 'favorable', breve: 'con riego', texto: `El terreno declara riego: cubre el criterio de agua${perfil.riego_en_manejo_iniap ? ', como recomienda INIAP (2011) durante todo el cultivo de hortalizas' : ''}. No se calcula caudal ni volumen: verifique que alcance.` });
    return factores;
  }
  const lluvia = lluviaDelCiclo(ciclo, dias, contexto.meses);
  if (lluvia === null) { factores.unshift({ criterio: 'agua', efecto: 'indeterminado', breve: 'lluvia NASA sin dato', texto: 'Falta la lluvia NASA de algún mes del ciclo y el terreno no declara riego.' }); return factores; }
  const sinRiego = riego === false ? 'el terreno declara que no tiene riego' : 'no se conoce si el terreno tiene riego';
  const necesidad = perfil.necesidad_agua_ciclo_mm;
  if (necesidad) {
    const base = `Lluvia promedio del ciclo (${ciclo.length} meses, NASA): ${mostrarNumero(lluvia, 0)} mm. Necesidad de agua del cultivo según FAO (1986, Tabla 14): ${necesidad.min}-${necesidad.max} mm por ciclo; sensibilidad a la sequía ${perfil.sensibilidad_sequia ?? 'sin dato'}.`;
    if (lluvia >= necesidad.max) factores.unshift({ criterio: 'agua', efecto: 'favorable', breve: 'lluvia suficiente', texto: `${base} La lluvia promedio cubre la necesidad máxima (${sinRiego}); en años secos puede faltar.` });
    else if (lluvia >= necesidad.min) factores.unshift({ criterio: 'agua', efecto: 'precaucion', breve: 'lluvia justa para el ciclo', texto: `${base} Cubre el mínimo, no el máximo, y ${sinRiego}: posible falta de agua.` });
    else factores.unshift(riego === false ? { criterio: 'agua', efecto: 'excluye', breve: 'lluvia insuficiente sin riego', texto: `${base} No alcanza el mínimo y ${sinRiego}.` }
      : { criterio: 'agua', efecto: 'indeterminado', breve: 'no se sabe si el terreno tiene riego', texto: `${base} No alcanza el mínimo y ${sinRiego}.` });
    return factores;
  }
  if (cultivo.lluviaMinMensualMm !== null) {
    const minimo = cultivo.lluviaMinMensualMm;
    const faltan = ciclo.filter((mes) => (contexto.meses.get(mes)?.lluvia_mm ?? 0) < minimo);
    const base = `Lluvia mensual NASA en el ciclo frente al mínimo referencial del catálogo (${minimo} mm/mes):`;
    if (!faltan.length) factores.unshift({ criterio: 'agua', efecto: 'favorable', breve: 'lluvia suficiente', texto: `${base} alcanza el mínimo todos los meses (${sinRiego}).` });
    else factores.unshift(riego === false ? { criterio: 'agua', efecto: 'precaucion', breve: 'meses secos en el ciclo', texto: `${base} no lo alcanza en ${faltan.map(nombreMes).join(', ')} y ${sinRiego}.` }
      : { criterio: 'agua', efecto: 'indeterminado', breve: 'no se sabe si el terreno tiene riego', texto: `${base} no lo alcanza en ${faltan.map(nombreMes).join(', ')} y ${sinRiego}.` });
    if (cultivo.id === 'brocoli') factores.push({ criterio: 'agua', efecto: 'informativo', breve: 'planteado con riego', texto: 'El catálogo del proyecto planteó el brócoli con riego; sin riego dependa solo de la lluvia con precaución.' });
    return factores;
  }
  factores.unshift({ criterio: 'agua', efecto: 'indeterminado', breve: perfil.riego_en_manejo_iniap ? 'no se sabe cuánta agua necesita sin riego' : 'no se sabe cuánta agua necesita',
    texto: `${perfil.riego_en_manejo_iniap ? 'INIAP (2011) maneja esta hortaliza con riego durante todo el cultivo. ' : ''}No hay una necesidad de agua por ciclo con fuente para compararla con la lluvia (${mostrarNumero(lluvia, 0)} mm en el ciclo) y ${sinRiego}.` });
  return factores;
}

function decidir(factores: Factor[]): EstadoCalendario {
  if (factores.some((factor) => factor.efecto === 'excluye')) return 'no_recomendado';
  if (factores.some((factor) => factor.efecto === 'indeterminado')) return 'no_determinado';
  if (factores.some((factor) => factor.efecto === 'precaucion')) return 'posible_con_cuidado';
  return 'recomendado';
}
function resumir(estado: EstadoCalendario, factores: Factor[], nombre: string, mes: number): string {
  const de = (efecto: Efecto) => [...new Set(factores.filter((factor) => factor.efecto === efecto).map((factor) => factor.breve))].join('; ');
  if (estado === 'no_recomendado') return `No se recomienda sembrar ${nombre} en ${nombreMes(mes)}: ${de('excluye')}.`;
  if (estado === 'no_determinado') return `No se puede determinar para ${nombre} en ${nombreMes(mes)}: ${de('indeterminado')}.`;
  if (estado === 'posible_con_cuidado') return `${nombre} puede sembrarse en ${nombreMes(mes)} con precaución: ${de('precaucion')}.`;
  return `Las condiciones evaluadas favorecen sembrar ${nombre} en ${nombreMes(mes)}; confirme la variedad y el manejo local.`;
}

export function calcularCalendario(entrada: unknown): CeldaCalendario[] {
  const lectura = esquemaEntrada.safeParse(entrada); if (!lectura.success) throw new ErrorCalendario();
  const { terreno, cultivos, mensual, escenario, elevacionCeldaM } = lectura.data;
  const meses = new Map(aplicarEscenarioCalendario(mensual, terreno.altitudM, escenario).map((mes) => [mes.mes, mes]));
  const lluviasAnuales = Array.from({ length: 12 }, (_valor, indice) => meses.get(indice + 1)?.lluvia_mm ?? null);
  const lluviaAnual = lluviasAnuales.every((valor) => valor !== null) ? lluviasAnuales.reduce<number>((suma, valor) => suma + (valor ?? 0), 0) : null;
  const contexto: Contexto = { terreno, meses, escenario, elevacionCeldaM, lluviaAnual };
  return [...cultivos].sort((primero, segundo) => primero.id.localeCompare(segundo.id, 'es')).flatMap((cultivo) => {
    const perfil = obtenerPerfil(cultivo.id); if (!perfil) throw new ErrorCalendario();
    const dias = esOriginal(cultivo.id) ? cultivo.cicloMeses * DIAS_POR_MES : perfil.ciclo_dias.max;
    return Array.from({ length: 12 }, (_valor, indice): CeldaCalendario => {
      const mes = indice + 1; const ciclo = mesesDelCiclo(mes, cultivo.cicloMeses);
      const factores: Factor[] = [evaluarEpoca(cultivo, perfil, mes), evaluarAltitud(cultivo, perfil, terreno.altitudM),
        evaluarTemperatura(cultivo, perfil, ciclo, contexto), evaluarHelada(cultivo, perfil, ciclo, contexto), ...evaluarAgua(cultivo, perfil, ciclo, dias, contexto)];
      const estado = decidir(factores);
      const cicloTexto = esOriginal(cultivo.id) ? `${cultivo.cicloMeses} meses según el catálogo del proyecto (FAO/EcoCrop: ${perfil.ciclo_dias.min}-${perfil.ciclo_dias.max} días en otros climas)`
        : `${perfil.ciclo_dias.min}-${perfil.ciclo_dias.max} días (${citar(perfil.fuente_ciclo)}); se evalúan ${cultivo.cicloMeses} meses porque en clima frío el ciclo se alarga`;
      const acciones = estado === 'recomendado' ? [] : estado === 'no_recomendado' ? ['revisa otros meses u otros cultivos con resultado recomendado o posible']
        : [...new Set(factores.filter((factor) => factor.efecto === (estado === 'no_determinado' ? 'indeterminado' : 'precaucion')).flatMap((factor) => ACCIONES[factor.breve] ?? []))];
      const lineas = [resumir(estado, factores, perfil.nombre, mes),
        ...factores.map((factor) => `• ${ETIQUETA_CRITERIO[factor.criterio]}: ${factor.texto}`),
        ...(acciones.length ? [`• Qué puedes hacer: ${acciones.map((accion, indice) => indice === 0 ? accion.charAt(0).toUpperCase() + accion.slice(1) : accion).join('; ')}.`] : []),
        `• Ciclo: ${cicloTexto}. Meses evaluados: ${listaMeses(ciclo)}.${perfil.establecimiento === 'trasplante' ? ' Cultivo de trasplante (INIAP 2011): el mes indica el trasplante al terreno; el semillero se prepara unas semanas antes.' : perfil.establecimiento === 'siembra_directa' ? ' Siembra directa en el terreno (INIAP 2011).' : ''}`];
      if (escenario.lluviaPct !== 0 || escenario.tempDelta !== 0) lineas.push(`• Escenario hipotético aplicado, no observación NASA: lluvia ${mostrarNumero(escenario.lluviaPct, 6)} % y temperatura ${mostrarNumero(escenario.tempDelta, 6)} °C; no modifica los datos base.`);
      lineas.push(`Fuentes agronómicas: ${citar(...perfil.fuentes)}. NASA describe una zona y un periodo histórico, no el microclima del lote ni el tiempo futuro; NASA no evalúa cultivos. Los parámetros son referenciales y están pendientes de validación local.`);
      return { cultivo_id: cultivo.id, mes, estado, resumen: lineas[0] ?? '', motivo: lineas.join('\n') };
    });
  });
}

/** Metadatos públicos de cada cultivo evaluado, para agrupar, filtrar y explicar en la interfaz y el PDF. */
export function describirCultivos(cultivos: CultivoCalendario[]) {
  return [...cultivos].sort((primero, segundo) => primero.id.localeCompare(segundo.id, 'es')).map((cultivo) => {
    const perfil = obtenerPerfil(cultivo.id); if (!perfil) throw new ErrorCalendario();
    const original = esOriginal(cultivo.id);
    const cicloDias = original ? { min: Math.round(cultivo.cicloMeses * DIAS_POR_MES), max: Math.round(cultivo.cicloMeses * DIAS_POR_MES) } : perfil.ciclo_dias;
    return { id: cultivo.id, nombre: cultivo.nombre, altitud_min: cultivo.altitudMin, altitud_max: cultivo.altitudMax,
      nombre_cientifico: perfil.nombre_cientifico, nota_denominacion: perfil.nota_denominacion, familia_botanica: perfil.familia_botanica,
      categoria: perfil.categoria, categoria_nombre: CATEGORIAS_CULTIVO[perfil.categoria].nombre, es_hortaliza: CATEGORIAS_CULTIVO[perfil.categoria].es_hortaliza,
      ciclo_dias_min: cicloDias.min, ciclo_dias_max: cicloDias.max, ciclo_meses_evaluados: cultivo.cicloMeses, ciclo_corto: cicloDias.max <= CICLO_CORTO_MAX_DIAS,
      establecimiento: perfil.establecimiento, cosecha: perfil.cosecha, origen: original ? 'catalogo_original' as const : 'ampliacion_2026' as const,
      fuentes: perfil.fuentes.map((clave) => ({ cita: FUENTES_AGRONOMICAS[clave].cita, referencia: FUENTES_AGRONOMICAS[clave].referencia, url: FUENTES_AGRONOMICAS[clave].url })),
      consideraciones_rotacion: perfil.consideraciones_rotacion, pendientes: perfil.pendientes };
  });
}

export function validarConsultaCalendario(entrada: unknown): EscenarioCalendario {
  const textoNumero = z.string().max(32).regex(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/).transform(Number);
  const lectura = z.strictObject({ lluvia_pct: textoNumero.optional(), temp_delta: textoNumero.optional() }).safeParse(entrada);
  if (!lectura.success) throw new Error('Indica solo lluvia_pct entre -30 y 30 y temp_delta entre -2 y 2, con números decimales válidos.');
  const escenario = esquemaEscenarioCalendario.safeParse({ lluviaPct: lectura.data.lluvia_pct ?? 0, tempDelta: lectura.data.temp_delta ?? 0 });
  if (!escenario.success) throw new Error('lluvia_pct debe estar entre -30 y 30; temp_delta, entre -2 y 2.');
  return escenario.data;
}
