import bcrypt from 'bcrypt';
import { COSTE_BCRYPT, esquemaRegistro, validarEntrada } from './autenticacion.js';
import type { ObtenerUsuarios } from './autenticacion.js';
import { ErrorHttp } from '../middleware/errores.js';

// Procedimiento administrativo fuera de HTTP; nunca promociona ni reemplaza una cuenta existente.
export async function crearTecnicoLocal(entrada: unknown, obtenerUsuarios: ObtenerUsuarios) {
  const datos = validarEntrada(esquemaRegistro, entrada); const usuarios = obtenerUsuarios();
  if (await usuarios.findUnique({ where: { email: datos.email }, select: { id: true } })) throw new ErrorHttp(400, 'Ya existe una cuenta con ese correo. No se modificó su rol ni su contraseña.');
  const passwordHash = await bcrypt.hash(datos.password, COSTE_BCRYPT);
  return usuarios.create({ data: { email: datos.email, nombre: datos.nombre, parroquia: datos.parroquia ?? null, passwordHash, rol: 'tecnico' }, select: { id: true } });
}
