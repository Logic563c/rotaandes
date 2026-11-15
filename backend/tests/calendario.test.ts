import { describe, expect, it } from 'vitest';
import latacunga from '../src/data/clima/latacunga.json' with { type: 'json' };
import { calcularCalendario, describirCultivos, esquemaCultivosCalendario, IDS_CULTIVOS_CALENDARIO, validarConsultaCalendario } from '../src/services/calendario.js';
import type { CeldaCalendario } from '../src/services/calendario.js';
import { catalogoCompleto, cultivosAmpliados, cultivosReferenciales } from '../src/data/catalogoCultivos.js';
import { FUENTES_AGRONOMICAS, IDS_CULTIVOS_NUEVOS, IDS_CULTIVOS_ORIGINALES, PERFILES_AGRONOMICOS } from '../src/data/perfilesAgronomicos.js';
import { construirMensual, diasMediosMes, procesarRespuestaNasa } from '../src/services/nasaPower.js';
import { crearEntradaCalendario } from './fixtures/calendarioPruebas.js';

const SOLICITADOS = ['Col', 'Remolacha', 'Lechuga', 'Cilantro', 'Apio', 'Perejil', 'Zanahoria', 'Cebolla colorada', 'Cebolla blanca', 'Coliflor', 'Papa nabo',
  'Col china', 'Rábano', 'Fréjol', 'Zapallo', 'Zambo', 'Berro', 'Acelga', 'Melloco'];
const celda = (celdas: CeldaCalendario[], id: string, mes: number) => celdas.find((valor) => valor.cultivo_id === id && valor.mes === mes);
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

describe('Catálogo ampliado: 19 cultivos solicitados, nombres y fuentes', () => {
  it('incluye exactamente los 19 cultivos pedidos por el cliente, sin duplicar los 10 originales', () => {
    expect(cultivosAmpliados.map((cultivo) => cultivo.nombre)).toEqual(SOLICITADOS);
    expect(catalogoCompleto).toHaveLength(29); expect(IDS_CULTIVOS_CALENDARIO).toHaveLength(29);
    expect(new Set(catalogoCompleto.map((cultivo) => cultivo.id)).size).toBe(29);
    expect(new Set(catalogoCompleto.map((cultivo) => normalizar(cultivo.nombre))).size).toBe(29);
    for (const id of IDS_CULTIVOS_NUEVOS) expect(IDS_CULTIVOS_ORIGINALES as readonly string[]).not.toContain(id);
  });
  it('conserva sin cambios los valores de los 10 cultivos originales de PROYECTO.md §10', () => {
    expect(catalogoCompleto.slice(0, 10)).toEqual(cultivosReferenciales);
    expect(cultivosReferenciales.find((cultivo) => cultivo.id === 'papa')).toMatchObject({ altitudMin: 2700, altitudMax: 3800, cicloMeses: 6, mesesSiembra: [10, 11, 12, 1], toleranciaHelada: 2, valorMercado: 5 });
  });
  it('no inventa puntuaciones: los índices de rotación de los cultivos nuevos quedan en null', () => {
    for (const cultivo of cultivosAmpliados) {
      expect(cultivo).toMatchObject({ demandaAgua: null, toleranciaHelada: null, toleranciaSequia: null, aporteMateriaOrganica: null, proteccionErosion: null, valorForraje: null, valorMercado: null, lluviaMinMensualMm: null });
      expect(cultivo.cicloMeses).toBeGreaterThanOrEqual(1); expect(cultivo.cicloMeses).toBeLessThanOrEqual(12);
    }
    expect(cultivosAmpliados.filter((cultivo) => cultivo.fijaNitrogeno).map((cultivo) => cultivo.id)).toEqual(['frejol']);
  });
  it('aclara las denominaciones regionales ambiguas con especie y nota', () => {
    const perfil = (id: string) => PERFILES_AGRONOMICOS.find((valor) => valor.id === id);
    expect(perfil('papa_nabo')).toMatchObject({ nombre_cientifico: 'Brassica rapa subsp. rapa', familia_botanica: 'Brassicaceae', categoria: 'raiz' });
    expect(perfil('papa_nabo')?.nota_denominacion).toContain('no es una papa');
    expect(perfil('cebolla_blanca')?.nombre_cientifico).toBe('Allium fistulosum'); expect(perfil('cebolla_colorada')?.nombre_cientifico).toContain('Allium cepa');
    expect(perfil('col')?.nombre_cientifico).toBe('Brassica oleracea var. capitata'); expect(perfil('col_china')?.nota_denominacion).toContain('pekinensis');
    expect(perfil('zambo')?.nombre_cientifico).toBe('Cucurbita ficifolia'); expect(perfil('melloco')?.nombre_cientifico).toBe('Ullucus tuberosus');
  });
  it('no clasifica todo como hortaliza de ciclo corto: leguminosa, tubérculo y cucurbitáceas conservan su categoría y ciclo', () => {
    const descritos = describirCultivos(esquemaCultivosCalendario.parse(catalogoCompleto));
    const de = (id: string) => descritos.find((valor) => valor.id === id);
    expect(de('frejol')).toMatchObject({ categoria: 'leguminosa', es_hortaliza: false }); expect(de('melloco')).toMatchObject({ categoria: 'tuberculo', es_hortaliza: false, ciclo_corto: false });
    expect(de('zapallo')).toMatchObject({ categoria: 'fruto', es_hortaliza: true }); expect(de('rabano')).toMatchObject({ ciclo_corto: true, ciclo_dias_max: 45 });
    expect(de('cebolla_colorada')).toMatchObject({ ciclo_corto: false, ciclo_meses_evaluados: 7 });
    expect(descritos.filter((valor) => valor.ciclo_corto).length).toBeGreaterThan(5); expect(descritos.filter((valor) => !valor.ciclo_corto).length).toBeGreaterThan(10);
  });
  it('cada perfil tiene ciclo y fuentes registradas con referencia y enlace', () => {
    expect(PERFILES_AGRONOMICOS).toHaveLength(29);
    for (const perfil of PERFILES_AGRONOMICOS) {
      expect(perfil.ciclo_dias.min).toBeLessThanOrEqual(perfil.ciclo_dias.max); expect(perfil.fuentes.length).toBeGreaterThan(0);
      for (const clave of perfil.fuentes) { expect(FUENTES_AGRONOMICAS[clave].referencia.length).toBeGreaterThan(20); expect(FUENTES_AGRONOMICAS[clave].url).toMatch(/^(https:\/\/|PROYECTO\.md)/); }
      if (perfil.temperatura) expect(perfil.temperatura.minima <= perfil.temperatura.optima_min && perfil.temperatura.optima_min <= perfil.temperatura.optima_max && perfil.temperatura.optima_max <= perfil.temperatura.maxima).toBe(true);
    }
  });
});

describe('Calendario v2: cuatro estados con motivo', () => {
  it('genera 29 × 12 celdas deterministas sin modificar entradas, con motivo, resumen y fuentes', () => {
    const entrada = crearEntradaCalendario(); const original = structuredClone(entrada);
    const resultado = calcularCalendario(entrada); expect(resultado).toEqual(calcularCalendario(entrada)); expect(entrada).toEqual(original);
    expect(resultado).toHaveLength(348);
    for (const id of IDS_CULTIVOS_CALENDARIO) expect(resultado.filter((valor) => valor.cultivo_id === id).map((valor) => valor.mes)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const valor of resultado) { expect(valor.motivo.startsWith(valor.resumen)).toBe(true); expect(valor.motivo).toContain('NASA no evalúa cultivos'); expect(valor.motivo).toContain('Fuentes agronómicas:'); }
  });
  it('recomienda cuando época, altitud, temperatura, heladas y agua son favorables', () => {
    const entrada = crearEntradaCalendario(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = 120; });
    const papa = celda(calcularCalendario(entrada), 'papa', 10);
    expect(papa?.estado).toBe('recomendado'); expect(papa?.resumen).toContain('favorecen sembrar Papa en octubre');
  });
  it('no usa una ventana sin validación como riesgo si clima y agua son favorables', () => {
    const entrada = crearEntradaCalendario(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = 120; });
    const junio = celda(calcularCalendario(entrada), 'papa', 6);
    expect(junio?.estado).toBe('recomendado'); expect(junio?.motivo).toContain('fuera de la época referencial');
  });
  it('no recomienda con una incompatibilidad justificada: lluvia bajo el mínimo FAO del ciclo y sin riego', () => {
    const entrada = crearEntradaCalendario(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = 70; });
    const papa = celda(calcularCalendario(entrada), 'papa', 10);
    expect(papa?.estado).toBe('no_recomendado'); expect(papa?.motivo).toContain('Lluvia promedio del ciclo (6 meses, NASA): 420 mm'); expect(papa?.motivo).toContain('500-700 mm');
  });
  it('no determina cuando falta información y no la interpreta como desfavorable', () => {
    const entrada = crearEntradaCalendario();
    const lechuga = celda(calcularCalendario(entrada), 'lechuga', 1);
    expect(lechuga?.estado).toBe('no_determinado'); expect(lechuga?.resumen).toContain('no se sabe cuánta agua necesita sin riego');
    entrada.terreno.tieneRiego = true; expect(celda(calcularCalendario(entrada), 'lechuga', 1)?.estado).toBe('recomendado');
  });
  it('sin altitud no produce verde ni amarillo y conserva exclusiones justificadas', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.altitudM = null; entrada.terreno.tieneRiego = false;
    entrada.mensual.forEach((mes) => { mes.lluvia_mm = 0; }); const celdas = calcularCalendario(entrada);
    expect(celdas.some((valor) => valor.estado === 'recomendado' || valor.estado === 'posible_con_cuidado')).toBe(false);
    expect(celda(celdas, 'papa', 1)?.estado).toBe('no_recomendado');
    expect(celda(celdas, 'berro', 1)?.estado).toBe('no_determinado');
  });
});

describe('Calendario v2: riego, agua y ciclos', () => {
  it.each([[true, 'no_determinado'], [false, 'no_determinado'], [null, 'no_determinado']] as const)('berro necesita confirmar agua permanente: riego %s → %s', (riego, estado) => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = riego; expect(celda(calcularCalendario(entrada), 'berro', 3)?.estado).toBe(estado);
  });
  it.each([[100, 'recomendado'], [60, 'posible_con_cuidado'], [40, 'no_recomendado']] as const)('cebolla colorada sin riego con %s mm/mes compara 7 meses con FAO 350-550 mm', (lluvia, estado) => {
    const entrada = crearEntradaCalendario(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = lluvia; });
    const resultado = celda(calcularCalendario(entrada), 'cebolla_colorada', 1); expect(resultado?.estado).toBe(estado); expect(resultado?.motivo).toContain('350-550 mm');
  });
  it('con riego desconocido y lluvia insuficiente no determina en lugar de excluir', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = null; entrada.mensual.forEach((mes) => { mes.lluvia_mm = 40; });
    expect(celda(calcularCalendario(entrada), 'cebolla_colorada', 1)?.estado).toBe('no_determinado');
  });
  it('evalúa meses consecutivos del ciclo, también cruzando el año', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true;
    const noviembre = celda(calcularCalendario(entrada), 'cebolla_colorada', 11);
    expect(noviembre?.motivo).toContain('Meses evaluados: noviembre, diciembre, enero, febrero, marzo, abril, mayo.');
  });
  it('un ciclo corto evita un mes de helada que un ciclo largo sí alcanza', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true;
    const mayo = entrada.mensual.find((mes) => mes.mes === 5); if (mayo) { mayo.t_min = 1; mayo.riesgo_helada = 'alto'; }
    const celdas = calcularCalendario(entrada);
    expect(celda(celdas, 'rabano', 1)?.estado).toBe('recomendado'); // 2 meses: enero-febrero
    expect(celda(celdas, 'cebolla_colorada', 1)?.estado).toBe('posible_con_cuidado'); // 7 meses: incluye mayo
    expect(celda(celdas, 'cebolla_colorada', 1)?.motivo).toContain('mayo alto');
    expect(celda(celdas, 'rabano', 4)?.estado).toBe('posible_con_cuidado'); // abril-mayo
  });
  it('el área declarada no cambia clasificaciones ni inventa capacidad de riego', () => {
    const entrada = crearEntradaCalendario(); const original = calcularCalendario(entrada); entrada.terreno.areaHa = null; expect(calcularCalendario(entrada)).toEqual(original);
    entrada.terreno.areaHa = 999999.99; expect(calcularCalendario(entrada)).toEqual(original);
  });
});

describe('Calendario v2: heladas y altitud', () => {
  const conHeladaAlta = () => { const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.mensual.forEach((mes) => { mes.t_min = 1; mes.riesgo_helada = 'alto'; }); return entrada; };
  it.each([['maiz', 'no_recomendado'], ['papa', 'posible_con_cuidado'], ['lechuga', 'no_recomendado'], ['apio', 'posible_con_cuidado'], ['haba', 'recomendado']] as const)(
    'con riesgo alto todo el ciclo %s queda %s según su tolerancia documentada', (id, estado) => {
      const resultado = calcularCalendario(conHeladaAlta()); const mes = id === 'haba' ? 10 : id === 'maiz' ? 9 : id === 'papa' ? 10 : 1;
      expect(celda(resultado, id, mes)?.estado).toBe(estado);
    });
  it('el riesgo medio da precaución a cultivos sensibles y moderados y no limita a los tolerantes', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.mensual.forEach((mes) => { mes.t_min = 4; mes.riesgo_helada = 'medio'; });
    const resultado = calcularCalendario(entrada);
    expect(celda(resultado, 'maiz', 9)?.estado).toBe('posible_con_cuidado'); expect(celda(resultado, 'papa', 10)?.estado).toBe('posible_con_cuidado');
    expect(celda(resultado, 'haba', 10)?.estado).toBe('recomendado');
  });
  it('estima la temperatura a la altitud del terreno (6,9 °C/km) y excluye lo demasiado frío', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.terreno.altitudM = 3900; entrada.elevacionCeldaM = 2900; // −6,9 °C: media 6,1 °C
    const resultado = calcularCalendario(entrada);
    expect(celda(resultado, 'zapallo', 1)?.estado).toBe('no_recomendado'); expect(celda(resultado, 'zapallo', 1)?.resumen).toContain('demasiado frío');
    expect(celda(resultado, 'zapallo', 1)?.motivo).toContain('-6,9 °C');
  });
  it('si la altitud local del catálogo admite el cultivo y EcoCrop no, advierte el conflicto en vez de excluir', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.terreno.altitudM = 3700; entrada.elevacionCeldaM = 2958;
    entrada.mensual.forEach((mes) => { mes.t_med = 11.5; }); // 11,5 − 5,1 = 6,4 °C < 7 °C (mínimo EcoCrop de papa)
    const papa = celda(calcularCalendario(entrada), 'papa', 10);
    expect(papa?.estado).toBe('no_determinado'); expect(papa?.resumen).toContain('fuentes de temperatura y altitud no coinciden');
  });
  it('una celda NASA más baja que el terreno no oculta heladas: usa la mínima estimada a su altitud si es mayor el riesgo', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.terreno.altitudM = 3650; entrada.elevacionCeldaM = 2500;
    entrada.mensual.forEach((mes) => { mes.t_min = 6; mes.t_med = 15; mes.riesgo_helada = 'medio'; }); // 6 − 6,3 = −0,3 °C → alto
    const lechuga = celda(calcularCalendario(entrada), 'lechuga', 1);
    expect(lechuga?.motivo).toContain('enero alto'); expect(lechuga?.motivo).toContain('5,5 °C/km');
  });
  it('fuera del rango referencial conserva información y evalúa la temperatura antes de atribuir riesgo', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.terreno.altitudM = 2750; entrada.elevacionCeldaM = 2750;
    const cebada = celda(calcularCalendario(entrada), 'cebada', 1);
    expect(cebada?.estado).toBe('recomendado'); expect(cebada?.motivo).toContain('fuera del rango referencial del catálogo del proyecto: 2800-3600 m');
  });
  it('sin altitud de la celda NASA no confirma exclusiones por temperatura y lo advierte', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.elevacionCeldaM = null; entrada.mensual.forEach((mes) => { mes.t_min = 3; mes.t_med = 5; mes.t_max = 9; mes.riesgo_helada = 'medio'; });
    const zapallo = celda(calcularCalendario(entrada), 'zapallo', 1);
    expect(zapallo?.estado).toBe('no_determinado'); expect(zapallo?.motivo).toContain('falta la altitud de la celda NASA');
  });
});

describe('Calendario v2: qué puede hacer el agricultor', () => {
  it('cuando falta información explica qué se desconoce y qué puede hacer, sin cambiar el estado', () => {
    const entrada = crearEntradaCalendario(); const lechuga = celda(calcularCalendario(entrada), 'lechuga', 1);
    expect(lechuga?.estado).toBe('no_determinado'); expect(lechuga?.motivo).toContain('No hay una necesidad de agua por ciclo con fuente');
    expect(lechuga?.motivo).toContain('• Qué puedes hacer: Si puedes regar, indícalo en el terreno');
    entrada.terreno.tieneRiego = null; entrada.mensual.forEach((mes) => { mes.lluvia_mm = 40; });
    expect(celda(calcularCalendario(entrada), 'cebolla_colorada', 1)?.motivo).toContain('indica al editar el terreno si tiene riego'.replace(/^./, (letra) => letra.toUpperCase()));
    const sinAltitud = crearEntradaCalendario(); sinAltitud.terreno.altitudM = null;
    expect(celda(calcularCalendario(sinAltitud), 'papa', 10)?.motivo).toContain('Revisa la ubicación del terreno en el mapa');
  });
  it('en precaución sugiere acciones del riesgo concreto; en recomendado no añade acciones', () => {
    const entrada = crearEntradaCalendario(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = 120; });
    const mesFrio = entrada.mensual.find((mes) => mes.mes === 6); if (!mesFrio) throw new Error('Fixture incompleta.'); mesFrio.t_min = 1;
    const junio = celda(calcularCalendario(entrada), 'papa', 6); const octubre = celda(calcularCalendario(entrada), 'papa', 10);
    expect(junio?.estado).toBe('posible_con_cuidado'); expect(junio?.motivo).toContain('Qué puedes hacer: Protege el cultivo en noches frías');
    expect(octubre?.estado).toBe('recomendado'); expect(octubre?.motivo).not.toContain('Qué puedes hacer');
    const conHelada = crearEntradaCalendario(); conHelada.terreno.tieneRiego = true; conHelada.mensual.forEach((mes) => { mes.t_min = 1; mes.riesgo_helada = 'alto'; });
    expect(celda(calcularCalendario(conHelada), 'acelga', 1)?.motivo).toContain('Protege el cultivo en noches frías');
  });
});

describe('Calendario v2: simulador y validación', () => {
  it.each([[-30, 'no_recomendado'], [0, 'posible_con_cuidado'], [30, 'recomendado']] as const)('el escenario de lluvia %s %% cambia el agua del ciclo de forma determinista', (lluviaPct, estado) => {
    const entrada = crearEntradaCalendario(); entrada.mensual.forEach((mes) => { mes.lluvia_mm = 100; }); entrada.escenario.lluviaPct = lluviaPct;
    const papa = celda(calcularCalendario(entrada), 'papa', 10); expect(papa?.estado).toBe(estado);
    if (lluviaPct !== 0) expect(papa?.motivo).toContain('Escenario hipotético aplicado');
  });
  it('el escenario de temperatura se aplica a la media y recalcula heladas con la regla existente', () => {
    const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; entrada.mensual.forEach((mes) => { mes.t_min = 4; mes.t_med = 9.5; mes.riesgo_helada = 'medio'; });
    entrada.escenario.tempDelta = -2; // media 7,5 °C < 9 °C de zapallo; mínima 2 °C → riesgo alto
    const resultado = calcularCalendario(entrada);
    expect(celda(resultado, 'zapallo', 1)?.estado).toBe('no_recomendado'); expect(celda(resultado, 'papa', 10)?.motivo).toContain('octubre alto');
  });
  it.each([{ lluvia_pct: '-30', temp_delta: '-2' }, { lluvia_pct: '30', temp_delta: '2' }, {}])('valida escenarios permitidos %j', (consulta) => { expect(() => validarConsultaCalendario(consulta)).not.toThrow(); });
  it('rechaza cultivos inventados, duplicados, meses y datos inválidos sin generar un estado favorable', () => {
    const entrada = crearEntradaCalendario();
    expect(() => calcularCalendario({ ...entrada, cultivos: [{ ...entrada.cultivos[0], id: 'inventado' }] })).toThrow();
    expect(() => calcularCalendario({ ...entrada, cultivos: [entrada.cultivos[0], entrada.cultivos[0]] })).toThrow();
    expect(() => calcularCalendario({ ...entrada, cultivos: [{ ...entrada.cultivos[0], altitudMin: 3000, altitudMax: null }] })).toThrow();
    for (const mes of [{ mes: 13 }, { ...entrada.mensual[0], t_med: 99, t_max: 18 }, { ...entrada.mensual[0], lluvia_mm: -1 }]) expect(() => calcularCalendario({ ...entrada, mensual: [mes] })).toThrow();
    expect(() => calcularCalendario({ ...entrada, elevacionCeldaM: 99999 })).toThrow();
  });
  it('acepta un catálogo parcial: evalúa solo los cultivos presentes', () => {
    const entrada = crearEntradaCalendario(); entrada.cultivos = entrada.cultivos.filter((cultivo) => cultivo.id === 'papa' || cultivo.id === 'lechuga');
    expect(new Set(calcularCalendario(entrada).map((valor) => valor.cultivo_id))).toEqual(new Set(['lechuga', 'papa']));
  });
});

describe('Auditoría v2 con la respuesta NASA archivada de Latacunga (cálculo independiente de la lluvia)', () => {
  const base = procesarRespuestaNasa(latacunga, -0.93, -78.62, '2026-11-08T03:53:14.301Z');
  const precipitacion = (latacunga as { properties: { parameter: { PRECTOTCORR: Record<string, number> } } }).properties.parameter.PRECTOTCORR;
  const claves = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const lluviaMes = (mes: number) => (precipitacion[claves[mes - 1] ?? ''] ?? 0) * diasMediosMes(mes, base.periodo.inicio, base.periodo.fin);
  const calendario = (altitudM: number, tieneRiego: boolean) => calcularCalendario({ terreno: { altitudM, tieneRiego, areaHa: null }, cultivos: catalogoCompleto, mensual: construirMensual(base, altitudM), elevacionCeldaM: base.elevacion_celda_m ?? null });
  it('NASA informa la altitud de su celda y se conserva para el ajuste', () => { expect(base.elevacion_celda_m).toBeCloseTo(2958.26, 2); });
  it('papa a 3150 m sin riego: octubre con precaución (lluvia del ciclo ≥ 700 mm) y mayo no recomendado (< 500 mm)', () => {
    const octubre = [10, 11, 12, 1, 2, 3].reduce((suma, mes) => suma + lluviaMes(mes), 0); const mayo = [5, 6, 7, 8, 9, 10].reduce((suma, mes) => suma + lluviaMes(mes), 0);
    expect(octubre).toBeGreaterThanOrEqual(700); expect(mayo).toBeLessThan(500);
    const celdas = calendario(3150, false);
    expect(celda(celdas, 'papa', 10)?.estado).toBe('posible_con_cuidado'); expect(celda(celdas, 'papa', 10)?.motivo).toContain(`${Math.round(octubre).toLocaleString('es-EC')} mm`);
    expect(celda(celdas, 'papa', 5)?.estado).toBe('no_recomendado');
  });
  it('con riego, las hortalizas documentadas por INIAP tienen meses viables en todas las altitudes evaluadas hasta 3400 m', () => {
    for (const altitud of [2750, 2900, 3150, 3400]) {
      const celdas = calendario(altitud, true);
      for (const id of ['col', 'zanahoria', 'rabano', 'acelga']) expect(celdas.some((valor) => valor.cultivo_id === id && (valor.estado === 'recomendado' || valor.estado === 'posible_con_cuidado')), `${id} ${altitud}`).toBe(true);
      if (altitud === 3400) expect(celdas.filter((valor) => valor.cultivo_id === 'lechuga').every((valor) => valor.estado === 'no_recomendado')).toBe(true);
    }
  });
  it('sin riego no promete hortalizas cuya necesidad de agua no tiene fuente', () => {
    const celdas = calendario(2900, false);
    for (const id of ['lechuga', 'zanahoria', 'rabano', 'acelga']) expect(celdas.filter((valor) => valor.cultivo_id === id).every((valor) => valor.estado === 'no_determinado' || valor.estado === 'no_recomendado')).toBe(true);
  });
  it('conserva incompatibilidades de agua y frío sin imponer cuotas de colores', () => {
    const celdas = calendario(3000, false).filter((valor) => (IDS_CULTIVOS_ORIGINALES as readonly string[]).includes(valor.cultivo_id));
    expect(celda(celdas, 'papa', 5)?.estado).toBe('no_recomendado');
    expect(celda(celdas, 'papa', 5)?.motivo).toContain('No alcanza el mínimo');
    expect(celdas.filter((valor) => valor.estado === 'recomendado').every((valor) => !valor.resumen.includes('con precaución'))).toBe(true);
  });
});
