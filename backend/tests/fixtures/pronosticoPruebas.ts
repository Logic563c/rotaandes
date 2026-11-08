import { obtenerFechaEcuador, procesarPronostico, sumarDia } from '../../src/services/openMeteo.js';

// Datos sintéticos exclusivos de pruebas; nunca son una descarga ni un respaldo meteorológico.
export function crearRespuestaPronostico(fecha = '2030-01-01T12:00:00.000Z') {
  return { latitude: -0.9490334, longitude: -78.59952, timezone: 'America/Guayaquil', utc_offset_seconds: -18000,
    daily_units: { time: 'iso8601', temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_sum: 'mm' },
    daily: { time: Array.from({ length: 7 }, (_valor, indice) => sumarDia(obtenerFechaEcuador(new Date(fecha)), indice)),
      temperature_2m_max: Array.of<number | null>(18, 19, 20, 18, 19, 20, 18), temperature_2m_min: Array.of<number | null>(1.5, 2, 2.01, null, 4, -1, 8), precipitation_sum: Array.of<number | null>(0, 1.2, 3.4, 5, 0, 0.1, null) } };
}
export function crearBasePronostico(fecha = '2030-01-01T12:00:00.000Z') { return procesarPronostico(crearRespuestaPronostico(fecha), -0.93, -78.62, fecha); }
