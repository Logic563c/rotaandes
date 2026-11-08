import { describe, expect, it } from 'vitest';
import { calcularCalendario, IDS_CULTIVOS_CALENDARIO, validarConsultaCalendario } from '../src/services/calendario.js';
import { crearEntradaCalendario } from './fixtures/calendarioPruebas.js';

describe('Calendario puro según reglas referenciales de PROYECTO.md', () => {
  it('genera 120 celdas deterministas, una por cultivo/mes, sin modificar entradas', () => {
    const entrada = crearEntradaCalendario(); const original = structuredClone(entrada);
    const resultado = calcularCalendario(entrada); expect(resultado).toEqual(calcularCalendario(entrada)); expect(entrada).toEqual(original);
    expect(resultado).toHaveLength(120); expect(new Set(resultado.map((celda) => celda.cultivo_id))).toEqual(new Set(IDS_CULTIVOS_CALENDARIO));
    for (const id of IDS_CULTIVOS_CALENDARIO) expect(resultado.filter((celda) => celda.cultivo_id === id).map((celda) => celda.mes)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
    expect(resultado.every((celda) => celda.motivo.includes('referencial') && celda.motivo.includes('NASA'))).toBe(true);
  });
  it.each([2700, 3000, 3800])('acepta altitud inclusiva de papa %s', (altitud) => {
    const entrada = crearEntradaCalendario(); entrada.terreno.altitudM = altitud;
    // Desde 3400 el riesgo mínimo bajo sube a medio, según el módulo NASA existente.
    const celda = calcularCalendario(entrada).find((valor) => valor.cultivo_id === 'papa' && valor.mes === 1);
    expect(celda?.estado).toBe(altitud >= 3400 ? 'posible_con_cuidado' : 'recomendado');
  });
  it.each([2699, 3801])('excluye papa fuera de rango %s incluso con riego y buen clima', (altitud) => {
    const entrada = crearEntradaCalendario(); entrada.terreno.altitudM = altitud; entrada.terreno.tieneRiego = true;
    const celdas = calcularCalendario(entrada).filter((celda) => celda.cultivo_id === 'papa'); expect(celdas.every((celda) => celda.estado === 'no_recomendado' && celda.motivo.includes('fuera del rango'))).toBe(true);
  });
  it('sin altitud no produce verde/amarillo; conserva exclusiones conocidas', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.altitudM = null;
    const celdas = calcularCalendario(entrada); expect(celdas.some((celda) => celda.estado === 'recomendado' || celda.estado === 'posible_con_cuidado')).toBe(false);
    expect(celdas.find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1)?.estado).toBe('no_determinado');
    expect(celdas.find((celda) => celda.cultivo_id === 'papa' && celda.mes === 2)?.estado).toBe('no_recomendado');
  });
  it.each([[60, false, 'recomendado'], [59.99, false, 'posible_con_cuidado'], [0, true, 'recomendado'], [null, false, 'no_determinado'], [null, true, 'recomendado'], [59, null, 'no_determinado'], [60, null, 'recomendado']] as const)('evalúa lluvia %s y riego %s sin inventar agua', (lluvia, riego, estado) => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = riego; if (entrada.mensual[0]) entrada.mensual[0].lluvia_mm = lluvia;
    const celda = calcularCalendario(entrada).find((valor) => valor.cultivo_id === 'papa' && valor.mes === 1); expect(celda?.estado).toBe(estado);
    expect(celda?.motivo).toContain(lluvia === null ? 'sin dato válido' : `${lluvia.toLocaleString('es-EC')} mm`);
  });
  it.each([[1, 'alto', 'no_recomendado'], [4, 'medio', 'posible_con_cuidado'], [6, 'bajo', 'recomendado'], [null, null, 'no_determinado']] as const)('evalúa riesgo %s en cultivo sensible', (minima, riesgo, estado) => {
    const entrada = crearEntradaCalendario(); if (entrada.mensual[1]) { entrada.mensual[1].t_min = minima; entrada.mensual[1].riesgo_helada = riesgo; }
    expect(calcularCalendario(entrada).find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1)?.estado).toBe(estado);
  });
  it('la helada alta conocida tiene precedencia sobre otra incertidumbre; tolerancia >2 no recibe una regla inventada', () => {
    const entrada = crearEntradaCalendario(); if (entrada.mensual[0]) entrada.mensual[0].lluvia_mm = null;
    if (entrada.mensual[1]) { entrada.mensual[1].t_min = 1; entrada.mensual[1].riesgo_helada = 'alto'; }
    const resultado = calcularCalendario(entrada); expect(resultado.find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1)?.estado).toBe('no_recomendado');
    const diciembre = entrada.mensual[11]; if (diciembre) { diciembre.t_min = 1; diciembre.riesgo_helada = 'alto'; }
    expect(calcularCalendario(entrada).find((celda) => celda.cultivo_id === 'haba' && celda.mes === 12)?.estado).toBe('recomendado');
  });
  it('evalúa diciembre, enero y febrero, no marzo, en la ventana que cruza el año', () => {
    const entrada = crearEntradaCalendario(); if (entrada.mensual[1]) { entrada.mensual[1].t_min = 2; entrada.mensual[1].riesgo_helada = 'alto'; }
    let celda = calcularCalendario(entrada).find((valor) => valor.cultivo_id === 'papa' && valor.mes === 12);
    expect(celda?.estado).toBe('no_recomendado'); expect(celda?.motivo).toContain('diciembre: bajo; enero: bajo; febrero: alto');
    entrada.mensual[1] = { mes: 2, t_min: 8, t_max: 18, lluvia_mm: 100, riesgo_helada: 'bajo' }; if (entrada.mensual[2]) { entrada.mensual[2].t_min = 1; entrada.mensual[2].riesgo_helada = 'alto'; }
    celda = calcularCalendario(entrada).find((valor) => valor.cultivo_id === 'papa' && valor.mes === 12); expect(celda?.estado).toBe('recomendado');
  });
  it('respeta ventanas de los diez cultivos, brócoli con riego y naturaleza de vicia_avena', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true;
    const resultado = calcularCalendario(entrada);
    for (const cultivo of entrada.cultivos) {
      const meses = Array.isArray(cultivo.mesesSiembra) ? cultivo.mesesSiembra : [];
      for (const celda of resultado.filter((valor) => valor.cultivo_id === cultivo.id)) expect(celda.estado).toBe(meses.includes(celda.mes) ? 'recomendado' : 'no_recomendado');
    }
    expect(resultado.find((celda) => celda.cultivo_id === 'vicia_avena')?.motivo).toContain('cultivo combinado Vicia + avena');
    entrada.terreno.tieneRiego = false; expect(calcularCalendario(entrada).filter((celda) => celda.cultivo_id === 'brocoli').every((celda) => celda.estado === 'no_recomendado')).toBe(true);
    entrada.terreno.tieneRiego = null; expect(calcularCalendario(entrada).filter((celda) => celda.cultivo_id === 'brocoli').every((celda) => celda.estado === 'no_determinado')).toBe(true);
  });
  it('acepta meses faltantes como incertidumbre y no usa humedad o temperatura máxima para inventar lluvia', () => {
    const entrada = crearEntradaCalendario(); entrada.mensual = entrada.mensual.filter((mes) => mes.mes !== 1);
    expect(calcularCalendario(entrada).find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1)?.estado).toBe('no_determinado');
  });
  it.each([-30, 0, 30])('aplica escenario de lluvia %s %% de forma determinista', (lluviaPct) => {
    const entrada = crearEntradaCalendario(); entrada.escenario.lluviaPct = lluviaPct; if (entrada.mensual[0]) entrada.mensual[0].lluvia_mm = 60;
    const celda = calcularCalendario(entrada).find((valor) => valor.cultivo_id === 'papa' && valor.mes === 1);
    expect(celda?.estado).toBe(lluviaPct < 0 ? 'posible_con_cuidado' : 'recomendado'); expect(celda?.motivo).toContain(`${60 * (1 + lluviaPct / 100)} mm`);
  });
  it.each([[-2, 'alto', 'no_recomendado'], [0, 'medio', 'posible_con_cuidado'], [2, 'bajo', 'recomendado']] as const)('recalcula heladas con delta %s °C mediante el módulo existente', (tempDelta, riesgo, estado) => {
    const entrada = crearEntradaCalendario(); entrada.escenario.tempDelta = tempDelta; if (entrada.mensual[0]) { entrada.mensual[0].t_min = 4; entrada.mensual[0].riesgo_helada = 'medio'; }
    const celda = calcularCalendario(entrada).find((valor) => valor.cultivo_id === 'papa' && valor.mes === 1); expect(celda?.estado).toBe(estado); expect(celda?.motivo).toContain(`enero: ${riesgo}`);
  });
  it.each([{ lluvia_pct: '-30', temp_delta: '-2' }, { lluvia_pct: '30', temp_delta: '2' }, {}, { lluvia_pct: '0', temp_delta: '0' }])('valida escenarios permitidos %j', (consulta) => { expect(() => validarConsultaCalendario(consulta)).not.toThrow(); });
  it.each([{ lluvia_pct: '31' }, { temp_delta: '-2.1' }, { lluvia_pct: '' }, { lluvia_pct: ' ' }, { temp_delta: 'NaN' }, { lluvia_pct: ['0', '30'] }, { temp_delta: {} }, { usuario_id: 'ajeno' }, { lluvia_pct: '1e1' }, { lluvia_pct: 'Infinity' }])('rechaza escenario inválido %j sin coerción engañosa', (consulta) => { expect(() => validarConsultaCalendario(consulta)).toThrow(); });
  it('rechaza códigos inválidos, rellenos y catálogos alterados sin generar un estado favorable', () => {
    const entrada = crearEntradaCalendario();
    for (const mes of [{ mes: 0 }, { ...entrada.mensual[0], riesgo_helada: 'verde' }, { ...entrada.mensual[0], t_min: -999 }, { ...entrada.mensual[0], lluvia_mm: -999 }, { ...entrada.mensual[0], lluvia_mm: NaN }]) expect(() => calcularCalendario({ ...entrada, mensual: [mes] })).toThrow();
    expect(() => calcularCalendario({ ...entrada, cultivos: [{ ...entrada.cultivos[0], id: 'inventado' }] })).toThrow();
    expect(() => calcularCalendario({ ...entrada, escenario: { lluviaPct: 31, tempDelta: 0 } })).toThrow();
    expect(() => calcularCalendario({ ...entrada, mensual: [...entrada.mensual, entrada.mensual[0]] })).toThrow();
  });
  it('el área no cambia clasificaciones ni inventa una capacidad de riego', () => {
    const entrada = crearEntradaCalendario(); const original = calcularCalendario(entrada); entrada.terreno.areaHa = null; expect(calcularCalendario(entrada)).toEqual(original);
    entrada.terreno.areaHa = 999999.99; expect(calcularCalendario(entrada)).toEqual(original);
  });
});
