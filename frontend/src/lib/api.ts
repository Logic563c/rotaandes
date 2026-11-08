import type { RespuestaSalud } from '../types/api';
import type { Credenciales, DatosRegistro, DatosPerfil, RespuestaAutenticacion, UsuarioPublico } from '../types/api';
import { z } from 'zod';
import type { Terreno, DatosTerreno, Siembra, DatosSiembra, Cultivo } from '../types/api';
import type { RespuestaClima } from '../types/api';

export class ErrorApi extends Error {
  constructor(mensaje: string, public readonly codigoHttp?: number) { super(mensaje); }
}

function obtenerUrl(ruta: string): URL {
  let urlBase: URL;
  try {
    urlBase = new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');
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

async function solicitar(ruta: string, metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', token?: string, cuerpo?: unknown, signal?: AbortSignal): Promise<unknown> {
  try {
    const respuesta = await fetch(obtenerUrl(ruta), { method: metodo, cache: 'no-store', credentials: 'omit',
      headers: { Accept: 'application/json', ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
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
