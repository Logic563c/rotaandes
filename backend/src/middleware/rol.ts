import type { RequestHandler } from 'express';
import type { UsuarioPublico } from '../services/autenticacion.js';
import { obtenerUsuarioActual } from './auth.js';
import { ErrorHttp } from './errores.js';

export function permitirRoles(...roles: UsuarioPublico['rol'][]): RequestHandler {
  return (solicitud, _respuesta, siguiente) => {
    if (!roles.includes(obtenerUsuarioActual(solicitud).rol)) throw new ErrorHttp(403, 'No tienes permiso para realizar esta acción.');
    siguiente();
  };
}
