import type { RespuestaSalud } from '../types/api';
import type { Credenciales, DatosRegistro, DatosPerfil, RespuestaAutenticacion, UsuarioPublico } from '../types/api';
import { z } from 'zod';
import type { Terreno, DatosTerreno, Siembra, DatosSiembra, Cultivo } from '../types/api';
import type { RespuestaClima } from '../types/api';
import type { RespuestaPronostico } from '../types/api';
import type { EscenarioCalendario, RespuestaCalendario } from '../types/api';
import type { RespuestaRotaciones } from '../types/api';
import type { TipoCapa, ConsultaCapaVisual, RespuestaCapaVisual } from '../types/api';
import { validarUrlPublicacion } from './configuracionPublicacion';
import type { RespuestaTendencia } from '../types/tendencia';
import { esquemaTendencia } from './validarTendencia';
import { esquemaPanelTecnico } from './validarPanelTecnico';
import type { FiltrosPanelTecnico, RespuestaPanelTecnico } from '../types/tecnico';

export class ErrorApi extends Error {
  constructor(mensaje: string, public readonly codigoHttp?: number) { super(mensaje); }
}

function obtenerUrl(ruta: string): URL {
  let urlBase: URL;
  try {
    urlBase = import.meta.env.MODE === 'publicacion' ? validarUrlPublicacion(import.meta.env.VITE_API_URL) : new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');
  } catch {
    throw new ErrorApi('La dirección del servicio no está configurada correctamente.');
  }
  if (!['http:', 'https:'].includes(urlBase.protocol) || urlBase.username || urlBase.password
    || urlBase.search || urlBase.hash || urlBase.pathname !== '/') {
    throw new ErrorApi('La dirección del servicio no está configurada correctamente.');
  }
  return new URL(`/api${ruta}`, urlBase);
}

export async function obtenerEstadoServicio(senalExterna?: AbortSignal): Promise<RespuestaSalud> {
  try {
    const url = obtenerUrl('/health');
    const senalTiempo = AbortSignal.timeout(8000);
    const senal = senalExterna ? AbortSignal.any([senalExterna, senalTiempo]) : senalTiempo;
    const respuesta = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: senal,
    });

    if (!respuesta.ok) {
      throw new ErrorApi('El servicio no está disponible en este momento. Vuelve a intentarlo.');
    }

    const datos: unknown = await respuesta.json();
    if (typeof datos !== 'object' || datos === null || !('ok' in datos) || datos.ok !== true) {
      throw new ErrorApi('No pudimos confirmar el estado del servicio. Vuelve a intentarlo.');
    }
    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof ErrorApi) throw error;
    throw new Error('No pudimos conectar con RotaAndes. Comprueba tu conexión y vuelve a intentarlo.', { cause: error });
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> { return typeof valor === 'object' && valor !== null; }
function validarUsuario(datos: unknown): UsuarioPublico {
  const textoOpcional = (valor: unknown) => valor === null || typeof valor === 'string';
  const prioridad = (valor: unknown) => valor === null || (typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 5);
  if (!esObjeto(datos) || typeof datos.id !== 'string' || typeof datos.email !== 'string' || typeof datos.nombre !== 'string'
    || (datos.rol !== 'agricultor' && datos.rol !== 'tecnico') || !textoOpcional(datos.parroquia) || !textoOpcional(datos.telefono)
    || !textoOpcional(datos.creado_en) || !prioridad(datos.prioridad_agua) || !prioridad(datos.prioridad_suelo) || !prioridad(datos.prioridad_ingresos)) {
    throw new ErrorApi('La respuesta del servicio no tiene el formato esperado.');
  }
  return { id: datos.id, email: datos.email, nombre: datos.nombre, rol: datos.rol,
    parroquia: typeof datos.parroquia === 'string' ? datos.parroquia : null, telefono: typeof datos.telefono === 'string' ? datos.telefono : null,
    creado_en: typeof datos.creado_en === 'string' ? datos.creado_en : null,
    prioridad_agua: typeof datos.prioridad_agua === 'number' ? datos.prioridad_agua : null,
    prioridad_suelo: typeof datos.prioridad_suelo === 'number' ? datos.prioridad_suelo : null,
    prioridad_ingresos: typeof datos.prioridad_ingresos === 'number' ? datos.prioridad_ingresos : null };
}

async function solicitar(ruta: string, metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', token?: string, cuerpo?: unknown, signal?: AbortSignal, tiempoEsperaMs = 8000): Promise<unknown> {
  try {
    const respuesta = await fetch(obtenerUrl(ruta), { method: metodo, cache: 'no-store', credentials: 'omit',
      headers: { Accept: 'application/json', ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(tiempoEsperaMs)]) : AbortSignal.timeout(tiempoEsperaMs) });
    if (respuesta.status === 204) return undefined;
    const datos: unknown = await respuesta.json();
    if (!respuesta.ok) throw new ErrorApi(respuesta.status < 500 && esObjeto(datos) && typeof datos.error === 'string' ? datos.error : 'No se pudo completar la solicitud. Inténtalo de nuevo.', respuesta.status);
    return datos;
  } catch (error: unknown) {
    if (error instanceof ErrorApi) throw error;
    throw new ErrorApi('No pudimos conectar con RotaAndes. Comprueba tu conexión y vuelve a intentarlo.');
  }
}
async function autenticar(ruta: string, datos: Credenciales | DatosRegistro, signal?: AbortSignal): Promise<RespuestaAutenticacion> {
  const respuesta = await solicitar(ruta, 'POST', undefined, datos, signal);
  if (!esObjeto(respuesta) || typeof respuesta.token !== 'string' || respuesta.token.length > 2048) throw new ErrorApi('No se pudo confirmar la sesión.');
  return { token: respuesta.token, usuario: validarUsuario(respuesta.usuario) };
}
export const registrarUsuario = (datos: DatosRegistro, signal?: AbortSignal) => autenticar('/auth/registro', datos, signal);
export const iniciarSesion = (datos: Credenciales, signal?: AbortSignal) => autenticar('/auth/login', datos, signal);
export async function obtenerUsuario(token: string, signal?: AbortSignal): Promise<UsuarioPublico> { return validarUsuario(await solicitar('/auth/yo', 'GET', token, undefined, signal)); }
export async function actualizarPerfil(token: string, datos: DatosPerfil): Promise<UsuarioPublico> { return validarUsuario(await solicitar('/perfil', 'PUT', token, datos)); }

const numero = z.number().finite();
const esquemaTerreno = z.object({
  id: z.uuid(), usuario_id: z.uuid(), nombre: z.string(), latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180),
  altitud_m: numero.int().nullable(), area_ha: numero.nullable(), tiene_riego: z.boolean().nullable(), tipo_suelo: z.string().nullable(), creado_en: z.string().nullable(),
});
const esquemaSiembra = z.object({ id: z.uuid(), terreno_id: z.uuid(), cultivo_id: z.string(), fecha_siembra: z.iso.date(), fecha_cosecha: z.iso.date().nullable(), notas: z.string().nullable(), creado_en: z.string().nullable() });
const esquemaCultivo = z.object({ id: z.string(), nombre: z.string(), familia: z.string(), altitud_min: numero.int(), altitud_max: numero.int(),
  ciclo_meses: numero.int(), meses_siembra: z.array(numero.int().min(1).max(12)), lluvia_min_mensual_mm: numero,
  demanda_agua: numero, tolerancia_helada: numero, tolerancia_sequia: numero, fija_nitrogeno: z.boolean(), aporte_materia_organica: numero,
  proteccion_erosion: numero, valor_forraje: numero, valor_mercado: numero, descripcion: z.string().nullable() });
function comprobarRespuesta<T>(esquema: z.ZodType<T>, datos: unknown): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw new ErrorApi('La respuesta del servicio no tiene el formato esperado.');
  return resultado.data;
}
export async function listarTerrenos(token: string, signal?: AbortSignal): Promise<Terreno[]> { return comprobarRespuesta(z.array(esquemaTerreno), await solicitar('/terrenos', 'GET', token, undefined, signal)); }
export async function obtenerTerreno(token: string, id: string, signal?: AbortSignal): Promise<Terreno> { return comprobarRespuesta(esquemaTerreno, await solicitar(`/terrenos/${encodeURIComponent(id)}`, 'GET', token, undefined, signal)); }
export async function guardarTerreno(token: string, datos: DatosTerreno, id?: string): Promise<Terreno> { return comprobarRespuesta(esquemaTerreno, await solicitar(id ? `/terrenos/${encodeURIComponent(id)}` : '/terrenos', id ? 'PUT' : 'POST', token, datos)); }
export async function eliminarTerreno(token: string, id: string): Promise<void> { await solicitar(`/terrenos/${encodeURIComponent(id)}`, 'DELETE', token); }
export async function listarCultivos(signal?: AbortSignal): Promise<Cultivo[]> { return comprobarRespuesta(z.array(esquemaCultivo), await solicitar('/cultivos', 'GET', undefined, undefined, signal)); }
export async function listarSiembras(token: string, terrenoId: string, signal?: AbortSignal): Promise<Siembra[]> { return comprobarRespuesta(z.array(esquemaSiembra), await solicitar(`/terrenos/${encodeURIComponent(terrenoId)}/siembras`, 'GET', token, undefined, signal)); }
export async function guardarSiembra(token: string, terrenoId: string, datos: DatosSiembra, id?: string): Promise<Siembra> { return comprobarRespuesta(esquemaSiembra, await solicitar(id ? `/siembras/${encodeURIComponent(id)}` : `/terrenos/${encodeURIComponent(terrenoId)}/siembras`, id ? 'PUT' : 'POST', token, datos)); }
export async function eliminarSiembra(token: string, id: string): Promise<void> { await solicitar(`/siembras/${encodeURIComponent(id)}`, 'DELETE', token); }

const esquemaClima = z.object({
  mensual: z.array(z.object({ mes: numero.int().min(1).max(12), t_min: numero.nullable(), t_med: numero.nullable(), t_max: numero.nullable(),
    lluvia_mm: numero.min(0).nullable(), humedad_suelo: numero.min(0).max(1).nullable(), riesgo_helada: z.enum(['alto', 'medio', 'bajo']).nullable() })).length(12).refine((meses) => meses.every((mes, indice) => mes.mes === indice + 1)),
  fuente: z.literal('NASA POWER'), resolucion: z.string(), periodo: z.object({ inicio: numero.int(), fin: numero.int() }), actualizado_en: z.iso.datetime(),
  estado_datos: z.enum(['nasa', 'cache', 'desactualizado', 'respaldo']), desactualizado: z.boolean(), coordenadas: z.object({ latitud: numero, longitud: numero }),
  advertencias: z.array(z.string()), metodologia: z.string(), parametros: z.record(z.string(), z.object({ unidad: z.string(), valores: z.array(numero.nullable()).length(12) })),
});
export async function obtenerClima(token: string, terrenoId: string, signal?: AbortSignal): Promise<RespuestaClima> {
  return comprobarRespuesta(esquemaClima, await solicitar(`/terrenos/${encodeURIComponent(terrenoId)}/clima`, 'GET', token, undefined, signal));
}
export async function obtenerTendencia(token: string, terrenoId: string, ubicacion: { latitud: number; longitud: number }, signal?: AbortSignal): Promise<RespuestaTendencia> {
  const datos = comprobarRespuesta(esquemaTendencia, await solicitar(`/terrenos/${encodeURIComponent(terrenoId)}/tendencia`, 'GET', token, undefined, signal, 25000));
  if (datos.coordenadas.latitud !== ubicacion.latitud || datos.coordenadas.longitud !== ubicacion.longitud) throw new ErrorApi('La serie histórica no corresponde a la ubicación actual. Reintenta la consulta.');
  return datos;
}
export async function obtenerPanelTecnico(token: string, filtros: FiltrosPanelTecnico, signal?: AbortSignal): Promise<RespuestaPanelTecnico> {
  const consulta = new URLSearchParams({ pagina: String(filtros.pagina), ...(filtros.parroquia && { parroquia: filtros.parroquia }), ...(filtros.cultivo && { cultivo: filtros.cultivo }) });
  const datos = comprobarRespuesta(esquemaPanelTecnico, await solicitar(`/tecnico/terrenos?${consulta}`, 'GET', token, undefined, signal));
  if (datos.paginacion.pagina !== filtros.pagina) throw new ErrorApi('El panel no corresponde a la página solicitada. Reintenta.');
  return datos;
}

const coordenadasPronostico = z.object({ latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180) });
const esquemaPronostico = z.object({
  dias: z.array(z.object({ fecha: z.iso.date(), t_min: numero.min(-100).max(70).nullable(), t_max: numero.min(-100).max(70).nullable(), precipitacion_mm: numero.min(0).max(2000).nullable() })).length(7),
  alertas: z.array(z.object({ fecha: z.iso.date(), tipo: z.literal('helada'), mensaje: z.string().min(1) })),
  fuente: z.literal('Open-Meteo'), actualizado_en: z.iso.datetime(), vigente_hasta: z.iso.datetime(), estado_datos: z.enum(['open_meteo', 'cache']), zona_horaria: z.literal('America/Guayaquil'),
  coordenadas: coordenadasPronostico, cuadricula: coordenadasPronostico, unidades: z.object({ temperatura: z.literal('°C'), precipitacion: z.literal('mm') }),
  umbral_helada_c: numero.min(-10).max(10), advertencias: z.array(z.string()), aviso: z.string().min(1),
}).refine((valor) => {
  const primero = valor.dias[0]; if (!primero) return false;
  const inicio = Date.parse(`${primero.fecha}T00:00:00Z`);
  return valor.dias.every((dia, indice) => Date.parse(`${dia.fecha}T00:00:00Z`) === inicio + indice * 86400000 && (dia.t_min === null || dia.t_max === null || dia.t_min <= dia.t_max))
    && valor.dias.some((dia) => dia.t_min !== null || dia.t_max !== null || dia.precipitacion_mm !== null)
    && new Set(valor.alertas.map((alerta) => alerta.fecha)).size === valor.alertas.length
    && valor.dias.every((dia) => valor.alertas.some((alerta) => alerta.fecha === dia.fecha) === (dia.t_min !== null && dia.t_min <= valor.umbral_helada_c))
    && valor.alertas.every((alerta) => valor.dias.some((dia) => dia.fecha === alerta.fecha))
    && Date.parse(valor.vigente_hasta) > Date.parse(valor.actualizado_en) && Date.parse(valor.vigente_hasta) - Date.parse(valor.actualizado_en) <= 1800000;
});
export async function obtenerPronostico(token: string, terrenoId: string, signal?: AbortSignal): Promise<RespuestaPronostico> {
  return comprobarRespuesta(esquemaPronostico, await solicitar(`/terrenos/${encodeURIComponent(terrenoId)}/pronostico`, 'GET', token, undefined, signal));
}

const esquemaEscenarioCalendario = z.object({ lluvia_pct: numero.min(-30).max(30), temp_delta: numero.min(-2).max(2) });
const esquemaCalendario = z.object({
  celdas: z.array(z.object({ cultivo_id: z.string().min(1), mes: numero.int().min(1).max(12), estado: z.enum(['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado']), motivo: z.string().min(1) })).max(120),
  cultivos: z.array(z.object({ id: z.string().min(1), nombre: z.string().min(1), altitud_min: numero.int(), altitud_max: numero.int() })).max(10),
  terreno: z.object({ altitud_m: numero.int().nullable(), tiene_riego: z.boolean().nullable(), area_ha: numero.positive().nullable() }), escenario: esquemaEscenarioCalendario,
  clima: esquemaClima.pick({ fuente: true, resolucion: true, periodo: true, actualizado_en: true, estado_datos: true, desactualizado: true, advertencias: true }), aviso: z.string().min(1),
}).refine((datos) => {
  const ids = new Set(datos.cultivos.map((cultivo) => cultivo.id));
  return ids.size === datos.cultivos.length && datos.celdas.length === datos.cultivos.length * 12
    && new Set(datos.celdas.map((celda) => `${celda.cultivo_id}:${celda.mes}`)).size === datos.celdas.length
    && datos.celdas.every((celda) => ids.has(celda.cultivo_id));
});
export async function obtenerCalendario(token: string, terrenoId: string, escenario: EscenarioCalendario = { lluvia_pct: 0, temp_delta: 0 }, signal?: AbortSignal): Promise<RespuestaCalendario> {
  if (!esquemaEscenarioCalendario.safeParse(escenario).success) throw new ErrorApi('Parámetros de escenario inválidos.');
  const consulta = new URLSearchParams({ lluvia_pct: String(escenario.lluvia_pct), temp_delta: String(escenario.temp_delta) });
  return comprobarRespuesta(esquemaCalendario, await solicitar(`/terrenos/${encodeURIComponent(terrenoId)}/calendario?${consulta}`, 'GET', token, undefined, signal));
}

const estadoRotacion = z.enum(['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado']);
const puntajeRotacion = numero.min(0).max(100).nullable();
const esquemaRotaciones = z.object({
  estrategias: z.array(z.object({ id: z.string().min(1).nullable(), nombre: z.string().min(1), es_actual: z.boolean(), secuencia: z.array(z.string().min(1)).max(3), estado: estadoRotacion,
    planificacion: z.array(z.object({ cultivo_id: z.string().min(1), nombre: z.string().min(1), inicio_estimado: z.iso.date().nullable(), fin_estimado: z.iso.date().nullable(), ciclo_meses: numero.int().min(1).max(36).nullable(), espera_meses: numero.int().min(0).max(11).nullable(), estado: estadoRotacion, motivo: z.string().min(1) })).max(3),
    puntajes: z.object({ agua: puntajeRotacion, suelo: puntajeRotacion, riesgo: puntajeRotacion, ingresos: puntajeRotacion, total: puntajeRotacion }),
    por_que: z.string().min(1), evidencia: z.array(z.string()), beneficios: z.array(z.string()), vacios_informacion: z.array(z.string()), riesgos: z.array(z.string()), aviso: z.string().min(1),
  })).length(3),
  candidatas: z.array(z.object({ id: z.string().nullable(), estado: estadoRotacion, total: puntajeRotacion })).max(8),
  inicio_comun: z.iso.date(), escenario: esquemaEscenarioCalendario,
  metodologia: z.object({ version: z.literal('heuristica_rotaciones_v1'), peso_riesgo: z.literal(3), prioridades: z.object({ agua: numero.int().min(1).max(5).nullable(), suelo: numero.int().min(1).max(5).nullable(), ingresos: numero.int().min(1).max(5).nullable() }), aviso: z.string() }),
  clima: esquemaCalendario.shape.clima.nullable(), advertencias: z.array(z.string()), aviso: z.string().min(1),
}).refine((datos) => {
  const ids = datos.estrategias.flatMap((valor) => valor.id === null ? [] : [valor.id]);
  return datos.estrategias[0]?.es_actual && datos.estrategias.slice(1).every((valor) => !valor.es_actual) && new Set(ids).size === ids.length
    && datos.estrategias.every((valor) => valor.secuencia.length === valor.planificacion.length && (valor.secuencia.length === 0 || valor.secuencia.length === 3)
      && valor.planificacion.every((paso, indice) => paso.cultivo_id === valor.secuencia[indice] && (paso.fin_estimado === null || (paso.inicio_estimado !== null && paso.fin_estimado > paso.inicio_estimado)))
      && (valor.id !== null || (valor.estado === 'no_determinado' && valor.secuencia.length === 0 && Object.values(valor.puntajes).every((puntaje) => puntaje === null)))
      && (valor.puntajes.total === null || Object.values(valor.puntajes).every((puntaje) => puntaje !== null)));
});
export async function obtenerRotaciones(token: string, terrenoId: string, escenario: EscenarioCalendario = { lluvia_pct: 0, temp_delta: 0 }, signal?: AbortSignal): Promise<RespuestaRotaciones> {
  if (!esquemaEscenarioCalendario.safeParse(escenario).success) throw new ErrorApi('Parámetros de escenario inválidos.');
  const consulta = new URLSearchParams({ lluvia_pct: String(escenario.lluvia_pct), temp_delta: String(escenario.temp_delta) });
  return comprobarRespuesta(esquemaRotaciones, await solicitar(`/terrenos/${encodeURIComponent(terrenoId)}/rotaciones?${consulta}`, 'GET', token, undefined, signal));
}

export async function obtenerResultadosEscenario(token: string, terrenoId: string, escenario: EscenarioCalendario, signal?: AbortSignal): Promise<{ calendario: RespuestaCalendario; rotaciones: RespuestaRotaciones }> {
  const [calendario, rotaciones] = await Promise.all([
    obtenerCalendario(token, terrenoId, escenario, signal), obtenerRotaciones(token, terrenoId, escenario, signal),
  ]);
  if ([calendario, rotaciones].some((datos) => datos.escenario.lluvia_pct !== escenario.lluvia_pct || datos.escenario.temp_delta !== escenario.temp_delta)) {
    throw new ErrorApi('La respuesta no corresponde al escenario solicitado. Reintenta la consulta.');
  }
  return { calendario, rotaciones };
}

const urlOficialCapa = z.url().refine((valor) => { const url = new URL(valor); return url.protocol === 'https:' && !url.username && !url.password && ['doi.org', 'gibs.earthdata.nasa.gov'].includes(url.hostname); });
const esquemaMetadatosCapa = z.object({
  tipo: z.enum(['ndvi', 'humedad_suelo']), nombre: z.string().min(1), producto: z.enum(['MOD13Q1', 'SPL3SMP_E']), version_catalogo: z.string(), resolucion_m: numero.int().positive(),
  unidad: z.string().min(1), frecuencia: z.string(), fuente: urlOficialCapa, leyenda_url: urlOficialCapa,
  colores: z.array(z.string().regex(/^#[a-f0-9]{6}$/i)).length(6), valores_leyenda: z.array(numero).length(6),
  limites_interpretacion: z.string().min(1), calidad_original: z.string().min(1), procesamiento: z.string().min(1), aviso: z.string().min(1),
  formato: z.literal('WMS_PNG'), fuente_visual: z.literal('NASA GIBS'), proyeccion_imagen: z.literal('EPSG:3857'),
  anio: numero.int().min(2023).max(2024), mes: numero.int().min(1).max(12), fecha: z.iso.date(), fin_composicion: z.iso.date(),
  fechas_disponibles: z.array(z.iso.date()).min(1).max(31), limites: z.tuple([z.literal(-79.45), z.literal(-1.3), z.literal(-78.3), z.literal(-0.3)]),
  tamano_imagen: z.object({ ancho: z.literal(920), alto: z.literal(800) }), url_fuente: urlOficialCapa,
  estado_imagen: z.enum(['visible', 'sin_pixeles_visibles']), sha256: z.string().regex(/^[a-f0-9]{64}$/), consultado_en: z.iso.datetime(), origen: z.enum(['gibs', 'cache']),
}).refine((datos) => datos.fechas_disponibles.includes(datos.fecha) && new Set(datos.fechas_disponibles).size === datos.fechas_disponibles.length
  && datos.fechas_disponibles.every((fecha) => fecha.startsWith(`${datos.anio}-${String(datos.mes).padStart(2, '0')}-`)) && datos.fin_composicion >= datos.fecha
  && (datos.tipo === 'ndvi' ? datos.producto === 'MOD13Q1' && datos.resolucion_m === 250 : datos.producto === 'SPL3SMP_E' && datos.resolucion_m === 9000));

export async function obtenerCapaVisual(token: string, tipo: TipoCapa, parametros: ConsultaCapaVisual, signal?: AbortSignal): Promise<RespuestaCapaVisual> {
  if (!z.enum(['ndvi', 'humedad_suelo']).safeParse(tipo).success || !z.strictObject({ anio: numero.int().min(2023).max(2024), mes: numero.int().min(1).max(12), fecha: z.iso.date().optional() }).safeParse(parametros).success) throw new ErrorApi('Selección de capa inválida.');
  const consulta = new URLSearchParams({ anio: String(parametros.anio), mes: String(parametros.mes), ...(parametros.fecha ? { fecha: parametros.fecha } : {}) });
  const metadatos = comprobarRespuesta(esquemaMetadatosCapa, await solicitar(`/capas-visuales/${tipo}?${consulta}`, 'GET', token, undefined, signal));
  if (metadatos.tipo !== tipo || metadatos.anio !== parametros.anio || metadatos.mes !== parametros.mes || (parametros.fecha && metadatos.fecha !== parametros.fecha)) throw new ErrorApi('La imagen no corresponde a la selección solicitada.');
  if (metadatos.estado_imagen === 'sin_pixeles_visibles') return { metadatos, imagen: null };
  consulta.set('fecha', metadatos.fecha);
  try {
    const respuesta = await fetch(obtenerUrl(`/capas-visuales/${tipo}/imagen?${consulta}`), { method: 'GET', credentials: 'omit', cache: 'no-store', headers: { Accept: 'image/png', Authorization: `Bearer ${token}` }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) });
    if (!respuesta.ok) throw new ErrorApi('No se pudo cargar la imagen de NASA. Reintenta la consulta.', respuesta.status);
    if (respuesta.headers.get('content-type')?.split(';')[0] !== 'image/png' || Number(respuesta.headers.get('content-length') ?? 0) > 2097152) throw new ErrorApi('La respuesta no contiene una imagen PNG válida.');
    const imagen = await respuesta.blob(); if (!imagen.size || imagen.size > 2097152) throw new ErrorApi('Tamaño de imagen inválido.');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await imagen.arrayBuffer()))).map((valor) => valor.toString(16).padStart(2, '0')).join('');
    if (hash !== metadatos.sha256) throw new ErrorApi('La imagen cambió durante la consulta. Reintenta para comprobar su procedencia.');
    return { metadatos, imagen };
  } catch (error: unknown) { if (error instanceof ErrorApi) throw error; throw new ErrorApi('No se pudo descargar la imagen de NASA. Comprueba la conexión y reintenta.'); }
}
