import type { AnioTendencia, EstadisticaTendencia, RespuestaTendencia } from '../types/tendencia';

// Datos constantes sintéticos, exclusivamente para probar interfaz/contrato sin Internet.
export function tendenciaPrueba(sinDiario = false): RespuestaTendencia {
  const anual: AnioTendencia[] = Array.from({ length: 20 }, (_, i) => {
    const anio = 2005 + i; const dias = anio % 4 === 0 ? 366 : 365;
    return { anio, lluvia_mm: 1000, t_min: 1, humedad_suelo: 0.5, dias_helada: sinDiario ? null : 3,
      cobertura: { meses_lluvia: 12, meses_temperatura: 12, meses_humedad: 12, dias_temperatura: sinDiario ? 0 : dias, dias_esperados: dias } };
  });
  const resumen = (ausente = false): EstadisticaTendencia => ({ anios_validos: ausente ? [] : anual.map((a) => a.anio), anios_excluidos: ausente ? anual.map((a) => a.anio) : [], n: ausente ? 0 : 20,
    inicio: ausente ? null : 2005, fin: ausente ? null : 2024, pendiente_anual: ausente ? null : 0, pendiente_decada: ausente ? null : 0, diferencia_2005_2024: ausente ? null : 0, direccion: ausente ? 'no_determinada' : 'sin_cambio', metodo: 'Fixture constante controlada.' });
  const fuente = { estado_datos: 'cache' as const, actualizado_en: '2026-11-08T00:00:00Z', desactualizado: false, version_api: 'fixture', fuentes: ['Prueba controlada'], periodo_declarado: { inicio: '2005-01-01', fin: '2024-12-31' } };
  return { anual, fuente: 'NASA POWER', periodo: { inicio: 2005, fin: 2024 }, coordenadas: { latitud: -0.93, longitud: -78.62 }, resolucion: 'Resolución regional: fixture controlada.',
    unidades: { lluvia_mm: 'mm/año', t_min: '°C', humedad_suelo: 'índice 0–1', dias_helada: 'días/año' },
    fuentes: { mensual: { ...fuente, url: 'https://power.larc.nasa.gov/api/temporal/monthly/point' }, diario: { ...fuente, ...(sinDiario ? { estado_datos: 'no_disponible' as const, actualizado_en: null, periodo_declarado: null } : {}), url: 'https://power.larc.nasa.gov/api/temporal/daily/point' } },
    cobertura_diaria: { inicio: sinDiario ? null : '2005-01-01', fin: sinDiario ? null : '2024-12-31', dias_validos: sinDiario ? 0 : 7305, dias_esperados: 7305 },
    tendencias: { lluvia_mm: resumen(), t_min: resumen(), humedad_suelo: resumen(), dias_helada: resumen(sinDiario) }, advertencias: ['Datos sintéticos exclusivos de prueba.'],
    metodologia: { lluvia: 'Doce meses completos.', temperatura: 'Menor mínima mensual, no promedio.', heladas: 'Modeladas ≤0 °C, no alertas de pronóstico.', humedad: 'Índice, no humedad relativa.', estadistica: 'Sin prueba de significancia.' }, aviso: 'No es una medición del terreno.' };
}
