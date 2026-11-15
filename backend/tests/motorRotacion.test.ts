import { readFileSync } from 'node:fs';
import { calcularCalendario } from '../src/services/calendario.js';
import { describe, expect, it } from 'vitest';
import { compararRotaciones, sumarMesesRotacion } from '../src/services/motorRotacion.js';
import { plantillasReferenciales } from '../src/data/catalogoPlantillas.js';
import { crearEntradaRotaciones } from './fixtures/rotacionesPruebas.js';

describe('Rotaciones: heurística autorizada, explicable y determinista', () => {
  it('transcribe las ocho secuencias originales, conservando la mezcla vicia_avena', () => {
    const documento = readFileSync(new URL('../../PROYECTO.md', import.meta.url), 'utf8').split('### Plantillas de rotación (seed)')[1]?.split('### Usuarios demo')[0] ?? '';
    expect(plantillasReferenciales).toHaveLength(8);
    for (const plantilla of plantillasReferenciales) {
      const fila = documento.split('\n').find((linea) => linea.startsWith(`| ${plantilla.id} |`));
      const secuencia = fila?.split('|')[2]?.replace('(páramo)', '').trim().split(' → ').map((id) => id === 'vicia+avena' ? 'vicia_avena' : id.normalize('NFD').replace(/\p{M}/gu, ''));
      expect(plantilla.secuencia).toEqual(secuencia);
    }
    expect(plantillasReferenciales.find((valor) => valor.id === 'papa-vicia-papa')?.secuencia).toEqual(['papa', 'vicia_avena', 'papa']);
  });
  it('verifica cálculos manuales, top dos y desempate sin cifras agrícolas inventadas', () => {
    const resultado = compararRotaciones(crearEntradaRotaciones());
    expect(resultado.estrategias.map((valor) => valor.id)).toEqual(['actual', 'quinua-chocho-cebada', 'papa-chocho-quinua']);
    expect(resultado.estrategias[0]?.puntajes).toEqual({ agua: 50, suelo: 0, riesgo: 100, ingresos: 100, total: 62.5 });
    expect(resultado.estrategias[1]?.puntajes.total).toBe(74.31);
    expect(resultado.estrategias[2]?.puntajes.total).toBe(72.22);
    expect(resultado.estrategias[0]?.secuencia).toEqual(['papa', 'papa', 'papa']);
    expect(resultado.estrategias[0]?.vacios_informacion.join(' ')).toContain('no se inventan registros');
  });
  it('ordena el historial cronológicamente y completa con el último cultivo', () => {
    const entrada = crearEntradaRotaciones(); entrada.historial.push({ id: 'siembra-2', cultivoId: 'haba', fechaSiembra: '2025-10-01', fechaCosecha: null }); entrada.historial.reverse();
    expect(compararRotaciones(entrada).estrategias[0]?.secuencia).toEqual(['papa', 'haba', 'haba']);
    entrada.historial.push({ id: 'siembra-3', cultivoId: 'quinua', fechaSiembra: '2026-10-01', fechaCosecha: null }, { id: 'antigua', cultivoId: 'oca', fechaSiembra: '2024-01-01', fechaCosecha: null });
    expect(compararRotaciones(entrada).estrategias[0]?.secuencia).toEqual(['papa', 'haba', 'quinua']);
  });
  it('sin historial conserva el espacio actual no determinado, sin elegir un cultivo por defecto', () => {
    const entrada = crearEntradaRotaciones(); entrada.historial = [];
    const resultado = compararRotaciones(entrada);
    expect(resultado.estrategias).toHaveLength(3); expect(resultado.estrategias[0]).toMatchObject({ es_actual: true, secuencia: [], estado: 'no_determinado' });
    expect(resultado.estrategias[0]?.puntajes.total).toBeNull();
    expect(resultado.estrategias[1]?.id).not.toBeNull();
  });
  it('cambiar prioridades altera el ranking y mantiene el peso climático explícito', () => {
    const entrada = crearEntradaRotaciones(); entrada.prioridades = { agua: 1, suelo: 1, ingresos: 5 };
    expect(compararRotaciones(entrada).estrategias[1]?.id).toBe('papa-chocho-quinua');
    expect(compararRotaciones(entrada).metodologia.peso_riesgo).toBe(3);
  });
  it.each(['altitud', 'clima', 'prioridades', 'riego', 'cultivo'])('expresa incertidumbre por %s sin completar puntajes con cero', (caso) => {
    const entrada = crearEntradaRotaciones();
    if (caso === 'altitud') entrada.terreno.altitudM = null;
    if (caso === 'clima') entrada.mensual = [];
    if (caso === 'prioridades') entrada.prioridades.agua = null;
    if (caso === 'riego') { entrada.terreno.tieneRiego = null; entrada.mensual.forEach((mes) => { mes.lluvia_mm = null; }); }
    if (caso === 'cultivo') entrada.cultivos = [];
    const resultado = compararRotaciones(entrada); expect(resultado.estrategias[0]?.puntajes.total).toBeNull();
    expect(resultado.estrategias.slice(1).every((valor) => valor.id === null && valor.puntajes.total === null)).toBe(true);
  });
  // v2: el rango de altitud del catálogo es referencial (precaución); la exclusión la decide la temperatura con fuente.
  it('no selecciona plantillas con temperatura incompatible ni sustituye una segunda alternativa inexistente', () => {
    const entrada = crearEntradaRotaciones(); entrada.terreno.altitudM = 3900; entrada.elevacionCeldaM = 3900;
    entrada.mensual.forEach((mes) => { mes.t_min = -2; mes.t_med = 1; mes.t_max = 6; mes.riesgo_helada = 'alto'; });
    const resultado = compararRotaciones(entrada); expect(resultado.estrategias.slice(1).every((valor) => valor.id === null)).toBe(true);
    expect(resultado.estrategias[0]?.estado).toBe('no_recomendado');
    expect(resultado.estrategias[0]?.planificacion[0]?.motivo).toContain('demasiado frío');
  });
  it('fuera del rango de altitud referencial programa con precaución y lo explica, sin excluir por ese solo motivo', () => {
    const entrada = crearEntradaRotaciones(); entrada.terreno.altitudM = 3900; entrada.elevacionCeldaM = 3900;
    const actual = compararRotaciones(entrada).estrategias[0];
    expect(actual?.planificacion.every((paso) => paso.estado === 'posible_con_cuidado')).toBe(true);
    expect(actual?.planificacion[0]?.motivo).toContain('fuera del rango referencial del catálogo del proyecto: 2700-3800 m');
  });
  it('con una sola plantilla evaluable conserva una posición sin determinar, en vez de inventar otra', () => {
    const entrada = crearEntradaRotaciones(); entrada.plantillas = entrada.plantillas.filter((plantilla) => plantilla.id === 'papa-vicia-papa');
    expect(compararRotaciones(entrada).estrategias.map((valor) => valor.id)).toEqual(['actual', 'papa-vicia-papa', null]);
  });
  // v2: el requisito «brócoli solo con riego» no tenía fuente; ahora se compara la lluvia con el mínimo del catálogo (80 mm/mes).
  it('brócoli sin riego depende del mínimo de lluvia del catálogo y el cultivo combinado comparte ambas familias', () => {
    const entrada = crearEntradaRotaciones();
    expect(compararRotaciones(entrada).candidatas.find((valor) => valor.id === 'brocoli-haba-avena')?.total).not.toBeNull();
    entrada.mensual.forEach((mes) => { mes.lluvia_mm = 60; });
    // Con 60 mm/mes el brócoli queda con precaución por su mínimo del catálogo; la plantilla se excluye por la avena,
    // cuya necesidad FAO (450-650 mm por ciclo) no se cubre con 300 mm sin riego.
    const brocoli = calcularCalendario({ terreno: entrada.terreno, cultivos: entrada.cultivos, mensual: entrada.mensual, escenario: entrada.escenario, elevacionCeldaM: entrada.elevacionCeldaM })
      .find((celda) => celda.cultivo_id === 'brocoli' && celda.mes === 1);
    expect(brocoli?.estado).toBe('posible_con_cuidado'); expect(brocoli?.motivo).toContain('mínimo referencial del catálogo (80 mm/mes)');
    expect(compararRotaciones(entrada).candidatas.find((valor) => valor.id === 'brocoli-haba-avena')?.estado).toBe('no_recomendado');
    entrada.mensual.forEach((mes) => { mes.lluvia_mm = 100; }); entrada.terreno.tieneRiego = true;
    expect(compararRotaciones(entrada).candidatas.find((valor) => valor.id === 'brocoli-haba-avena')?.total).not.toBeNull();
    entrada.historial[0] = { id: '1', cultivoId: 'vicia_avena', fechaSiembra: '2025-01-01', fechaCosecha: null };
    const actual = compararRotaciones(entrada).estrategias[0]; expect(actual?.puntajes.suelo).toBe(75); expect(actual?.riesgos.join(' ')).toContain('familias compartidas');
  });
  it('los ciclos y las esperas cruzan años sin acortar duraciones ni programar meses rojos', () => {
    // 120 mm/mes: la papa alcanza la necesidad FAO del ciclo (720 mm ≥ 700) y sus meses de época quedan recomendados.
    const entrada = crearEntradaRotaciones(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = 120; });
    const actual = compararRotaciones(entrada).estrategias[0];
    expect(actual?.planificacion.every((paso) => paso.estado === 'recomendado')).toBe(true);
    expect(actual?.planificacion.map((paso) => [paso.inicio_estimado, paso.fin_estimado, paso.espera_meses])).toEqual([
      ['2030-12-01', '2031-06-01', 0], ['2031-10-01', '2032-04-01', 4], ['2032-10-01', '2033-04-01', 6],
    ]);
    expect(sumarMesesRotacion('2030-12-01', 2)).toBe('2031-02-01'); expect(sumarMesesRotacion('9999-12-01', 1)).toBeNull();
  });
  // v2: con riesgo alto todo el año, la papa (tolerancia 2/5) queda con precaución y el maíz (sensible, 1/5) excluido.
  it('si el riesgo de helada es alto todo el año excluye los cultivos sensibles y advierte en los moderados', () => {
    const entrada = crearEntradaRotaciones(); entrada.mensual.forEach((mes) => { mes.t_min = 0; mes.riesgo_helada = 'alto'; });
    const resultado = compararRotaciones(entrada); expect(resultado.estrategias[0]?.estado).toBe('posible_con_cuidado');
    expect(resultado.estrategias[0]?.riesgos.join(' ')).toContain('Papa: calendario con precaución');
    expect(resultado.estrategias[0]?.planificacion[0]?.motivo).toContain('riesgo alto de helada en el ciclo');
    expect(resultado.estrategias.slice(1).every((estrategia) => !estrategia.secuencia.includes('maiz'))).toBe(true);
    expect(resultado.candidatas.find((valor) => valor.id === 'maiz-haba-cebada')?.estado).toBe('no_recomendado');
  });
  it.each([[-30, -2], [0, 0], [30, 2]])('es determinista, no muta entradas y conserva escenarios (%s, %s)', (lluviaPct, tempDelta) => {
    const entrada = crearEntradaRotaciones(); entrada.escenario = { lluviaPct, tempDelta }; const antes = structuredClone(entrada);
    expect(compararRotaciones(entrada)).toEqual(compararRotaciones(entrada)); expect(entrada).toEqual(antes);
  });
  it('rechaza parámetros, fechas, códigos y plantillas alteradas; un catálogo parcial no recibe valores supuestos', () => {
    for (const cambio of [{ escenario: { lluviaPct: 31, tempDelta: 0 } }, { inicio: '2030-02-30' }, { inicio: '2030-01-02' }, { mensual: [{ mes: 13 }] }]) expect(() => compararRotaciones({ ...crearEntradaRotaciones(), ...cambio })).toThrow();
    const entrada = crearEntradaRotaciones(); const primera = entrada.plantillas[0]; if (primera) primera.secuencia = ['papa', 'inventado', 'cebada'];
    expect(() => compararRotaciones(entrada)).toThrow();
    const parcial: unknown = { ...crearEntradaRotaciones(), cultivos: [{ id: 'papa', nombre: 'Papa' }] };
    expect(compararRotaciones(parcial).estrategias[0]?.puntajes.total).toBeNull();
  });
  it('un atributo de mercado ausente deja ingresos/total nulos sin invalidar indicadores conocidos', () => {
    const entrada = crearEntradaRotaciones();
    const resultado = compararRotaciones({ ...entrada, cultivos: entrada.cultivos.map((valor) => valor.id === 'papa' ? { ...valor, valorMercado: null } : valor) });
    expect(resultado.estrategias[0]?.puntajes).toEqual({ agua: 50, suelo: 0, riesgo: 100, ingresos: null, total: null });
  });
  it('el desempate usa el ID y excluye una plantilla idéntica al patrón actual', () => {
    const entrada = crearEntradaRotaciones(); entrada.historial = ['papa', 'haba', 'cebada'].map((cultivoId, indice) => ({ id: String(indice), cultivoId, fechaSiembra: `202${indice}-01-01`, fechaCosecha: null }));
    expect(compararRotaciones(entrada).estrategias.slice(1).every((valor) => valor.id !== 'papa-haba-cebada')).toBe(true);
    const primera = compararRotaciones(entrada); entrada.plantillas.reverse(); expect(compararRotaciones(entrada).estrategias).toEqual(primera.estrategias);
    // Atributos sintéticos iguales para provocar un empate real, no datos semilla.
    const empate = { ...crearEntradaRotaciones(), historial: [], terreno: { altitudM: 3000, tieneRiego: true, areaHa: 1 },
      cultivos: entrada.cultivos.map((valor) => ({ ...valor, demandaAgua: 3, toleranciaHelada: 3, toleranciaSequia: 3, fijaNitrogeno: false, aporteMateriaOrganica: 3, proteccionErosion: 3, valorMercado: 3 })) };
    expect(compararRotaciones(empate).estrategias.slice(1).map((valor) => valor.id)).toEqual(['brocoli-haba-avena', 'maiz-haba-cebada']);
  });
});
