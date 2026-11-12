import { describe, expect, it } from 'vitest';
import { etiquetasSinDato, extremos, formatearValor, resumirMinimas, resumirSerie, unirLista } from './graficas';

describe('Resúmenes de gráficas derivados solo de los datos', () => {
  it('formatea con unidad y nunca convierte un dato ausente en cero', () => {
    expect(formatearValor(12.345, 'mm', 1)).toBe('12,3 mm');
    expect(formatearValor(null, 'mm')).toBe('Sin dato');
    expect(formatearValor(Number.NaN, '°C')).toBe('Sin dato');
    expect(formatearValor(0, 'mm')).toBe('0 mm');
  });
  it('encuentra extremos ignorando ausentes y lista los meses sin dato', () => {
    const serie = [{ etiqueta: 'enero', valor: null }, { etiqueta: 'febrero', valor: 80 }, { etiqueta: 'marzo', valor: 10 }];
    expect(extremos(serie)).toEqual({ maximo: { etiqueta: 'febrero', valor: 80 }, minimo: { etiqueta: 'marzo', valor: 10 } });
    expect(etiquetasSinDato(serie)).toEqual(['enero']);
    expect(extremos([{ etiqueta: 'enero', valor: null }])).toBeNull();
  });
  it('describe el mes más alto y el más bajo y advierte que un hueco no es cero', () => {
    const texto = resumirSerie([{ etiqueta: 'enero', valor: null }, { etiqueta: 'febrero', valor: 80 }, { etiqueta: 'julio', valor: 12.5 }], { nombre: 'lluvia', unidad: 'mm', alto: 'el mes más lluvioso', bajo: 'el más seco' });
    expect(texto).toContain('el mes más lluvioso es febrero (80 mm)');
    expect(texto).toContain('el más seco es julio (12,5 mm)');
    expect(texto).toContain('Sin dato en enero');
    expect(texto).toContain('no significa lluvia cero');
  });
  it('sin datos válidos no inventa un resumen', () => {
    expect(resumirSerie([{ etiqueta: 'enero', valor: null }], { nombre: 'lluvia', unidad: 'mm', alto: 'a', bajo: 'b' })).toBe('No hay datos válidos de lluvia para resumir.');
    expect(resumirMinimas([], 2)).toBe('No hay temperaturas mínimas válidas para resumir.');
  });
  it('cuenta las mínimas en el umbral o por debajo, incluido el valor exacto del umbral', () => {
    const texto = resumirMinimas([{ etiqueta: 'junio', valor: 2 }, { etiqueta: 'julio', valor: 1.4 }, { etiqueta: 'agosto', valor: 5 }], 2);
    expect(texto).toBe('La mínima más baja es 1,4 °C en julio. 2 valores llegan a 2 °C o menos (junio y julio).');
    expect(resumirMinimas([{ etiqueta: 'enero', valor: 6 }], 2)).toContain('Ningún valor llega a 2 °C o menos.');
  });
  it('une listas en español', () => { expect(unirLista(['a', 'b', 'c'])).toBe('a, b y c'); expect(unirLista(['a'])).toBe('a'); });
});
