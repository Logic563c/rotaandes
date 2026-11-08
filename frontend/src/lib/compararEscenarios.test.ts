import { describe, expect, it } from 'vitest';
import { compararEscenarios, compararPuntajes } from './compararEscenarios';
import { crearEscenariosPrueba } from '../tests/escenariosPruebas';

describe('Diferencias de escenarios sin recalcular reglas agronómicas', () => {
  it('compara por cultivo/mes, conserva motivos, es determinista y no modifica entradas', () => {
    const original = crearEscenariosPrueba(); const nuevo = crearEscenariosPrueba({ lluvia_pct: -30, temp_delta: -2 });
    nuevo.calendario.celdas.reverse(); const copia = structuredClone({ original, nuevo });
    const cambios = compararEscenarios(original, nuevo);
    expect(cambios).toHaveLength(1); expect(cambios[0]).toMatchObject({ original: { mes: 1, estado: 'recomendado' }, modificado: { mes: 1, estado: 'no_recomendado' } });
    expect(compararEscenarios(original, nuevo)).toEqual(cambios); expect({ original, nuevo }).toEqual(copia);
    expect(compararEscenarios(original, original)).toEqual([]);
  });
  it.each(['fecha', 'periodo', 'terreno', 'prioridades', 'inicio', 'fuente_rotaciones'])('rechaza mezclar referencia distinta: %s', (caso) => {
    const original = crearEscenariosPrueba(); const nuevo = structuredClone(original);
    if (caso === 'fecha') nuevo.calendario.clima.actualizado_en = '2030-01-01T00:00:00Z';
    if (caso === 'periodo') nuevo.calendario.clima.periodo.fin = 2024;
    if (caso === 'terreno') nuevo.calendario.terreno.tiene_riego = true;
    if (caso === 'prioridades') nuevo.rotaciones.metodologia.prioridades.agua = 5;
    if (caso === 'inicio') nuevo.rotaciones.inicio_comun = '2031-01-01';
    if (caso === 'fuente_rotaciones' && nuevo.rotaciones.clima) nuevo.rotaciones.clima.resolucion = 'Otra fuente';
    expect(() => compararEscenarios(original, nuevo)).toThrow('referencia cambiaron');
  });
  it('compara puntuaciones por identidad aunque cambie el orden; jamás convierte nulos en cero', () => {
    const base = crearEscenariosPrueba().rotaciones.estrategias; const nuevo = structuredClone(base).reverse();
    const actual = nuevo.find((valor) => valor.id === 'actual'); if (!actual) throw new Error(); actual.puntajes.total = null;
    const alternativa = nuevo.find((valor) => valor.id === 'papa-haba-cebada'); if (!alternativa) throw new Error(); alternativa.puntajes.total = 60;
    const comparacion = compararPuntajes(base, nuevo);
    expect(comparacion.find((valor) => valor.id === 'papa-haba-cebada')?.indicadores.at(-1)?.diferencia).toBe(5);
    expect(comparacion.find((valor) => valor.id === 'actual')?.indicadores.at(-1)?.diferencia).toBeNull();
  });
  it('no resta indicadores de otra plantilla cuando cambia el grupo sugerido', () => {
    const base = crearEscenariosPrueba().rotaciones.estrategias; const nuevo = structuredClone(base); const alternativa = nuevo[1]; if (!alternativa) throw new Error(); alternativa.id = 'nueva-plantilla';
    const comparacion = compararPuntajes(base, nuevo);
    expect(comparacion.find((valor) => valor.id === 'papa-haba-cebada')?.modificado).toBeUndefined();
    expect(comparacion.find((valor) => valor.id === 'nueva-plantilla')?.indicadores.every((valor) => valor.diferencia === null)).toBe(true);
  });
});
