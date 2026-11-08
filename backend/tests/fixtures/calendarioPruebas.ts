import { cultivosReferenciales } from '../../src/data/catalogoCultivos.js';
import type { MesCalendario, TerrenoCalendario } from '../../src/services/calendario.js';

// Condiciones climáticas sintéticas exclusivas del motor en pruebas, no datos científicos reales.
export function crearEntradaCalendario() {
  const terreno: TerrenoCalendario = { altitudM: 3000, tieneRiego: false, areaHa: 1 };
  return { terreno,
    cultivos: structuredClone(cultivosReferenciales), escenario: { lluviaPct: 0, tempDelta: 0 },
    mensual: Array.from({ length: 12 }, (_valor, indice): MesCalendario => ({ mes: indice + 1, lluvia_mm: 100, t_min: 8, t_max: 18, riesgo_helada: 'bajo' })) };
}
