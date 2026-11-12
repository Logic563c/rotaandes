import { describe, expect, it } from 'vitest';
import { ErrorHttp } from '../src/middleware/errores.js';
import { areaPoligonoM2, describirDelimitacion, distanciaKm, leerPoligonoGuardado, tieneAutointerseccion, validarPoligono } from '../src/services/geometriaTerreno.js';
import type { Posicion } from '../src/services/geometriaTerreno.js';
import { publicarDelimitacion } from '../src/services/datosAgricolas.js';

// Geometrías sintéticas de prueba cerca de Latacunga; no representan parcelas reales.
const punto = { latitud: -0.93, longitud: -78.62 };
const METROS_POR_GRADO = (Math.PI / 180) * 6378137;
/** Cuadrado de lado en metros, centrado en el punto, en sentido antihorario y cerrado. */
function cuadrado(ladoM: number, centro = punto): Posicion[] {
  const dLat = ladoM / METROS_POR_GRADO / 2; const dLon = ladoM / (METROS_POR_GRADO * Math.cos((centro.latitud * Math.PI) / 180)) / 2;
  const a: Posicion = [centro.longitud - dLon, centro.latitud - dLat];
  return [a, [centro.longitud + dLon, centro.latitud - dLat], [centro.longitud + dLon, centro.latitud + dLat], [centro.longitud - dLon, centro.latitud + dLat], a];
}
const poligono = (anillo: Posicion[]) => ({ type: 'Polygon', coordinates: [anillo] });
function mensajeDe(accion: () => unknown): string {
  try { accion(); } catch (error: unknown) { if (error instanceof ErrorHttp) { expect(error.codigoHttp).toBe(400); return error.message; } throw error; }
  throw new Error('Se esperaba un error 400');
}

describe('Superficie aproximada de la delimitación', () => {
  it('estima 1 ha para un cuadrado de 100 m de lado con error menor al 0,5 %', () => {
    expect(areaPoligonoM2(cuadrado(100))).toBeGreaterThan(9950);
    expect(areaPoligonoM2(cuadrado(100))).toBeLessThan(10050);
  });
  it('escala con el cuadrado del lado y no depende del sentido ni del cierre del anillo', () => {
    const grande = areaPoligonoM2(cuadrado(400));
    expect(grande / areaPoligonoM2(cuadrado(100))).toBeCloseTo(16, 2);
    expect(areaPoligonoM2([...cuadrado(400)].reverse())).toBeCloseTo(grande, 6);
    expect(areaPoligonoM2(cuadrado(400).slice(0, -1))).toBeCloseTo(grande, 6);
  });
  it('un triángulo es la mitad de su rectángulo y menos de 3 puntos tiene área cero', () => {
    const [a, b, c] = cuadrado(200) as [Posicion, Posicion, Posicion];
    expect(areaPoligonoM2([a, b, c, a]) * 2).toBeCloseTo(areaPoligonoM2(cuadrado(200)), 0);
    expect(areaPoligonoM2([a, b])).toBe(0);
  });
  it('compara con el área declarada sin reemplazarla', () => {
    const descripcion = describirDelimitacion(validarPoligono(poligono(cuadrado(100)), punto), 2);
    expect(descripcion?.vertices).toBe(4);
    expect(descripcion?.areaHa).toBeCloseTo(1, 1);
    expect(descripcion?.diferenciaHa).toBeCloseTo(-1, 1);
    expect(descripcion?.diferenciaPct).toBeCloseTo(-50, 0);
    expect(describirDelimitacion(validarPoligono(poligono(cuadrado(100)), punto), null)?.diferenciaHa).toBeNull();
    expect(describirDelimitacion(null, 2)).toBeNull();
  });
  it('mide distancias geodésicas aproximadas', () => { expect(distanciaKm(punto, { latitud: -0.93 + 0.1, longitud: -78.62 })).toBeCloseTo(11.13, 1); });
});

describe('Validación geográfica de la delimitación', () => {
  it('acepta un polígono válido, lo devuelve cerrado, redondeado a 7 decimales y en sentido antihorario', () => {
    const horario = [...cuadrado(120)].reverse().map(([lon, lat]): Posicion => [lon + 1e-10, lat]);
    const resultado = validarPoligono(poligono(horario), punto);
    const anillo = resultado.coordinates[0] ?? [];
    expect(resultado.type).toBe('Polygon');
    expect(anillo[0]).toEqual(anillo[anillo.length - 1]);
    expect(anillo.every(([lon, lat]) => Number(lon.toFixed(7)) === lon && Number(lat.toFixed(7)) === lat)).toBe(true);
    const signo = anillo.slice(0, -1).reduce((suma, [x1, y1], indice, lista) => { const [x2, y2] = lista[(indice + 1) % lista.length] as Posicion; return suma + x1 * y2 - x2 * y1; }, 0);
    expect(signo).toBeGreaterThan(0);
  });
  it.each([
    ['sin cerrar', poligono(cuadrado(100).slice(0, -1)), 'cerrado'],
    ['con menos de 3 puntos', poligono([[-78.62, -0.93], [-78.619, -0.93], [-78.62, -0.93]]), 'al menos 3 puntos'],
    ['con puntos repetidos', poligono([[-78.62, -0.93], [-78.619, -0.93], [-78.619, -0.929], [-78.619, -0.93], [-78.62, -0.93]]), 'repetidos'],
    ['con lados que se cruzan (forma de moño)', poligono([[-78.621, -0.931], [-78.619, -0.929], [-78.619, -0.931], [-78.621, -0.929], [-78.621, -0.931]]), 'se cruzan'],
    ['lejos del terreno', poligono(cuadrado(100, { latitud: -0.5, longitud: -78.62 })), 'menos de 10 km'],
    ['diminuto', poligono(cuadrado(2)), 'demasiado pequeña'],
    ['enorme', poligono(cuadrado(11000, { latitud: -0.93, longitud: -78.62 })), 'Revisa los puntos'],
  ])('rechaza un polígono %s', (_caso, entrada, mensaje) => { expect(mensajeDe(() => validarPoligono(entrada, punto))).toContain(mensaje); });
  it.each([
    ['otro tipo GeoJSON', { type: 'LineString', coordinates: cuadrado(100) }],
    ['con agujeros', { type: 'Polygon', coordinates: [cuadrado(300), cuadrado(100)] }],
    ['con campos extra', { type: 'Polygon', coordinates: [cuadrado(100)], bbox: [0, 0, 1, 1] }],
    ['con latitud fuera de rango', poligono([[-78.62, -91], [-78.61, -0.93], [-78.61, -0.92], [-78.62, -91]])],
    ['con texto en lugar de números', { type: 'Polygon', coordinates: [[['-78.62', '-0.93']]] }],
    ['con más de 100 puntos', poligono(Array.from({ length: 103 }, (_v, i): Posicion => [-78.62 + 0.001 * Math.cos(i), -0.93 + 0.001 * Math.sin(i)]))],
    ['vacío', null],
  ])('rechaza una entrada %s', (_caso, entrada) => { expect(mensajeDe(() => validarPoligono(entrada, punto))).toContain('polígono GeoJSON'); });
  it('detecta autointersecciones y acepta contornos cóncavos sin cruces', () => {
    expect(tieneAutointerseccion([[0, 0], [0.001, 0.001], [0.001, 0], [0, 0.001]])).toBe(true);
    expect(tieneAutointerseccion([[0, 0], [0.002, 0], [0.002, 0.002], [0.001, 0.0005], [0, 0.002]])).toBe(false);
  });
});

describe('Lectura y publicación de la delimitación guardada', () => {
  it('un terreno antiguo sin polígono publica valores nulos', () => {
    expect(publicarDelimitacion(null)).toEqual({ poligono: null, area_poligono_m2: null });
    expect(leerPoligonoGuardado(undefined)).toBeNull();
  });
  it('un valor guardado no reconocible se trata como ausente', () => {
    expect(leerPoligonoGuardado({ type: 'Point', coordinates: [0, 0] })).toBeNull();
    expect(leerPoligonoGuardado({ type: 'Polygon', coordinates: [[[0, 0], [0, 0]]] })).toBeNull();
  });
  it('publica la geometría y la superficie derivada redondeada a 0,1 m²', () => {
    const guardado = validarPoligono(poligono(cuadrado(100)), punto);
    const publicado = publicarDelimitacion(guardado);
    expect(publicado.poligono).toEqual(guardado);
    expect(publicado.area_poligono_m2).toBe(Math.round(areaPoligonoM2(guardado.coordinates[0] ?? []) * 10) / 10);
  });
});
