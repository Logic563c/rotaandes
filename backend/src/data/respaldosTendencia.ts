import procedencia from './tendencia/procedencia.json' with { type: 'json' };
import { RESPUESTAS_TENDENCIA } from './tendencia/indice.js';
import { procesarDiarioHistorico, procesarMensualHistorico } from '../services/nasaHistorico.js';
import type { BaseDiaria, BaseMensual } from '../services/nasaHistorico.js';
import { obtenerCeldaMeteorologica } from '../services/cuadriculaNasa.js';

// Series NASA POWER 2005–2024 archivadas del centro de cada celda MERRA-2 de Cotopaxi.
// Las series mensuales y diarias solo usan parámetros meteorológicos: NASA entrega los mismos valores
// a todos los puntos de la celda. No se usa otra celda, el punto más cercano ni promedios regionales.
function buscarReferencia(tipo: 'mensual' | 'diario', latitud: number, longitud: number) {
  const celda = obtenerCeldaMeteorologica(latitud, longitud);
  if (!celda) return null;
  return procedencia.find((registro) => registro.tipo === tipo && registro.celda.fila === celda.fila && registro.celda.columna === celda.columna) ?? null;
}
function aviso(tipo: string, referencia: { latitud: number; longitud: number; consultado_en: string }): string {
  return `Respaldo NASA POWER archivado (serie ${tipo}): consulta oficial del ${referencia.consultado_en.slice(0, 10)} en el centro (${referencia.latitud}, ${referencia.longitud}) de la misma celda MERRA-2 de 0,5° × 0,625° que contiene este terreno. NASA POWER entrega la misma serie a todos los puntos de esa celda; es un dato regional, no una medición del lote.`;
}

export function buscarRespaldoMensual(latitud: number, longitud: number): BaseMensual | null {
  const referencia = buscarReferencia('mensual', latitud, longitud);
  if (!referencia) return null;
  try {
    const base = procesarMensualHistorico(RESPUESTAS_TENDENCIA[referencia.archivo], referencia.latitud, referencia.longitud, referencia.consultado_en);
    return { ...base, latitud, longitud, advertencias: [aviso('mensual', referencia), ...base.advertencias] };
  } catch { return null; }
}
export function buscarRespaldoDiario(latitud: number, longitud: number): BaseDiaria | null {
  const referencia = buscarReferencia('diario', latitud, longitud);
  if (!referencia) return null;
  try {
    const base = procesarDiarioHistorico(RESPUESTAS_TENDENCIA[referencia.archivo], referencia.latitud, referencia.longitud, referencia.consultado_en);
    return { ...base, latitud, longitud, advertencias: [aviso('diaria', referencia), ...base.advertencias] };
  } catch { return null; }
}
