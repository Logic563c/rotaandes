import { z } from 'zod';
import { calcularRiesgoHelada } from './nasaPower.js';

export const IDS_CULTIVOS_CALENDARIO = ['papa', 'haba', 'chocho', 'quinua', 'cebada', 'maiz', 'avena', 'brocoli', 'oca', 'vicia_avena'] as const;
export const MESES_CALENDARIO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export class ErrorCalendario extends Error { constructor() { super('No se puede calcular el calendario con los datos disponibles. Revisa el catálogo y la información climática.'); } }
const numero = z.number().finite();
export const esquemaEscenarioCalendario = z.strictObject({ lluviaPct: numero.min(-30).max(30), tempDelta: numero.min(-2).max(2) });
export type EscenarioCalendario = z.infer<typeof esquemaEscenarioCalendario>;
const esquemaCultivo = z.object({
  id: z.enum(IDS_CULTIVOS_CALENDARIO), nombre: z.string().min(1), altitudMin: numero.int(), altitudMax: numero.int(),
  mesesSiembra: z.array(numero.int().min(1).max(12)).min(1).max(12).refine((meses) => new Set(meses).size === meses.length),
  lluviaMinMensualMm: numero.min(0), toleranciaHelada: numero.int().min(1).max(5),
}).refine((cultivo) => cultivo.altitudMin <= cultivo.altitudMax);
export const esquemaCultivosCalendario = z.array(esquemaCultivo).min(1).max(10).refine((cultivos) => new Set(cultivos.map((cultivo) => cultivo.id)).size === cultivos.length);
const esquemaMes = z.object({ mes: numero.int().min(1).max(12), t_min: numero.min(-100).max(70).nullable().default(null), t_max: numero.min(-100).max(70).nullable().default(null),
  lluvia_mm: numero.min(0).max(62000).nullable().default(null), riesgo_helada: z.enum(['bajo', 'medio', 'alto']).nullable().default(null) })
  .refine((mes) => mes.t_min === null || mes.t_max === null || mes.t_min <= mes.t_max);
const esquemaEntrada = z.object({
  terreno: z.object({ altitudM: numero.int().min(-12000).max(9000).nullable(), tieneRiego: z.boolean().nullable(), areaHa: numero.positive().max(999999.99).nullable() }),
  cultivos: esquemaCultivosCalendario,
  mensual: z.array(esquemaMes).max(12).refine((meses) => new Set(meses.map((mes) => mes.mes)).size === meses.length),
  escenario: esquemaEscenarioCalendario.default({ lluviaPct: 0, tempDelta: 0 }),
});
export type TerrenoCalendario = z.infer<typeof esquemaEntrada>['terreno'];
export type MesCalendario = z.infer<typeof esquemaMes>;
export type EstadoCalendario = 'recomendado' | 'posible_con_cuidado' | 'no_recomendado' | 'no_determinado';
export interface CeldaCalendario { cultivo_id: string; mes: number; estado: EstadoCalendario; motivo: string }

export function aplicarEscenarioCalendario(mensual: MesCalendario[], altitudM: number | null, escenario: EscenarioCalendario): MesCalendario[] {
  const validado = esquemaEscenarioCalendario.safeParse(escenario); if (!validado.success) throw new ErrorCalendario();
  return mensual.map((mes) => {
    const minima = mes.t_min === null ? null : mes.t_min + escenario.tempDelta;
    return { ...mes, t_min: minima, t_max: mes.t_max === null ? null : mes.t_max + escenario.tempDelta,
      lluvia_mm: mes.lluvia_mm === null ? null : mes.lluvia_mm * (1 + escenario.lluviaPct / 100),
      riesgo_helada: mes.riesgo_helada === null ? null : calcularRiesgoHelada(minima, altitudM) };
  });
}
function mostrarNumero(valor: number): string { return valor.toLocaleString('es-EC', { maximumFractionDigits: 6 }); }

export function calcularCalendario(entrada: unknown): CeldaCalendario[] {
  const lectura = esquemaEntrada.safeParse(entrada); if (!lectura.success) throw new ErrorCalendario();
  const { terreno, cultivos, mensual, escenario } = lectura.data;
  const meses = new Map(aplicarEscenarioCalendario(mensual, terreno.altitudM, escenario).map((mes) => [mes.mes, mes]));
  return [...cultivos].sort((primero, segundo) => primero.id.localeCompare(segundo.id, 'es')).flatMap((cultivo) => Array.from({ length: 12 }, (_valor, indice): CeldaCalendario => {
    const mes = indice + 1; const clima = meses.get(mes); const ventana = cultivo.mesesSiembra.includes(mes); const sensible = cultivo.toleranciaHelada <= 2;
    const trimestre = Array.from({ length: 3 }, (_valor, desplazamiento) => (indice + desplazamiento) % 12 + 1);
    const riesgos = trimestre.map((numeroMes) => ({ mes: numeroMes, riesgo: meses.get(numeroMes)?.riesgo_helada ?? null }));
    const lluvia = clima?.lluvia_mm ?? null;
    const altitudFuera = terreno.altitudM !== null && (terreno.altitudM < cultivo.altitudMin || terreno.altitudM > cultivo.altitudMax);
    const heladaAlta = sensible && riesgos.some((riesgo) => riesgo.riesgo === 'alto');
    const aguaSuficiente = terreno.tieneRiego === true || (lluvia !== null && lluvia >= cultivo.lluviaMinMensualMm);
    const aguaDesconocida = !aguaSuficiente && (lluvia === null || terreno.tieneRiego === null);
    const faltaRiegoBrocoli = cultivo.id === 'brocoli' && terreno.tieneRiego === false;
    const faltaEsencial = terreno.altitudM === null || aguaDesconocida || (cultivo.id === 'brocoli' && terreno.tieneRiego === null) || (sensible && riesgos.some((riesgo) => riesgo.riesgo === null));
    let estado: EstadoCalendario;
    if (!ventana || altitudFuera || heladaAlta || faltaRiegoBrocoli) estado = 'no_recomendado';
    else if (faltaEsencial) estado = 'no_determinado';
    else if (!aguaSuficiente || (sensible && riesgos.some((riesgo) => riesgo.riesgo === 'medio'))) estado = 'posible_con_cuidado';
    else estado = 'recomendado';
    const razones = [
      `${cultivo.nombre}: ${MESES_CALENDARIO[indice]} ${ventana ? 'pertenece' : 'no pertenece'} a su ventana referencial (${cultivo.mesesSiembra.map((numeroMes) => MESES_CALENDARIO[numeroMes - 1]).join(', ')}).`,
      terreno.altitudM === null ? `Altitud del terreno desconocida: no se puede confirmar compatibilidad con ${cultivo.altitudMin}–${cultivo.altitudMax} m del catálogo.`
        : `Altitud estimada del terreno: ${terreno.altitudM} m; ${altitudFuera ? 'fuera' : 'dentro'} del rango referencial ${cultivo.altitudMin}–${cultivo.altitudMax} m.`,
      lluvia === null ? `Lluvia NASA del mes sin dato válido; mínimo referencial del catálogo: ${cultivo.lluviaMinMensualMm} mm/mes.`
        : `Lluvia mensual estimada a partir de NASA: ${mostrarNumero(lluvia)} mm; mínimo referencial del catálogo: ${cultivo.lluviaMinMensualMm} mm/mes (${lluvia >= cultivo.lluviaMinMensualMm ? 'alcanza' : 'no alcanza'} el mínimo).`,
      terreno.tieneRiego === true ? 'El terreno declara riego: satisface el criterio de agua de esta regla, sin garantizar volumen o disponibilidad real.' : terreno.tieneRiego === false ? 'El terreno declara que no tiene riego.' : 'No se conoce la condición de riego.',
      `Riesgo de helada heurístico de ${riesgos.map((riesgo) => `${MESES_CALENDARIO[riesgo.mes - 1]}: ${riesgo.riesgo ?? 'sin dato'}`).join('; ')}. Tolerancia referencial: ${cultivo.toleranciaHelada}/5. ${sensible ? 'Cultivo sensible: se exige riesgo bajo en los tres meses para recomendar; riesgo alto en cualquiera excluye la siembra.' : 'La regla original no exige riesgo bajo para tolerancia mayor que 2; esto no garantiza resistencia a heladas.'}`,
    ];
    if (cultivo.id === 'brocoli') razones.push('La ventana anual de brócoli está condicionada a riego confirmado; lluvia suficiente no sustituye esa condición del catálogo.');
    if (cultivo.id === 'vicia_avena') razones.push('Se conserva el cultivo combinado Vicia + avena (abono verde), con los valores referenciales del catálogo.');
    if (escenario.lluviaPct !== 0 || escenario.tempDelta !== 0) razones.push(`Escenario hipotético aplicado, no observación NASA: lluvia ${mostrarNumero(escenario.lluviaPct)} % y temperatura ${mostrarNumero(escenario.tempDelta)} °C; no modifica los datos base.`);
    razones.push(estado === 'no_determinado' ? 'Faltan datos esenciales: no se determina la recomendación.' : estado === 'posible_con_cuidado' ? 'Cumplimiento parcial: verificar agua disponible y/o riesgo medio antes de decidir.' : estado === 'no_recomendado' ? 'Existe al menos una exclusión comprobada; no se recomienda en estas condiciones referenciales.' : 'Cumple las condiciones de la regla referencial; no es una garantía agronómica.');
    razones.push('NASA describe una zona y un periodo histórico, no el microclima del lote ni el tiempo futuro. Los umbrales agronómicos son referenciales, pendientes de validación local.');
    return { cultivo_id: cultivo.id, mes, estado, motivo: razones.join(' ') };
  }));
}

export function validarConsultaCalendario(entrada: unknown): EscenarioCalendario {
  const textoNumero = z.string().max(32).regex(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/).transform(Number);
  const lectura = z.strictObject({ lluvia_pct: textoNumero.optional(), temp_delta: textoNumero.optional() }).safeParse(entrada);
  if (!lectura.success) throw new Error('Indica solo lluvia_pct entre -30 y 30 y temp_delta entre -2 y 2, con números decimales válidos.');
  const escenario = esquemaEscenarioCalendario.safeParse({ lluviaPct: lectura.data.lluvia_pct ?? 0, tempDelta: lectura.data.temp_delta ?? 0 });
  if (!escenario.success) throw new Error('lluvia_pct debe estar entre -30 y 30; temp_delta, entre -2 y 2.');
  return escenario.data;
}
