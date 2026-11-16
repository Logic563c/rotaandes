import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calcularCalendario } from '../src/services/calendario.js';
import type { CeldaCalendario, EstadoCalendario } from '../src/services/calendario.js';
import { construirMensual, procesarRespuestaNasa } from '../src/services/nasaPower.js';
import { catalogoCompleto } from '../src/data/catalogoCultivos.js';

// Respuesta real de NASA POWER (climatología 2001-2025, API v2.10.1) para el punto público de Latacunga
// (-0,93; -78,62), consultada el 15-11-2026. Altitud de la celda: 2958,26 m. No contiene datos de usuarios.
const respuesta: unknown = JSON.parse(readFileSync(new URL('./fixtures/clima/climatologia-latacunga-2026-11-15.json', import.meta.url), 'utf8'));
const base = procesarRespuestaNasa(respuesta, -0.93, -78.62, '2026-11-15T20:00:00.000Z');
const cultivos = catalogoCompleto.map((cultivo) => ({ id: cultivo.id, nombre: cultivo.nombre, altitudMin: cultivo.altitudMin ?? null, altitudMax: cultivo.altitudMax ?? null,
  cicloMeses: cultivo.cicloMeses, mesesSiembra: Array.isArray(cultivo.mesesSiembra) ? cultivo.mesesSiembra : [], lluviaMinMensualMm: cultivo.lluviaMinMensualMm ?? null, toleranciaHelada: cultivo.toleranciaHelada ?? null }));
function calendario(altitudM: number, tieneRiego: boolean | null, lluviaPct = 0): CeldaCalendario[] {
  return calcularCalendario({ terreno: { altitudM, tieneRiego, areaHa: 1 }, cultivos, mensual: construirMensual(base, altitudM), escenario: { lluviaPct, tempDelta: 0 }, elevacionCeldaM: base.elevacion_celda_m });
}
const estados = (celdas: CeldaCalendario[], cultivo: string) => celdas.filter((celda) => celda.cultivo_id === cultivo).sort((a, b) => a.mes - b.mes).map((celda) => celda.estado);
const conteos = (celdas: CeldaCalendario[], mes: number) => {
  const delMes = celdas.filter((celda) => celda.mes === mes);
  return (['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado'] as EstadoCalendario[]).map((estado) => delMes.filter((celda) => celda.estado === estado).length);
};
const R = 'recomendado'; const P = 'posible_con_cuidado';

describe('Riego declarado frente a la lluvia NASA real (Latacunga)', () => {
  it('reproduce la repetición anterior: los doce meses del terreno bajo con riego ya no son idénticos por suponer agua ilimitada', () => {
    const celdas = calendario(2775, true);
    expect(celdas).toHaveLength(348);
    for (let mes = 1; mes <= 12; mes++) expect(conteos(celdas, mes).reduce((suma, valor) => suma + valor, 0)).toBe(29);
    expect(conteos(celdas, 1)).toEqual([17, 4, 0, 8]); expect(conteos(celdas, 10)).toEqual([17, 4, 0, 8]);
    expect(conteos(celdas, 6)).toEqual([14, 7, 0, 8]); expect(conteos(celdas, 7)).toEqual([14, 7, 0, 8]);
  });

  it('regresión del caso observado: terreno a 2840 m con riego en esta celda (v3 daba 17/4/0/8 los doce meses)', () => {
    const celdas = calendario(2840, true);
    const esperado: Record<number, number[]> = { 1: [17, 4, 0, 8], 2: [17, 4, 0, 8], 3: [17, 4, 0, 8], 4: [17, 4, 0, 8], 5: [15, 6, 0, 8], 6: [14, 7, 0, 8],
      7: [14, 7, 0, 8], 8: [15, 6, 0, 8], 9: [17, 4, 0, 8], 10: [17, 4, 0, 8], 11: [17, 4, 0, 8], 12: [17, 4, 0, 8] };
    for (let mes = 1; mes <= 12; mes++) expect(conteos(celdas, mes)).toEqual(esperado[mes]);
    expect(estados(celdas, 'avena')).toEqual([R, R, R, R, P, P, P, P, R, R, R, R]);
    expect(estados(celdas, 'cebada')).toEqual([R, R, R, R, P, P, P, P, R, R, R, R]);
    expect(estados(celdas, 'col')).toEqual([R, R, R, R, R, P, P, R, R, R, R, R]);
  });

  it('la avena con riego solo depende del riego en los ciclos de la época seca, con la necesidad FAO y la lluvia NASA en el motivo', () => {
    const celdas = calendario(2775, true);
    expect(estados(celdas, 'avena')).toEqual([R, R, R, R, P, P, P, P, R, R, R, R]);
    const julio = celdas.find((celda) => celda.cultivo_id === 'avena' && celda.mes === 7);
    expect(julio?.resumen).toContain('depende del riego en el ciclo');
    expect(julio?.motivo).toMatch(/Lluvia promedio del ciclo \(5 meses, NASA\): \d+ mm\. Necesidad de agua del cultivo según FAO \(1986, Tabla 14\): 450-650 mm/);
    expect(julio?.motivo).toContain('no conoce el caudal, los turnos ni la disponibilidad real del riego');
    expect(julio?.motivo).toContain('Qué puedes hacer: Confirma que tu riego tenga agua suficiente');
    const octubre = celdas.find((celda) => celda.cultivo_id === 'avena' && celda.mes === 10);
    expect(octubre?.estado).toBe(R); expect(octubre?.motivo).toContain('La lluvia cubre al menos el mínimo');
  });

  it('el mínimo mensual referencial del catálogo marca la dependencia del riego solo en los meses secos del ciclo', () => {
    const celdas = calendario(2775, true);
    const brocoli = celdas.find((celda) => celda.cultivo_id === 'brocoli' && celda.mes === 7);
    expect(brocoli?.motivo).toMatch(/mínimo referencial del catálogo \(80 mm\/mes\): no lo alcanza en julio, agosto, septiembre/);
  });

  it('sin necesidad de agua con fuente, el riego no genera una precaución inventada', () => {
    const celdas = calendario(2775, true);
    for (const cultivo of ['acelga', 'zanahoria', 'coliflor', 'rabano']) {
      expect(estados(celdas, cultivo).every((estado) => estado === R)).toBe(true);
      expect(celdas.find((celda) => celda.cultivo_id === cultivo)?.motivo).toContain('No hay una necesidad de agua con fuente');
    }
  });

  it('cultivos que mantienen el mismo estado lo hacen por motivos verificables, no por un error', () => {
    const celdas = calendario(2775, true);
    // Papa y brócoli: tolerancia 2/5 del catálogo y riesgo medio de helada en todos los ciclos (mínima ajustada 2,9-6,1 °C).
    for (const cultivo of ['papa', 'brocoli']) expect(estados(celdas, cultivo).every((estado) => estado === P)).toBe(true);
    expect(celdas.find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1)?.resumen).toContain('riesgo medio de helada');
    // Haba: la lluvia mensual supera su mínimo referencial (50 mm) incluso en septiembre (51,6 mm) y su tolerancia es 3/5.
    expect(estados(celdas, 'haba').every((estado) => estado === R)).toBe(true);
  });

  it('el riego sigue mejorando respecto al secano y la lluvia del escenario modifica la dependencia', () => {
    const conRiego = calendario(2775, true); const sinRiego = calendario(2775, false);
    expect(sinRiego.filter((celda) => celda.estado === R).length).toBeLessThan(conRiego.filter((celda) => celda.estado === R).length);
    expect(sinRiego.some((celda) => celda.estado === 'no_recomendado')).toBe(true);
    expect(conRiego.some((celda) => celda.estado === 'no_recomendado')).toBe(false);
    const masLluvia = calendario(2775, true, 30);
    expect(masLluvia.filter((celda) => celda.estado === P).length).toBeLessThan(conRiego.filter((celda) => celda.estado === P).length);
  });

  it('la época referencial se informa sin cambiar el estado', () => {
    const celdas = calendario(2775, true);
    const marzo = celdas.find((celda) => celda.cultivo_id === 'avena' && celda.mes === 3); const enero = celdas.find((celda) => celda.cultivo_id === 'avena' && celda.mes === 1);
    expect(marzo?.estado).toBe(R); expect(enero?.estado).toBe(R);
    expect(marzo?.resumen).toContain('fuera de la época referencial'); expect(enero?.resumen).not.toContain('fuera de la época referencial');
    expect(marzo?.motivo).toContain('Confirma la época de siembra con un técnico');
  });

  it('a mayor altitud aparecen heladas altas de junio a septiembre y los meses cambian por frío', () => {
    const celdas = calendario(3150, true);
    expect(conteos(celdas, 10)).toEqual([17, 4, 0, 8]); expect(conteos(celdas, 7)).toEqual([5, 14, 2, 8]);
    expect(estados(celdas, 'lechuga')[6]).toBe('no_recomendado');
  });
});
