import { describe, expect, it } from 'vitest';
import { aPoligono, areaVerticesM2, compararConDeclarada, desdePoligono, formatearSuperficie, problemaDelimitacion, tieneAutointerseccion } from './geometria';

// Coordenadas sintéticas cerca de Latacunga, solo para pruebas.
const terreno = { latitud: -0.93, longitud: -78.62 };
const cuadrado = [{ latitud: -0.9305, longitud: -78.6205 }, { latitud: -0.9305, longitud: -78.6195 }, { latitud: -0.9295, longitud: -78.6195 }, { latitud: -0.9295, longitud: -78.6205 }];

describe('Geometría de la delimitación en el navegador', () => {
  it('estima la superficie igual que el servidor (≈1,24 ha para 0,001° × 0,001°)', () => {
    const area = areaVerticesM2(cuadrado);
    expect(area).toBeGreaterThan(12300); expect(area).toBeLessThan(12450);
    expect(formatearSuperficie(area).ha).toBe('1,24 ha');
    expect(formatearSuperficie(area).m2).toMatch(/^12\.3\d\d m²$/);
    expect(areaVerticesM2(cuadrado.slice(0, 2))).toBe(0);
  });
  it('compara con el área declarada y no compara si no se declaró', () => {
    expect(compararConDeclarada(12390, 1.5)).toBe('−0,26 ha (−17,4 %) respecto al área declarada de 1,5 ha');
    expect(compararConDeclarada(20000, 1)).toContain('+1 ha (+100 %)');
    expect(compararConDeclarada(12390, null)).toBeNull();
  });
  it('convierte a GeoJSON cerrado [longitud, latitud] y de vuelta', () => {
    const poligono = aPoligono(cuadrado);
    expect(poligono.coordinates[0]).toHaveLength(5);
    expect(poligono.coordinates[0]?.[0]).toEqual([-78.6205, -0.9305]);
    expect(poligono.coordinates[0]?.[4]).toEqual(poligono.coordinates[0]?.[0]);
    expect(desdePoligono(poligono)).toEqual(cuadrado);
    expect(desdePoligono(null)).toEqual([]);
  });
  it('explica cada problema que impide guardar', () => {
    expect(problemaDelimitacion(cuadrado, terreno)).toBeNull();
    expect(problemaDelimitacion(cuadrado.slice(0, 2), terreno)).toContain('al menos 3 puntos');
    expect(problemaDelimitacion([...cuadrado, cuadrado[0]!], terreno)).toContain('repetidos');
    expect(problemaDelimitacion([cuadrado[0]!, cuadrado[2]!, cuadrado[1]!, cuadrado[3]!], terreno)).toContain('se cruzan');
    expect(problemaDelimitacion(cuadrado.map((p) => ({ ...p, latitud: p.latitud + 0.5 })), terreno)).toContain('menos de 10 km');
    expect(problemaDelimitacion(cuadrado.map((p) => ({ latitud: -0.93 + (p.latitud + 0.93) / 100, longitud: -78.62 + (p.longitud + 78.62) / 100 })), terreno)).toContain('demasiado pequeña');
    expect(problemaDelimitacion([{ latitud: 95, longitud: 0 }, ...cuadrado], terreno)).toContain('fuera de rango');
    expect(problemaDelimitacion(Array.from({ length: 101 }, (_v, i) => ({ latitud: -0.93 + 0.001 * Math.sin(i), longitud: -78.62 + 0.001 * Math.cos(i) })), terreno)).toContain('hasta 100 puntos');
  });
  it('detecta cruces y acepta formas cóncavas', () => {
    expect(tieneAutointerseccion([cuadrado[0]!, cuadrado[2]!, cuadrado[1]!, cuadrado[3]!])).toBe(true);
    expect(tieneAutointerseccion([{ latitud: 0, longitud: 0 }, { latitud: 0, longitud: 0.002 }, { latitud: 0.002, longitud: 0.002 }, { latitud: 0.0005, longitud: 0.001 }, { latitud: 0.002, longitud: 0 }])).toBe(false);
  });
});
