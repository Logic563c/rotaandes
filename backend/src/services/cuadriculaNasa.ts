// Cuadrícula nativa de NASA POWER usada por la climatología puntual.
// Verificado con consultas reales el 9 de noviembre de 2026 (docs/DIAGNOSTICO_NASA_Y_RECUPERACION.md):
// - Meteorología (MERRA-2): celdas de 0,5° de latitud × 0,625° de longitud centradas en múltiplos
//   de esos pasos; por ejemplo, bordes observados en -0,75° de latitud y -78,4375° de longitud.
// - Radiación solar (SYN1DEG): celdas de 1° × 1° con bordes en grados enteros; borde observado en -79°.
// Todo punto dentro de la misma pareja de celdas recibió valores idénticos de NASA.
export const PASO_LATITUD_METEOROLOGIA = 0.5;
export const PASO_LONGITUD_METEOROLOGIA = 0.625;
const MARGEN_BORDE_GRADOS = 1e-6;

export interface CeldaNasa { meteorologia: { fila: number; columna: number }; solar: { fila: number; columna: number } }

function esCoordenadaValida(latitud: number, longitud: number): boolean {
  return Number.isFinite(latitud) && Number.isFinite(longitud) && Math.abs(latitud) <= 90 && Math.abs(longitud) <= 180;
}

// Devuelve null si el punto está sobre un borde: no se presupone a qué celda lo asignaría NASA.
export function obtenerCeldaNasa(latitud: number, longitud: number): CeldaNasa | null {
  if (!esCoordenadaValida(latitud, longitud)) return null;
  const filaReal = (latitud + 90) / PASO_LATITUD_METEOROLOGIA;
  const columnaReal = (longitud + 180) / PASO_LONGITUD_METEOROLOGIA;
  const cercaDeBorde = (valor: number, desplazamiento: number) => Math.abs(valor - Math.floor(valor) - desplazamiento) < MARGEN_BORDE_GRADOS;
  if (cercaDeBorde(filaReal, 0.5) || cercaDeBorde(columnaReal, 0.5)) return null;
  if (Math.abs(latitud - Math.round(latitud)) < MARGEN_BORDE_GRADOS || Math.abs(longitud - Math.round(longitud)) < MARGEN_BORDE_GRADOS) return null;
  return { meteorologia: { fila: Math.round(filaReal), columna: Math.round(columnaReal) }, solar: { fila: Math.floor(latitud), columna: Math.floor(longitud) } };
}

export function compartenCeldaNasa(primera: CeldaNasa | null, segunda: CeldaNasa | null): boolean {
  return primera !== null && segunda !== null
    && primera.meteorologia.fila === segunda.meteorologia.fila && primera.meteorologia.columna === segunda.meteorologia.columna
    && primera.solar.fila === segunda.solar.fila && primera.solar.columna === segunda.solar.columna;
}

export function describirCeldaNasa(celda: CeldaNasa): string {
  const latitudCentro = celda.meteorologia.fila * PASO_LATITUD_METEOROLOGIA - 90;
  const longitudCentro = celda.meteorologia.columna * PASO_LONGITUD_METEOROLOGIA - 180;
  return `celda meteorológica centrada en (${latitudCentro}, ${longitudCentro}) de 0,5° × 0,625° y celda solar de 1° con esquina (${celda.solar.fila}, ${celda.solar.columna})`;
}

// Las series mensuales y diarias de tendencias solo usan parámetros meteorológicos (MERRA-2).
// Verificado el 9-11-2026: tres puntos de la misma celda devolvieron series 2005–2024 idénticas.
export function obtenerCeldaMeteorologica(latitud: number, longitud: number): CeldaNasa['meteorologia'] | null {
  if (!esCoordenadaValida(latitud, longitud)) return null;
  const filaReal = (latitud + 90) / PASO_LATITUD_METEOROLOGIA;
  const columnaReal = (longitud + 180) / PASO_LONGITUD_METEOROLOGIA;
  if (Math.abs(filaReal - Math.floor(filaReal) - 0.5) < MARGEN_BORDE_GRADOS || Math.abs(columnaReal - Math.floor(columnaReal) - 0.5) < MARGEN_BORDE_GRADOS) return null;
  return { fila: Math.round(filaReal), columna: Math.round(columnaReal) };
}
