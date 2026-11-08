import type { RequestHandler } from 'express';
import type { ObtenerUsuarios, UsuarioPublico } from '../services/autenticacion.js';
import { publicarUsuario, seleccionUsuarioPublico, verificarToken } from '../services/autenticacion.js';
import { ErrorHttp } from './errores.js';

declare module 'express-serve-static-core' {
  interface Request { usuarioActual?: UsuarioPublico }
}

export function autenticar(obtenerUsuarios: ObtenerUsuarios, obtenerSecreto: () => string): RequestHandler {
  return async (solicitud, respuesta, siguiente) => {
    respuesta.set('Cache-Control', 'no-store');
    const autorizacion = solicitud.get('Authorization');
    const coincidencia = autorizacion?.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i);
    if (!coincidencia?.[1] || (autorizacion?.length ?? 0) > 2048) throw new ErrorHttp(401, 'Inicia sesión para continuar.');
    const id = verificarToken(coincidencia[1], obtenerSecreto());
    const usuario = await obtenerUsuarios().findUnique({ where: { id }, select: seleccionUsuarioPublico });
    if (!usuario) throw new ErrorHttp(401, 'Tu sesión no es válida o ha vencido. Inicia sesión de nuevo.');
    solicitud.usuarioActual = publicarUsuario(usuario);
    siguiente();
  };
}

export function obtenerUsuarioActual(solicitud: Parameters<RequestHandler>[0]): UsuarioPublico {
  if (!solicitud.usuarioActual) throw new ErrorHttp(401, 'Inicia sesión para continuar.');
  return solicitud.usuarioActual;
}
