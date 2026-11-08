export interface RespuestaSalud {
  ok: true;
}

export interface UsuarioPublico {
  id: string; email: string; rol: 'agricultor' | 'tecnico'; nombre: string;
  parroquia: string | null; telefono: string | null;
  prioridad_agua: number | null; prioridad_suelo: number | null; prioridad_ingresos: number | null;
  creado_en: string | null;
}
export interface Credenciales { email: string; password: string }
export interface DatosRegistro extends Credenciales { nombre: string; parroquia?: string }
export interface RespuestaAutenticacion { token: string; usuario: UsuarioPublico }
export interface DatosPerfil {
  nombre: string; parroquia: string | null; telefono: string | null;
  prioridad_agua: number; prioridad_suelo: number; prioridad_ingresos: number;
}

export interface Terreno {
  id: string; usuario_id: string; nombre: string; latitud: number; longitud: number;
  altitud_m: number | null; area_ha: number | null; tiene_riego: boolean | null;
  tipo_suelo: string | null; creado_en: string | null;
}
export interface DatosTerreno {
  nombre: string; latitud: number; longitud: number; area_ha: number | null;
  tiene_riego: boolean; tipo_suelo: 'franco' | 'arenoso' | 'arcilloso' | 'no_se' | null;
}
export interface Siembra {
  id: string; terreno_id: string; cultivo_id: string; fecha_siembra: string;
  fecha_cosecha: string | null; notas: string | null; creado_en: string | null;
}
export interface DatosSiembra { cultivo_id: string; fecha_siembra: string; fecha_cosecha: string | null; notas: string | null }
export interface Cultivo {
  id: string; nombre: string; familia: string; altitud_min: number; altitud_max: number;
  ciclo_meses: number; meses_siembra: number[]; lluvia_min_mensual_mm: number; demanda_agua: number;
  tolerancia_helada: number; tolerancia_sequia: number; fija_nitrogeno: boolean; aporte_materia_organica: number;
  proteccion_erosion: number; valor_forraje: number; valor_mercado: number; descripcion: string | null;
}

export interface MesClima {
  mes: number; t_min: number | null; t_max: number | null; t_med: number | null;
  lluvia_mm: number | null; humedad_suelo: number | null; riesgo_helada: 'alto' | 'medio' | 'bajo' | null;
}
export interface RespuestaClima {
  mensual: MesClima[]; fuente: 'NASA POWER'; resolucion: string; periodo: { inicio: number; fin: number };
  actualizado_en: string; estado_datos: 'nasa' | 'cache' | 'desactualizado' | 'respaldo'; desactualizado: boolean;
  coordenadas: { latitud: number; longitud: number }; advertencias: string[]; metodologia: string;
  parametros: Record<string, { unidad: string; valores: (number | null)[] }>;
}

export interface DiaPronostico { fecha: string; t_min: number | null; t_max: number | null; precipitacion_mm: number | null }
export interface RespuestaPronostico {
  dias: DiaPronostico[]; alertas: { fecha: string; tipo: 'helada'; mensaje: string }[];
  fuente: 'Open-Meteo'; actualizado_en: string; vigente_hasta: string; estado_datos: 'open_meteo' | 'cache'; zona_horaria: 'America/Guayaquil';
  coordenadas: { latitud: number; longitud: number }; cuadricula: { latitud: number; longitud: number };
  unidades: { temperatura: '°C'; precipitacion: 'mm' }; umbral_helada_c: number; advertencias: string[]; aviso: string;
}
