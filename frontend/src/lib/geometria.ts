// Geometría de la delimitación en el navegador: ayuda al agricultor mientras dibuja.
// Replica las reglas del servidor (backend/src/services/geometriaTerreno.ts), que es quien decide al guardar.
import type { PoligonoGeoJson } from '../types/api';

export interface Vertice { latitud: number; longitud: number }
export const LIMITES_DELIMITACION = { minimoVertices: 3, maximoVertices: 100, distanciaMaximaKm: 10, areaMinimaM2: 10, areaMaximaHa: 10000, decimales: 7 } as const;
const RADIO_TIERRA_M = 6378137;
const radianes = (grados: number) => (grados * Math.PI) / 180;
const redondear = (valor: number) => Number(valor.toFixed(LIMITES_DELIMITACION.decimales));

/** Área esférica aproximada (Chamberlain y Duquette, 2007) de un contorno abierto, en m². */
export function areaVerticesM2(vertices: readonly Vertice[]): number {
  const cantidad = vertices.length;
  if (cantidad < 3) return 0;
  let suma = 0;
  for (let indice = 0; indice < cantidad; indice += 1) {
    const anterior = vertices[(indice + cantidad - 1) % cantidad] as Vertice; const actual = vertices[indice] as Vertice; const siguiente = vertices[(indice + 1) % cantidad] as Vertice;
    suma += (radianes(siguiente.longitud) - radianes(anterior.longitud)) * Math.sin(radianes(actual.latitud));
  }
  return Math.abs((suma * RADIO_TIERRA_M * RADIO_TIERRA_M) / 2);
}

export function distanciaKm(a: Vertice, b: Vertice): number {
  const dLat = radianes(b.latitud - a.latitud); const dLon = radianes(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(a.latitud)) * Math.cos(radianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return (2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)))) / 1000;
}

function proyectar(vertices: readonly Vertice[]): [number, number][] {
  const latitudMedia = vertices.reduce((suma, punto) => suma + punto.latitud, 0) / Math.max(1, vertices.length);
  const factor = Math.cos(radianes(latitudMedia));
  return vertices.map((punto) => [radianes(punto.longitud) * RADIO_TIERRA_M * factor, radianes(punto.latitud) * RADIO_TIERRA_M]);
}
function orientacion(a: [number, number], b: [number, number], c: [number, number]) {
  const valor = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  return Math.abs(valor) < 1e-9 ? 0 : valor > 0 ? 1 : 2;
}
const sobre = (a: [number, number], b: [number, number], c: [number, number]) => b[0] <= Math.max(a[0], c[0]) && b[0] >= Math.min(a[0], c[0]) && b[1] <= Math.max(a[1], c[1]) && b[1] >= Math.min(a[1], c[1]);
function seCruzan(p1: [number, number], q1: [number, number], p2: [number, number], q2: [number, number]) {
  const o1 = orientacion(p1, q1, p2); const o2 = orientacion(p1, q1, q2); const o3 = orientacion(p2, q2, p1); const o4 = orientacion(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && sobre(p1, p2, q1)) || (o2 === 0 && sobre(p1, q2, q1)) || (o3 === 0 && sobre(p2, p1, q2)) || (o4 === 0 && sobre(p2, q1, q2));
}
/** true si dos lados no consecutivos del contorno cerrado se tocan o se cruzan. */
export function tieneAutointerseccion(vertices: readonly Vertice[]): boolean {
  const puntos = proyectar(vertices); const cantidad = puntos.length;
  for (let i = 0; i < cantidad; i += 1) for (let j = i + 1; j < cantidad; j += 1) {
    if (j === i + 1 || (i === 0 && j === cantidad - 1)) continue;
    if (seCruzan(puntos[i] as [number, number], puntos[(i + 1) % cantidad] as [number, number], puntos[j] as [number, number], puntos[(j + 1) % cantidad] as [number, number])) return true;
  }
  return false;
}

/** Devuelve el primer problema que impediría guardar la zona, o null si es válida. */
export function problemaDelimitacion(vertices: readonly Vertice[], terreno: Vertice): string | null {
  const limites = LIMITES_DELIMITACION;
  if (vertices.length < limites.minimoVertices) return `Marca al menos ${limites.minimoVertices} puntos para formar la zona (llevas ${vertices.length}).`;
  if (vertices.length > limites.maximoVertices) return `La zona admite hasta ${limites.maximoVertices} puntos.`;
  if (vertices.some((punto) => !Number.isFinite(punto.latitud) || !Number.isFinite(punto.longitud) || Math.abs(punto.latitud) > 90 || Math.abs(punto.longitud) > 180)) return 'Hay coordenadas fuera de rango. La latitud va de −90 a 90 y la longitud de −180 a 180.';
  const claves = vertices.map((punto) => `${redondear(punto.longitud)},${redondear(punto.latitud)}`);
  if (new Set(claves).size !== claves.length) return 'Hay puntos repetidos. Elimina los duplicados.';
  if (vertices.some((punto) => distanciaKm(terreno, punto) > limites.distanciaMaximaKm)) return `Todos los puntos deben estar a menos de ${limites.distanciaMaximaKm} km de la ubicación del terreno.`;
  if (tieneAutointerseccion(vertices)) return 'Los lados de la zona se cruzan. Mueve o elimina puntos para que el contorno no se cruce.';
  const area = areaVerticesM2(vertices);
  if (area < limites.areaMinimaM2) return `La zona es demasiado pequeña (menos de ${limites.areaMinimaM2} m²).`;
  if (area > limites.areaMaximaHa * 10000) return `La zona supera ${limites.areaMaximaHa.toLocaleString('es-EC')} ha. Revisa los puntos.`;
  return null;
}

export function aPoligono(vertices: readonly Vertice[]): PoligonoGeoJson {
  const anillo = vertices.map((punto): [number, number] => [redondear(punto.longitud), redondear(punto.latitud)]);
  const primero = anillo[0];
  return { type: 'Polygon', coordinates: [primero ? [...anillo, [...primero] as [number, number]] : []] };
}
export function desdePoligono(poligono: PoligonoGeoJson | null): Vertice[] {
  const anillo = poligono?.coordinates[0] ?? [];
  return anillo.slice(0, -1).map(([longitud, latitud]) => ({ latitud, longitud }));
}

export function formatearSuperficie(areaM2: number): { m2: string; ha: string } {
  return { m2: `${Math.round(areaM2).toLocaleString('es-EC')} m²`, ha: `${(areaM2 / 10000).toLocaleString('es-EC', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ha` };
}
/** Diferencia entre lo dibujado y lo declarado. No modifica el área declarada. */
export function compararConDeclarada(areaM2: number, areaDeclaradaHa: number | null): string | null {
  if (areaDeclaradaHa === null || areaDeclaradaHa <= 0) return null;
  const diferencia = areaM2 / 10000 - areaDeclaradaHa; const porcentaje = (diferencia / areaDeclaradaHa) * 100;
  const signo = diferencia > 0 ? '+' : diferencia < 0 ? '−' : '';
  return `${signo}${Math.abs(diferencia).toLocaleString('es-EC', { maximumFractionDigits: 2 })} ha (${signo}${Math.abs(porcentaje).toLocaleString('es-EC', { maximumFractionDigits: 1 })} %) respecto al área declarada de ${areaDeclaradaHa.toLocaleString('es-EC')} ha`;
}
