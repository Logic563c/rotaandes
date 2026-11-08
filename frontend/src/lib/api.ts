import type { RespuestaSalud } from '../types/api';
import type { Credenciales, DatosRegistro, DatosPerfil, RespuestaAutenticacion, UsuarioPublico } from '../types/api';

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

async function solicitar(ruta: string, metodo: 'GET' | 'POST' | 'PUT', token?: string, cuerpo?: unknown, signal?: AbortSignal): Promise<unknown> {
  try {
    const respuesta = await fetch(obtenerUrl(ruta), { method: metodo, cache: 'no-store', credentials: 'omit',
      headers: { Accept: 'application/json', ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
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
