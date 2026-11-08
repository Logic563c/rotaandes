import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { ErrorHttp } from '../middleware/errores.js';

export const DURACION_SESION_SEGUNDOS = 15 * 60;
export const COSTE_BCRYPT = 12;
export const EMISOR_JWT = 'rotaandes-api';
export const AUDIENCIA_JWT = 'rotaandes-web';

export function obtenerSecretoJwt(entorno: NodeJS.ProcessEnv = process.env): string {
  const secreto = entorno.JWT_SECRET;
  if (!secreto || !/^[A-Za-z0-9_-]{64,}$/.test(secreto)) {
    throw new Error('JWT_SECRET debe ser un secreto aleatorio de al menos 64 caracteres base64url. Ejecuta npm run auth:preparar --workspace backend.');
  }
  return secreto;
}

const email = z.email({ error: 'Introduce un correo electrónico válido.' }).max(254).transform((valor) => valor.toLowerCase());
const correoNormalizado = z.string().trim().pipe(email);
const sinControles = (valor: string) => Array.from(valor).every((caracter) => caracter.charCodeAt(0) >= 32 && caracter.charCodeAt(0) !== 127);
const nombre = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'El nombre admite hasta 120 caracteres.').refine(sinControles, 'El nombre no admite caracteres de control.');
const parroquia = z.string().trim().max(100, 'La parroquia admite hasta 100 caracteres.').refine(sinControles, 'La parroquia no admite caracteres de control.').transform((valor) => valor || null);
const password = z.string().refine((valor) => !valor.includes('\0') && Buffer.byteLength(valor, 'utf8') <= 72,
  'La contraseña admite hasta 72 bytes UTF-8 y no admite caracteres nulos.');
export const esquemaRegistro = z.strictObject({
  email: correoNormalizado,
  password: password.refine((valor) => Array.from(valor).length >= 15, 'Usa una contraseña de al menos 15 caracteres.'),
  nombre,
  parroquia: parroquia.optional(),
});
export const esquemaLogin = z.strictObject({ email: correoNormalizado, password: password.refine((valor) => valor.length > 0, 'Introduce tu contraseña.') });
const prioridad = z.number().int().min(1).max(5);
export const esquemaPerfil = z.strictObject({
  nombre: nombre.optional(),
  parroquia: parroquia.nullable().optional(),
  telefono: z.string().trim().max(25).refine((valor) => !valor || (/^\+?[\d ()-]+$/.test(valor) && (valor.match(/\d/g)?.length ?? 0) >= 7 && (valor.match(/\d/g)?.length ?? 0) <= 15), 'Introduce un teléfono válido.').transform((valor) => valor || null).nullable().optional(),
  prioridad_agua: prioridad.optional(),
  prioridad_suelo: prioridad.optional(),
  prioridad_ingresos: prioridad.optional(),
}).refine((valor) => Object.keys(valor).length > 0, 'Indica al menos un campo para actualizar.');

export function validarEntrada<T>(esquema: z.ZodType<T>, entrada: unknown): T {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const mensajes: Record<string, string> = { email: 'Introduce un correo válido de hasta 254 caracteres.', nombre: 'El nombre debe tener entre 2 y 120 caracteres.', parroquia: 'La parroquia admite hasta 100 caracteres.', telefono: 'Introduce un teléfono válido de hasta 25 caracteres.', password: 'Introduce una contraseña válida de hasta 72 bytes UTF-8.', prioridad_agua: 'La prioridad de agua debe ser un entero entre 1 y 5.', prioridad_suelo: 'La prioridad de suelo debe ser un entero entre 1 y 5.', prioridad_ingresos: 'La prioridad de ingresos debe ser un entero entre 1 y 5.' };
    const campo = problema?.path[0];
    throw new ErrorHttp(400, problema?.code === 'unrecognized_keys' ? 'La solicitud contiene campos no permitidos.'
      : problema?.code === 'custom' ? problema.message : typeof campo === 'string' ? mensajes[campo] ?? 'Revisa los datos enviados.' : 'Revisa los datos enviados.');
  }
  return resultado.data;
}

export const seleccionUsuarioPublico = {
  id: true, email: true, rol: true, nombre: true, parroquia: true, telefono: true,
  prioridadAgua: true, prioridadSuelo: true, prioridadIngresos: true, creadoEn: true,
} as const;

type RegistroPublico = Awaited<ReturnType<PrismaClient['usuario']['findUniqueOrThrow']>>;
export function publicarUsuario(usuario: Omit<RegistroPublico, 'passwordHash'>) {
  if (usuario.rol !== 'agricultor' && usuario.rol !== 'tecnico') throw new ErrorHttp(403, 'Tu cuenta no tiene un rol autorizado.');
  return {
    id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre,
    parroquia: usuario.parroquia, telefono: usuario.telefono,
    prioridad_agua: usuario.prioridadAgua, prioridad_suelo: usuario.prioridadSuelo,
    prioridad_ingresos: usuario.prioridadIngresos, creado_en: usuario.creadoEn?.toISOString() ?? null,
  };
}
export type UsuarioPublico = ReturnType<typeof publicarUsuario>;
export type ObtenerUsuarios = () => PrismaClient['usuario'];

export function firmarToken(id: string, secreto: string): string {
  return jwt.sign({}, secreto, { algorithm: 'HS256', subject: id, expiresIn: DURACION_SESION_SEGUNDOS, issuer: EMISOR_JWT, audience: AUDIENCIA_JWT });
}

export function verificarToken(token: string, secreto: string): string {
  try {
    const contenido = jwt.verify(token, secreto, { algorithms: ['HS256'], issuer: EMISOR_JWT, audience: AUDIENCIA_JWT, maxAge: DURACION_SESION_SEGUNDOS });
    if (typeof contenido === 'string' || !z.uuid().safeParse(contenido.sub).success || typeof contenido.sub !== 'string' || typeof contenido.exp !== 'number') throw new Error();
    return contenido.sub;
  } catch {
    throw new ErrorHttp(401, 'Tu sesión no es válida o ha vencido. Inicia sesión de nuevo.');
  }
}

let hashAusente: Promise<string> | undefined;
export async function comprobarPassword(password: string, hash?: string): Promise<boolean> {
  hashAusente ??= bcrypt.hash(randomBytes(48).toString('base64url'), COSTE_BCRYPT);
  const coincide = await bcrypt.compare(password, hash ?? await hashAusente);
  return hash !== undefined && coincide;
}
