export interface HeladaTecnico {
  estado: 'posible_helada' | 'sin_alertas' | 'desconocido';
  alertas: { fecha: string; tipo: 'helada'; mensaje: string; t_min: number }[];
  fuente: 'Open-Meteo'; actualizado_en: string | null; vigente_hasta: string | null;
  dias_evaluados: number; umbral_helada_c: number; motivo: string;
}
export interface TerrenoTecnico {
  id: string; nombre: string; latitud: number; longitud: number; altitud_m: number | null; area_ha: number | null; tiene_riego: boolean | null; tipo_suelo: string | null;
  parroquia_perfil: string | null;
  ultima_siembra: { id: string; cultivo_id: string; cultivo_nombre: string; fecha_siembra: string; fecha_cosecha: string | null } | null;
  helada: HeladaTecnico;
}
export interface RespuestaPanelTecnico {
  terrenos: TerrenoTecnico[]; paginacion: { pagina: number; tamano: number; total: number; paginas: number };
  parroquias: string[]; consultado_en: string; metodologia: string; aviso: string;
}
export interface FiltrosPanelTecnico { parroquia: string; cultivo: string; pagina: number }
