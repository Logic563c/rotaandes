import latacunga from './clima/latacunga.json' with { type: 'json' };
import pujili from './clima/pujili.json' with { type: 'json' };
import saquisili from './clima/saquisili.json' with { type: 'json' };
import salcedo from './clima/salcedo.json' with { type: 'json' };
import paramo from './clima/paramo.json' with { type: 'json' };
import procedencia from './clima/procedencia.json' with { type: 'json' };
import procedenciaCeldas from './clima/celdas/procedencia.json' with { type: 'json' };
import { RESPUESTAS_CELDAS } from './clima/celdas/indice.js';
import { procesarRespuestaNasa } from '../services/nasaPower.js';
import type { ClimatologiaBase } from '../services/nasaPower.js';
import { compartenCeldaNasa, describirCeldaNasa, obtenerCeldaNasa } from '../services/cuadriculaNasa.js';

const respuestas: Record<string, unknown> = { latacunga, pujili, saquisili, salcedo, paramo };

// 1) Respuesta real archivada del mismo punto exacto.
// 2) Respuesta real archivada de un punto de la misma pareja de celdas nativas de NASA POWER.
//    NASA entrega valores idénticos a todos los puntos de esa pareja de celdas (48/48 comprobaciones
//    en vivo); se identifica el punto de referencia, la celda y la fecha de descarga.
// No se usa nunca otra celda, el punto más cercano ni un promedio regional.
export function buscarRespaldoClima(latitud: number, longitud: number): ClimatologiaBase | null {
  const registro = procedencia.find((punto) => punto.latitud === latitud && punto.longitud === longitud);
  if (registro) {
    try { return procesarRespuestaNasa(respuestas[registro.lugar], latitud, longitud, registro.consultado_en); }
    catch { return null; }
  }
  const celda = obtenerCeldaNasa(latitud, longitud);
  const referencia = procedenciaCeldas.find((punto) => compartenCeldaNasa(celda, punto.celda));
  if (!celda || !referencia) return null;
  try {
    const base = procesarRespuestaNasa(RESPUESTAS_CELDAS[referencia.archivo], referencia.latitud, referencia.longitud, referencia.consultado_en);
    return { ...base, latitud, longitud, advertencias: [
      `Respaldo NASA POWER archivado: consulta oficial del ${referencia.consultado_en.slice(0, 10)} en el punto de referencia (${referencia.latitud}, ${referencia.longitud}), que comparte con este terreno la misma ${describirCeldaNasa(celda)}. NASA POWER entrega los mismos valores a todos los puntos de esa celda; es un dato regional, no una medición del lote.`,
      ...base.advertencias] };
  } catch { return null; }
}
