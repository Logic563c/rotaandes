import { Router } from 'express';
import { autenticar, obtenerUsuarioActual } from '../middleware/auth.js';
import { esquemaPerfil, publicarUsuario, seleccionUsuarioPublico, validarEntrada } from '../services/autenticacion.js';
import type { ObtenerUsuarios } from '../services/autenticacion.js';

export function crearRutasPerfil(obtenerUsuarios: ObtenerUsuarios, obtenerSecreto: () => string): Router {
  const rutas = Router();
  rutas.put('/', autenticar(obtenerUsuarios, obtenerSecreto), async (solicitud, respuesta) => {
    const entrada: unknown = solicitud.body;
    const datos = validarEntrada(esquemaPerfil, entrada);
    const usuario = await obtenerUsuarios().update({ where: { id: obtenerUsuarioActual(solicitud).id }, data: {
      ...(datos.nombre !== undefined && { nombre: datos.nombre }),
      ...(datos.parroquia !== undefined && { parroquia: datos.parroquia }),
      ...(datos.telefono !== undefined && { telefono: datos.telefono }),
      ...(datos.prioridad_agua !== undefined && { prioridadAgua: datos.prioridad_agua }),
      ...(datos.prioridad_suelo !== undefined && { prioridadSuelo: datos.prioridad_suelo }),
      ...(datos.prioridad_ingresos !== undefined && { prioridadIngresos: datos.prioridad_ingresos }),
    }, select: seleccionUsuarioPublico });
    respuesta.json(publicarUsuario(usuario));
  });
  return rutas;
}
