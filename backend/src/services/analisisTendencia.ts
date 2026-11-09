import { ANIOS_HISTORICOS, diasDelMes, FECHAS_HISTORICAS } from './nasaHistorico.js';
import type { BaseMensual, BaseDiaria } from './nasaHistorico.js';

const redondear = (valor: number) => Number(valor.toFixed(6));
export function construirAnual(mensual: BaseMensual | null, diario: BaseDiaria | null) {
  let desplazamientoDiario = 0;
  return ANIOS_HISTORICOS.map((anio, indice) => {
    const diasMeses = Array.from({ length: 12 }, (_, mes) => diasDelMes(anio, mes + 1));
    const diasEsperados = diasMeses.reduce((a, b) => a + b, 0);
    const lluvia = mensual?.parametros.PRECTOTCORR.valores.slice(indice * 12, indice * 12 + 12) ?? [];
    const temperatura = mensual?.parametros.T2M_MIN.valores.slice(indice * 12, indice * 12 + 12) ?? [];
    const humedad = mensual?.parametros.GWETTOP.valores.slice(indice * 12, indice * 12 + 12) ?? [];
    const minimas = diario?.valores.slice(desplazamientoDiario, desplazamientoDiario + diasEsperados) ?? []; desplazamientoDiario += diasEsperados;
    const contar = (serie: (number | null)[]) => serie.filter((v) => v !== null).length;
    return { anio,
      lluvia_mm: contar(lluvia) === 12 ? redondear(lluvia.reduce<number>((suma, valor, mes) => suma + (valor ?? 0) * (diasMeses[mes] ?? 0), 0)) : null,
      t_min: contar(temperatura) === 12 ? Math.min(...temperatura.filter((v): v is number => v !== null)) : null,
      humedad_suelo: contar(humedad) === 12 ? redondear(humedad.reduce<number>((suma, valor, mes) => suma + (valor ?? 0) * (diasMeses[mes] ?? 0), 0) / diasEsperados) : null,
      dias_helada: contar(minimas) === diasEsperados ? minimas.filter((v) => v !== null && v <= 0).length : null,
      cobertura: { meses_lluvia: contar(lluvia), meses_temperatura: contar(temperatura), meses_humedad: contar(humedad), dias_temperatura: contar(minimas), dias_esperados: diasEsperados },
    };
  });
}
export type AnioTendencia = ReturnType<typeof construirAnual>[number];
export type VariableTendencia = 'lluvia_mm' | 't_min' | 'humedad_suelo' | 'dias_helada';
export function calcularTendencia(anual: AnioTendencia[], variable: VariableTendencia) {
  const pares = anual.flatMap((fila) => fila[variable] === null ? [] : [{ anio: fila.anio, valor: fila[variable] }]);
  const primero = pares[0]; const ultimo = pares.at(-1);
  const inicioSolicitado = anual.find((fila) => fila.anio === 2005)?.[variable] ?? null;
  const finSolicitado = anual.find((fila) => fila.anio === 2024)?.[variable] ?? null;
  let pendiente: number | null = null;
  if (pares.length >= 15) {
    const x = pares.reduce((s, p) => s + p.anio, 0) / pares.length; const y = pares.reduce((s, p) => s + p.valor, 0) / pares.length;
    const denominador = pares.reduce((s, p) => s + (p.anio - x) ** 2, 0);
    if (denominador > 0) pendiente = pares.reduce((s, p) => s + (p.anio - x) * (p.valor - y), 0) / denominador;
  }
  return { anios_validos: pares.map((p) => p.anio), anios_excluidos: anual.filter((fila) => fila[variable] === null).map((fila) => fila.anio),
    inicio: primero?.anio ?? null, fin: ultimo?.anio ?? null, n: pares.length, pendiente_anual: pendiente === null ? null : redondear(pendiente),
    pendiente_decada: pendiente === null ? null : redondear(pendiente * 10),
    diferencia_2005_2024: inicioSolicitado === null || finSolicitado === null ? null : redondear(finSolicitado - inicioSolicitado),
    direccion: pendiente === null ? 'no_determinada' as const : redondear(pendiente) > 0 ? 'ascendente' as const : redondear(pendiente) < 0 ? 'descendente' as const : 'sin_cambio' as const,
    metodo: 'Regresión lineal descriptiva (mínimos cuadrados) sobre años completos por variable. Mínimo 15 de 20 años. No se calculan significancia, p-valores ni atribución causal.',
  };
}
export function describirCoberturaDiaria(base: BaseDiaria | null) {
  const posiciones = base?.valores.flatMap((valor, indice) => valor === null ? [] : [indice]) ?? [];
  const formato = (indice: number | undefined) => { const fecha = indice === undefined ? undefined : FECHAS_HISTORICAS[indice]; return fecha ? `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}` : null; };
  return { inicio: formato(posiciones[0]), fin: formato(posiciones.at(-1)), dias_validos: posiciones.length, dias_esperados: FECHAS_HISTORICAS.length };
}
