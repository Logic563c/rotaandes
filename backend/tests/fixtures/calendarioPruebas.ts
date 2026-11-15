import { catalogoCompleto, cultivosReferenciales } from '../../src/data/catalogoCultivos.js';
import type { MesCalendario, TerrenoCalendario } from '../../src/services/calendario.js';

// Condiciones climáticas sintéticas exclusivas del motor en pruebas, no datos científicos reales.
/** Entrada del motor v1 (antes), idéntica a la usada por sus pruebas originales. */
export function crearEntradaCalendarioV1() {
  const terreno: TerrenoCalendario = { altitudM: 3000, tieneRiego: false, areaHa: 1 };
  return { terreno,
    cultivos: structuredClone(cultivosReferenciales), escenario: { lluviaPct: 0, tempDelta: 0 },
    mensual: Array.from({ length: 12 }, (_valor, indice): MesCalendario => ({ mes: indice + 1, lluvia_mm: 100, t_min: 8, t_max: 18, riesgo_helada: 'bajo' })) };
}

/**
 * Entrada del motor v2 con clima sintético templado y estable: media 13 °C, mínima 8 °C (riesgo bajo), 100 mm/mes,
 * celda NASA a la misma altitud que el terreno (sin ajuste). Las pruebas modifican un factor por vez.
 */
export function crearEntradaCalendario() {
  const terreno: TerrenoCalendario = { altitudM: 3000, tieneRiego: false, areaHa: 1 };
  return { terreno, elevacionCeldaM: 3000 as number | null,
    cultivos: structuredClone(catalogoCompleto), escenario: { lluviaPct: 0, tempDelta: 0 },
    mensual: Array.from({ length: 12 }, (_valor, indice): MesCalendario => ({ mes: indice + 1, lluvia_mm: 100, t_min: 8, t_med: 13, t_max: 18, riesgo_helada: 'bajo' })) };
}
