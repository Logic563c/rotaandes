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

export type EstadoCalendario = 'recomendado' | 'posible_con_cuidado' | 'no_recomendado' | 'no_determinado';
export interface CeldaCalendario { cultivo_id: string; mes: number; estado: EstadoCalendario; motivo: string }
export interface EscenarioCalendario { lluvia_pct: number; temp_delta: number }
export interface RespuestaCalendario {
  celdas: CeldaCalendario[]; cultivos: { id: string; nombre: string; altitud_min: number; altitud_max: number }[];
  terreno: { altitud_m: number | null; tiene_riego: boolean | null; area_ha: number | null }; escenario: EscenarioCalendario;
  clima: Pick<RespuestaClima, 'fuente' | 'resolucion' | 'periodo' | 'actualizado_en' | 'estado_datos' | 'desactualizado' | 'advertencias'>;
  aviso: string;
}

export interface PasoRotacion { cultivo_id: string; nombre: string; inicio_estimado: string | null; fin_estimado: string | null; ciclo_meses: number | null; espera_meses: number | null; estado: EstadoCalendario; motivo: string }
export interface EstrategiaRotacion {
  id: string | null; nombre: string; es_actual: boolean; secuencia: string[]; planificacion: PasoRotacion[]; estado: EstadoCalendario;
  puntajes: { agua: number | null; suelo: number | null; riesgo: number | null; ingresos: number | null; total: number | null };
  por_que: string; evidencia: string[]; beneficios: string[]; vacios_informacion: string[]; riesgos: string[]; aviso: string;
}
export interface RespuestaRotaciones {
  estrategias: EstrategiaRotacion[]; candidatas: { id: string | null; estado: EstadoCalendario; total: number | null }[];
  inicio_comun: string; escenario: EscenarioCalendario; metodologia: { version: 'heuristica_rotaciones_v1'; peso_riesgo: number; prioridades: { agua: number | null; suelo: number | null; ingresos: number | null }; aviso: string };
  clima: RespuestaCalendario['clima'] | null; advertencias: string[]; aviso: string;
}
