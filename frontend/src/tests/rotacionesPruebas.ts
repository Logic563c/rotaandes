import type { EstrategiaRotacion, RespuestaRotaciones } from '../types/api';

// Respuesta sintética de interfaz; no certifica cálculos ni observaciones agronómicas.
export function crearRotacionesPrueba(): RespuestaRotaciones {
  const crear = (id: string, nombre: string, actual: boolean): EstrategiaRotacion => ({ id, nombre, es_actual: actual, secuencia: ['papa', 'haba', 'cebada'], estado: 'posible_con_cuidado',
    planificacion: ['papa', 'haba', 'cebada'].map((cultivo, indice) => ({ cultivo_id: cultivo, nombre: cultivo, inicio_estimado: `${2030 + indice}-10-01`, fin_estimado: `${2031 + indice}-04-01`, ciclo_meses: 6, espera_meses: indice === 0 ? 0 : 6, estado: 'posible_con_cuidado', motivo: 'Motivo de calendario controlado exclusivamente para la interfaz.' })),
    puntajes: { agua: 60, suelo: 50, riesgo: 70, ingresos: 40, total: 55 }, por_que: 'Explicación controlada de prueba.', evidencia: ['Fuente y valores controlados de prueba.'], beneficios: ['Atributo referencial.'], vacios_informacion: ['No hay análisis de suelo.'], riesgos: ['Precaución referencial.'], aviso: 'No reemplaza el criterio del agricultor; sin validación agronómica local.' });
  return { estrategias: [crear('actual', 'Patrón actual de prueba', true), crear('papa-haba-cebada', 'Primera alternativa de prueba', false), crear('papa-avena-haba', 'Segunda alternativa de prueba', false)],
    candidatas: [], inicio_comun: '2030-10-01', escenario: { lluvia_pct: 0, temp_delta: 0 }, metodologia: { version: 'heuristica_rotaciones_v1', peso_riesgo: 3, prioridades: { agua: 3, suelo: 3, ingresos: 3 }, aviso: 'Fixture' },
    clima: { fuente: 'NASA POWER', resolucion: 'Resolución regional de prueba', periodo: { inicio: 2001, fin: 2025 }, actualizado_en: '2026-11-08T05:00:00Z', estado_datos: 'cache', desactualizado: false, advertencias: [] }, advertencias: [], aviso: 'Comparación controlada de prueba, no garantía agrícola.' };
}
