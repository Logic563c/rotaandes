import respuestaVerificada from '../../src/data/clima/latacunga.json' with { type: 'json' };
import { procesarRespuestaNasa } from '../../src/services/nasaPower.js';

// Fixtures controladas solo para tests. Las mutaciones/fechas de estos objetos NO son nuevas consultas NASA.
interface RespuestaPrueba {
  type: string; geometry: { type: string; coordinates: number[] };
  header: { fill_value: number; range: string; api: { version: string; name: string }; sources: string[] };
  properties: { parameter: Record<string, Record<string, unknown>> };
  parameters: Record<string, { units: string; longname: string }>;
}
export function crearRespuestaPrueba(): RespuestaPrueba { return structuredClone(respuestaVerificada); }
export function cambiarValor(datos: RespuestaPrueba, parametro: string, mes: string, valor: unknown) {
  const serie = datos.properties.parameter[parametro]; if (!serie) throw new Error('Fixture incompleta.'); serie[mes] = valor;
}
export function crearBasePrueba(fecha = '2030-01-01T00:00:00.000Z') {
  return procesarRespuestaNasa(crearRespuestaPrueba(), -0.93, -78.62, fecha);
}
