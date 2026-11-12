// Delimitación opcional de la zona de cultivo: validación geográfica y superficie aproximada.
// Formato: GeoJSON Polygon (RFC 7946), WGS84, posiciones [longitud, latitud], un solo anillo cerrado.
// La superficie es una estimación geodésica sobre una esfera; no es una medición catastral ni topográfica.
import { z } from 'zod';
import { ErrorHttp } from '../middleware/errores.js';

export type Posicion = [number, number];
export interface PoligonoGeoJson { type: 'Polygon'; coordinates: Posicion[][] }

export const LIMITES_POLIGONO = {
  minimoVertices: 3, maximoVertices: 100, decimales: 7,
  /** Cada vértice debe estar a esta distancia máxima del punto del terreno, para evitar dibujar en otro lugar. */
  distanciaMaximaKm: 10,
  areaMinimaM2: 10, areaMaximaHa: 10000,
} as const;

/** Radio ecuatorial WGS84, el mismo que usan las herramientas GeoJSON habituales para áreas esféricas. */
const RADIO_TIERRA_M = 6378137;
const radianes = (grados: number) => (grados * Math.PI) / 180;

/** Área esférica de un anillo (Chamberlain y Duquette, 2007). Admite anillo abierto o cerrado. */
export function areaPoligonoM2(anillo: readonly Posicion[]): number {
  const vertices = abrirAnillo(anillo);
  const cantidad = vertices.length;
  if (cantidad < 3) return 0;
  let suma = 0;
  for (let indice = 0; indice < cantidad; indice += 1) {
    const anterior = vertices[(indice + cantidad - 1) % cantidad] as Posicion;
    const actual = vertices[indice] as Posicion;
    const siguiente = vertices[(indice + 1) % cantidad] as Posicion;
    suma += (radianes(siguiente[0]) - radianes(anterior[0])) * Math.sin(radianes(actual[1]));
  }
  return Math.abs((suma * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2);
}

export function distanciaKm(a: { latitud: number; longitud: number }, b: { latitud: number; longitud: number }): number {
  const dLat = radianes(b.latitud - a.latitud); const dLon = radianes(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(a.latitud)) * Math.cos(radianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return (2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)))) / 1000;
}

function abrirAnillo(anillo: readonly Posicion[]): Posicion[] {
  const primero = anillo[0]; const ultimo = anillo[anillo.length - 1];
  return anillo.length > 1 && primero && ultimo && primero[0] === ultimo[0] && primero[1] === ultimo[1] ? anillo.slice(0, -1) : [...anillo];
}

/** Proyección local equirectangular en metros: suficiente para la topología de parcelas de pocos kilómetros. */
function proyectar(vertices: readonly Posicion[]): [number, number][] {
  const latitudMedia = vertices.reduce((suma, punto) => suma + punto[1], 0) / Math.max(1, vertices.length);
  const factor = Math.cos(radianes(latitudMedia));
  return vertices.map(([longitud, latitud]) => [radianes(longitud) * RADIO_TIERRA_M * factor, radianes(latitud) * RADIO_TIERRA_M]);
}
function orientacion(a: [number, number], b: [number, number], c: [number, number]): number {
  const valor = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  return Math.abs(valor) < 1e-9 ? 0 : valor > 0 ? 1 : 2;
}
function sobreSegmento(a: [number, number], b: [number, number], c: [number, number]): boolean {
  return b[0] <= Math.max(a[0], c[0]) && b[0] >= Math.min(a[0], c[0]) && b[1] <= Math.max(a[1], c[1]) && b[1] >= Math.min(a[1], c[1]);
}
function seCruzan(p1: [number, number], q1: [number, number], p2: [number, number], q2: [number, number]): boolean {
  const o1 = orientacion(p1, q1, p2); const o2 = orientacion(p1, q1, q2); const o3 = orientacion(p2, q2, p1); const o4 = orientacion(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && sobreSegmento(p1, p2, q1)) || (o2 === 0 && sobreSegmento(p1, q2, q1)) || (o3 === 0 && sobreSegmento(p2, p1, q2)) || (o4 === 0 && sobreSegmento(p2, q1, q2));
}

/** true si dos lados no consecutivos se tocan o se cruzan (anillo abierto). */
export function tieneAutointerseccion(vertices: readonly Posicion[]): boolean {
  const puntos = proyectar(vertices); const cantidad = puntos.length;
  for (let i = 0; i < cantidad; i += 1) {
    for (let j = i + 1; j < cantidad; j += 1) {
      if (j === i + 1 || (i === 0 && j === cantidad - 1)) continue;
      if (seCruzan(puntos[i] as [number, number], puntos[(i + 1) % cantidad] as [number, number], puntos[j] as [number, number], puntos[(j + 1) % cantidad] as [number, number])) return true;
    }
  }
  return false;
}
function areaPlanaConSigno(vertices: readonly Posicion[]): number {
  const puntos = proyectar(vertices);
  return puntos.reduce((suma, punto, indice) => { const siguiente = puntos[(indice + 1) % puntos.length] as [number, number]; return suma + punto[0] * siguiente[1] - siguiente[0] * punto[1]; }, 0) / 2;
}

const redondear = (valor: number) => Number(valor.toFixed(LIMITES_POLIGONO.decimales));
const posicion = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const esquemaPoligono = z.strictObject({ type: z.literal('Polygon'), coordinates: z.array(z.array(posicion).max(LIMITES_POLIGONO.maximoVertices + 1)).length(1) });
export const esquemaDelimitacion = z.strictObject({ poligono: z.unknown() });

/** Valida y normaliza un polígono recibido: redondea, comprueba cierre, vértices, cruces, superficie y cercanía. */
export function validarPoligono(entrada: unknown, punto: { latitud: number; longitud: number }): PoligonoGeoJson {
  const resultado = esquemaPoligono.safeParse(entrada);
  if (!resultado.success) throw new ErrorHttp(400, 'La delimitación debe ser un polígono GeoJSON con un solo contorno, hasta 100 puntos y coordenadas [longitud, latitud] válidas.');
  const anillo = (resultado.data.coordinates[0] ?? []).map(([longitud, latitud]): Posicion => [redondear(longitud), redondear(latitud)]);
  const primero = anillo[0]; const ultimo = anillo[anillo.length - 1];
  if (!primero || !ultimo || primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) throw new ErrorHttp(400, 'El polígono debe estar cerrado: el último punto debe repetir el primero.');
  const vertices = anillo.slice(0, -1);
  if (vertices.length < LIMITES_POLIGONO.minimoVertices) throw new ErrorHttp(400, 'La zona necesita al menos 3 puntos distintos.');
  if (new Set(vertices.map((valor) => valor.join(','))).size !== vertices.length) throw new ErrorHttp(400, 'Hay puntos repetidos en la delimitación. Elimina los duplicados.');
  if (vertices.some((vertice) => distanciaKm(punto, { longitud: vertice[0], latitud: vertice[1] }) > LIMITES_POLIGONO.distanciaMaximaKm)) throw new ErrorHttp(400, `Todos los puntos deben estar a menos de ${LIMITES_POLIGONO.distanciaMaximaKm} km de la ubicación del terreno.`);
  if (tieneAutointerseccion(vertices)) throw new ErrorHttp(400, 'Los lados del polígono se cruzan entre sí. Mueve o elimina puntos para que el contorno no se cruce.');
  const area = areaPoligonoM2(vertices);
  if (area < LIMITES_POLIGONO.areaMinimaM2) throw new ErrorHttp(400, `La zona dibujada es demasiado pequeña (menos de ${LIMITES_POLIGONO.areaMinimaM2} m²).`);
  if (area > LIMITES_POLIGONO.areaMaximaHa * 10000) throw new ErrorHttp(400, `La zona dibujada supera ${LIMITES_POLIGONO.areaMaximaHa.toLocaleString('es-EC')} ha. Revisa los puntos.`);
  // RFC 7946: el contorno exterior se guarda en sentido antihorario.
  const ordenados = areaPlanaConSigno(vertices) < 0 ? [...vertices].reverse() : vertices;
  return { type: 'Polygon', coordinates: [[...ordenados, ordenados[0] as Posicion]] };
}

/** Lee el valor guardado en PostgreSQL de forma defensiva. Un valor no reconocible se trata como ausente. */
export function leerPoligonoGuardado(valor: unknown): PoligonoGeoJson | null {
  if (valor === null || valor === undefined) return null;
  const resultado = esquemaPoligono.safeParse(valor);
  return resultado.success && (resultado.data.coordinates[0]?.length ?? 0) >= 4 ? { type: 'Polygon', coordinates: resultado.data.coordinates as Posicion[][] } : null;
}

export function describirDelimitacion(poligono: PoligonoGeoJson | null, areaDeclaradaHa: number | null) {
  if (!poligono) return null;
  const anillo = poligono.coordinates[0] ?? [];
  const areaM2 = areaPoligonoM2(anillo);
  const areaHa = areaM2 / 10000;
  return { areaM2, areaHa, vertices: Math.max(0, anillo.length - 1),
    diferenciaHa: areaDeclaradaHa === null ? null : areaHa - areaDeclaradaHa,
    diferenciaPct: areaDeclaradaHa === null || areaDeclaradaHa <= 0 ? null : ((areaHa - areaDeclaradaHa) / areaDeclaradaHa) * 100 };
}
