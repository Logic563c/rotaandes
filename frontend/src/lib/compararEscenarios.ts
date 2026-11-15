import type { RespuestaCalendario, RespuestaRotaciones, EstrategiaRotacion, EstadoCalendario } from '../types/api';

export interface ResultadosEscenario { calendario: RespuestaCalendario; rotaciones: RespuestaRotaciones }
export const MESES_ESCENARIO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const ESTADOS_ESCENARIO: Record<EstadoCalendario, { texto: string; simbolo: string; estilo: string }> = {
  recomendado: { texto: 'Recomendado', simbolo: '✓', estilo: 'border-cultivo/50 bg-cultivo-claro text-[#1f5a2f]' },
  posible_con_cuidado: { texto: 'Posible con precaución', simbolo: '!', estilo: 'border-maiz bg-maiz-claro text-maiz-oscuro' },
  no_recomendado: { texto: 'No recomendado', simbolo: '×', estilo: 'border-arcilla/40 bg-arcilla-claro text-[#85391f]' },
  no_determinado: { texto: 'No determinado', simbolo: '?', estilo: 'border-stone-400 bg-stone-100 text-stone-700' },
};
export const INDICADORES_ESCENARIO = [{ clave: 'agua', nombre: 'Agua' }, { clave: 'suelo', nombre: 'Suelo' }, { clave: 'riesgo', nombre: 'Compatibilidad climática' }, { clave: 'ingresos', nombre: 'Valor de mercado referencial' }, { clave: 'total', nombre: 'Total ponderado' }] as const;

function mismaClimatologia(primera: RespuestaCalendario['clima'], segunda: RespuestaCalendario['clima']) {
  return primera.fuente === segunda.fuente && primera.actualizado_en === segunda.actualizado_en
    && primera.periodo.inicio === segunda.periodo.inicio && primera.periodo.fin === segunda.periodo.fin && primera.resolucion === segunda.resolucion;
}
// Solo compara resultados del servidor; no introduce reglas ni puntuaciones agrícolas.
export function compararEscenarios(original: ResultadosEscenario, modificado: ResultadosEscenario) {
  const clima = original.calendario.clima;
  const compatibles = mismaClimatologia(clima, modificado.calendario.clima)
    && [original.rotaciones.clima, modificado.rotaciones.clima].every((dato) => dato === null || mismaClimatologia(clima, dato))
    && JSON.stringify(original.calendario.terreno) === JSON.stringify(modificado.calendario.terreno)
    && JSON.stringify(original.calendario.cultivos) === JSON.stringify(modificado.calendario.cultivos)
    && original.rotaciones.inicio_comun === modificado.rotaciones.inicio_comun
    && JSON.stringify(original.rotaciones.metodologia) === JSON.stringify(modificado.rotaciones.metodologia);
  if (!compatibles) throw new Error('Los datos de referencia cambiaron durante la consulta. Actualiza ambos escenarios para comparar las mismas condiciones.');
  const anteriores = new Map(original.calendario.celdas.map((celda) => [`${celda.cultivo_id}:${celda.mes}`, celda]));
  return modificado.calendario.celdas.flatMap((celda) => {
    const anterior = anteriores.get(`${celda.cultivo_id}:${celda.mes}`);
    return anterior && anterior.estado !== celda.estado ? [{ original: anterior, modificado: celda }] : [];
  });
}

export function compararPuntajes(originales: EstrategiaRotacion[], modificadas: EstrategiaRotacion[]) {
  const ids = [...new Set([...originales, ...modificadas].flatMap((estrategia) => estrategia.id === null ? [] : [estrategia.id]))];
  return ids.map((id) => {
    const original = originales.find((estrategia) => estrategia.id === id);
    const modificado = modificadas.find((estrategia) => estrategia.id === id);
    return { id, nombre: modificado?.nombre ?? original?.nombre ?? id, original, modificado,
      indicadores: INDICADORES_ESCENARIO.map(({ clave, nombre }) => {
        const base = original?.puntajes[clave] ?? null; const nuevo = modificado?.puntajes[clave] ?? null;
        return { clave, nombre, original: base, modificado: nuevo, diferencia: base === null || nuevo === null ? null : Math.round((nuevo - base) * 100) / 100 };
      }) };
  });
}

export function mostrarVariacion(valor: number, unidad = '') {
  return `${valor > 0 ? '+' : ''}${valor.toLocaleString('es-EC', { maximumFractionDigits: 2 })}${unidad}`;
}
