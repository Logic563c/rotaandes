import { describe, expect, it, vi } from 'vitest';
import { calcularCalendario } from '../src/services/calendario.js';
import { crearServicioClima } from '../src/services/clima.js';
import { ErrorClima } from '../src/services/nasaPower.js';
import { crearEntradaCalendario } from './fixtures/calendarioPruebas.js';
import { crearBasePrueba } from './fixtures/nasaPruebas.js';

function conRiego() { const entrada = crearEntradaCalendario(); entrada.terreno.tieneRiego = true; return entrada; }
const de = (entrada: unknown, cultivo: string, mes = 1) => calcularCalendario(entrada).find((celda) => celda.cultivo_id === cultivo && celda.mes === mes);

describe('Clasificación de riesgos concretos y datos esenciales', () => {
  it.each(['riego', 'altitud', 'temperatura', 'lluvia'] as const)('recalcula los 29 cultivos y los doce resúmenes mensuales cuando cambia %s', (factor) => {
    const entrada = conRiego();
    if (factor === 'lluvia') entrada.terreno.tieneRiego = false;
    const antes = calcularCalendario(entrada);
    if (factor === 'riego') entrada.terreno.tieneRiego = false;
    if (factor === 'altitud') entrada.terreno.altitudM = 3800;
    if (factor === 'temperatura') entrada.escenario.tempDelta = -2;
    if (factor === 'lluvia') entrada.escenario.lluviaPct = -30;
    // Para temperatura se sitúa la mínima a ambos lados del umbral preventivo,
    // sin modificar perfiles ni parámetros agronómicos de los cultivos.
    if (factor === 'temperatura') {
      entrada.mensual.forEach((mes) => { mes.t_min = 3; mes.riesgo_helada = 'medio'; });
    }
    const base = factor === 'temperatura' ? calcularCalendario({ ...entrada, escenario: { lluviaPct: 0, tempDelta: 0 } }) : antes;
    const despues = calcularCalendario(entrada);
    expect(base).toHaveLength(348); expect(despues).toHaveLength(348);
    for (let mes = 1; mes <= 12; mes++) {
      const iniciales = base.filter((celda) => celda.mes === mes); const finales = despues.filter((celda) => celda.mes === mes);
      expect(finales).toHaveLength(29); expect(new Set(finales.map((celda) => celda.cultivo_id)).size).toBe(29);
      expect(finales.some((celda) => iniciales.find((inicial) => inicial.cultivo_id === celda.cultivo_id)?.estado !== celda.estado)).toBe(true);
      for (const celda of finales) {
        expect(celda.resumen.length).toBeGreaterThan(0); expect(celda.motivo).toContain(celda.resumen);
      }
    }
  });
  it('la altitud de celda ausente es información faltante, nunca amarillo permanente', () => {
    const entrada = conRiego(); entrada.elevacionCeldaM = null;
    const acelga = de(entrada, 'acelga');
    expect(acelga?.estado).toBe('no_determinado'); expect(acelga?.resumen).toContain('falta la altitud de la celda NASA');
    expect(acelga?.motivo).toContain('Qué puedes hacer:');
  });
  it('sin elevación NASA los doce resúmenes conservan los 29 casos sin determinar y explican el dato faltante', () => {
    const entrada = conRiego(); entrada.terreno.altitudM = 3650; entrada.elevacionCeldaM = null;
    const celdas = calcularCalendario(entrada);
    for (let mes = 1; mes <= 12; mes++) {
      const mensual = celdas.filter((celda) => celda.mes === mes); expect(mensual).toHaveLength(29);
      expect(mensual.every((celda) => celda.estado === 'no_determinado')).toBe(true);
      expect(mensual.every((celda) => celda.resumen.includes('falta la altitud de la celda NASA'))).toBe(true);
    }
  });
  it('el salto de 3399 a 3400 m no añade otra corrección si se conoce la altitud de la celda', () => {
    const entrada = conRiego(); entrada.elevacionCeldaM = 3400;
    entrada.mensual.forEach((mes) => { mes.t_min = 6; mes.t_med = 13; mes.riesgo_helada = 'medio'; });
    entrada.terreno.altitudM = 3399; const antes = de(entrada, 'acelga');
    entrada.terreno.altitudM = 3400; const despues = de(entrada, 'acelga');
    expect(antes?.estado).toBe('recomendado'); expect(despues?.estado).toBe('recomendado');
    expect(despues?.motivo).toContain('enero bajo'); expect(despues?.motivo).toContain('ajustada una sola vez');
  });
  it('un terreno por debajo de la celda utiliza su mínima estimada y no conserva el peor indicador regional', () => {
    const entrada = conRiego(); entrada.terreno.altitudM = 2750; entrada.elevacionCeldaM = 3000;
    entrada.mensual.forEach((mes) => { mes.t_min = 1.5; mes.riesgo_helada = 'alto'; });
    expect(de(entrada, 'acelga')?.estado).toBe('recomendado');
    expect(de(entrada, 'acelga')?.motivo).toContain('enero medio');
  });
  it('distingue tolerancia documentada de tolerancia desconocida con el mismo frío medio', () => {
    const entrada = conRiego(); entrada.mensual.forEach((mes) => { mes.t_min = 4; mes.riesgo_helada = 'medio'; });
    expect(de(entrada, 'acelga')?.estado).toBe('recomendado'); expect(de(entrada, 'acelga')?.motivo).toContain('Iowa State University');
    expect(de(entrada, 'col_china')?.estado).toBe('no_determinado'); expect(de(entrada, 'col_china')?.resumen).toContain('no se sabe cuánto resiste las heladas');
  });
  it.each([true, false, null])('riego %s no demuestra ni descarta el agua permanente requerida por berro', (riego) => {
    const entrada = conRiego(); entrada.terreno.tieneRiego = riego;
    expect(de(entrada, 'berro')?.estado).toBe('no_determinado'); expect(de(entrada, 'berro')?.resumen).toContain('no se ha confirmado agua permanente');
  });
  it('una helada en junio afecta al ciclo largo de acelga iniciado en febrero y no al rábano de febrero', () => {
    const entrada = conRiego(); entrada.mensual.forEach((mes) => { mes.t_min = mes.mes === 6 ? 1 : 6; mes.riesgo_helada = mes.mes === 6 ? 'alto' : 'bajo'; });
    expect(de(entrada, 'acelga', 1)?.estado).toBe('recomendado');
    expect(de(entrada, 'acelga', 2)?.estado).toBe('posible_con_cuidado');
    expect(de(entrada, 'rabano', 2)?.estado).toBe('recomendado');
    expect(de(entrada, 'acelga', 2)?.motivo).toContain('junio alto');
  });
  it('no oculta datos climáticos faltantes detrás de la tolerancia del cultivo', () => {
    const entrada = conRiego(); entrada.mensual[0] = { ...entrada.mensual[0], mes: 1, t_min: null, riesgo_helada: null };
    expect(de(entrada, 'haba', 1)?.estado).toBe('no_determinado');
  });
  it('conserva doce resultados recomendados si las condiciones son favorables todo el año', () => {
    const entrada = conRiego(); entrada.mensual.forEach((mes) => { mes.t_min = 6; mes.riesgo_helada = 'bajo'; });
    const filas = calcularCalendario(entrada).filter((celda) => celda.cultivo_id === 'acelga');
    expect(filas).toHaveLength(12); expect(filas.every((celda) => celda.estado === 'recomendado')).toBe(true);
  });
});

describe('Actualización de metadatos de climatologías anteriores', () => {
  const ahora = new Date('2030-01-02T00:00:00Z');
  const completa = () => crearBasePrueba('2030-01-01T00:00:00Z');
  function preparar() { const base = completa(); return { findUnique: vi.fn().mockResolvedValue({ datos: { ...base, elevacion_celda_m: null }, actualizadoEn: new Date(base.consultado_en) }), upsert: vi.fn().mockResolvedValue({}) }; }
  it('renueva una caché todavía vigente cuando falta la altitud de la celda', async () => {
    const cache = preparar(); const nasa = vi.fn().mockResolvedValue(completa());
    const resultado = await crearServicioClima(() => cache, nasa, () => null, () => ahora)(-0.93, -78.62, 3000);
    expect(nasa).toHaveBeenCalledOnce(); expect(cache.upsert).toHaveBeenCalledOnce();
    expect(resultado.elevacion_celda_m).toBe(2958.26); expect(resultado.estado_datos).toBe('nasa');
  });
  it('ante caída usa un respaldo completo de la misma celda, sin rejuvenecer la fecha ni escribir datos inventados', async () => {
    const cache = preparar(); const respaldo = crearBasePrueba('2029-12-01T00:00:00Z');
    const nasa = vi.fn().mockRejectedValue(new ErrorClima());
    const servicio = crearServicioClima(() => cache, nasa, () => respaldo, () => ahora);
    const resultado = await servicio(-0.93, -78.62, 3000);
    expect(resultado.estado_datos).toBe('respaldo'); expect(resultado.actualizado_en).toBe(respaldo.consultado_en);
    expect(resultado.desactualizado).toBe(true); expect(resultado.elevacion_celda_m).toBe(2958.26); expect(cache.upsert).not.toHaveBeenCalled();
    await servicio(-0.93, -78.62, 3000); expect(nasa).toHaveBeenCalledOnce();
  });
  it('sin proveedor ni respaldo conserva el clima anterior e identifica que no se conoce la altitud de la celda', async () => {
    const cache = preparar(); const resultado = await crearServicioClima(() => cache, vi.fn().mockRejectedValue(new ErrorClima()), () => null, () => ahora)(-0.93, -78.62, 3000);
    expect(resultado.elevacion_celda_m).toBeNull(); expect(cache.upsert).not.toHaveBeenCalled();
  });
});
