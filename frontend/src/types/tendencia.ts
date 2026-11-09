export interface AnioTendencia {
  anio: number;
  lluvia_mm: number | null;
  t_min: number | null;
  humedad_suelo: number | null;
  dias_helada: number | null;
  cobertura: { meses_lluvia: number; meses_temperatura: number; meses_humedad: number; dias_temperatura: number; dias_esperados: number };
}
export interface EstadisticaTendencia {
  anios_validos: number[]; anios_excluidos: number[];
  inicio: number | null; fin: number | null; n: number;
  pendiente_anual: number | null; pendiente_decada: number | null; diferencia_2005_2024: number | null;
  direccion: 'ascendente' | 'descendente' | 'sin_cambio' | 'no_determinada'; metodo: string;
}
export interface FuenteTendencia {
  estado_datos: 'nasa' | 'cache' | 'desactualizado' | 'no_disponible'; actualizado_en: string | null;
  desactualizado: boolean; version_api: string | null; fuentes: string[];
  periodo_declarado: { inicio: string; fin: string } | null; url: string;
}
export interface RespuestaTendencia {
  anual: AnioTendencia[]; fuente: 'NASA POWER'; periodo: { inicio: 2005; fin: 2024 };
  coordenadas: { latitud: number; longitud: number }; resolucion: string;
  unidades: { lluvia_mm: 'mm/año'; t_min: '°C'; humedad_suelo: 'índice 0–1'; dias_helada: 'días/año' };
  fuentes: { mensual: FuenteTendencia; diario: FuenteTendencia };
  cobertura_diaria: { inicio: string | null; fin: string | null; dias_validos: number; dias_esperados: number };
  tendencias: { lluvia_mm: EstadisticaTendencia; t_min: EstadisticaTendencia; dias_helada: EstadisticaTendencia; humedad_suelo: EstadisticaTendencia };
  advertencias: string[]; metodologia: { lluvia: string; temperatura: string; humedad: string; heladas: string; estadistica: string }; aviso: string;
}
