import mensual from './tendencias/mensual-latacunga.json' with { type: 'json' };
import diario from './tendencias/diario-latacunga.json' with { type: 'json' };
import { procesarMensualHistorico, procesarDiarioHistorico } from '../../src/services/nasaHistorico.js';

export interface RespuestaHistoricaPrueba {
  type: string; geometry: { type: string; coordinates: number[] };
  header: { start: string; end: string; fill_value: number; time_standard: string; api: { name: string; version: string }; sources: string[] };
  properties: { parameter: Record<string, Record<string, unknown>> };
  parameters: Record<string, { units: string; longname: string }>;
}
export function respuestaMensualPrueba(): RespuestaHistoricaPrueba { return structuredClone(mensual); }
export function respuestaDiariaPrueba(): RespuestaHistoricaPrueba { return structuredClone(diario); }
export function cambiarDatoHistorico(respuesta: RespuestaHistoricaPrueba, parametro: string, fecha: string, valor: unknown) {
  const serie = respuesta.properties.parameter[parametro]; if (!serie) throw new Error('Fixture incompleta.'); serie[fecha] = valor;
}
// Fechas modificadas solo para probar caché/determinismo, nunca como una nueva consulta NASA.
export function crearMensualPrueba(fecha = '2030-01-01T00:00:00.000Z') {
  const base = procesarMensualHistorico(respuestaMensualPrueba(), -0.93, -78.62, fecha);
  base.advertencias.push('Fixture controlada: fecha de consulta simulada solo para pruebas.'); return base;
}
export function crearDiarioPrueba(fecha = '2030-01-01T00:00:00.000Z') {
  const base = procesarDiarioHistorico(respuestaDiariaPrueba(), -0.93, -78.62, fecha);
  base.advertencias.push('Fixture controlada: fecha de consulta simulada solo para pruebas.'); return base;
}
