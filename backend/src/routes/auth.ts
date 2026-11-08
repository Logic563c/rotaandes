import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { autenticar, obtenerUsuarioActual } from '../middleware/auth.js';
import { ErrorHttp } from '../middleware/errores.js';
import { comprobarPassword, COSTE_BCRYPT, esquemaLogin, esquemaRegistro, firmarToken, publicarUsuario, seleccionUsuarioPublico, validarEntrada } from '../services/autenticacion.js';
import type { ObtenerUsuarios } from '../services/autenticacion.js';

export function crearRutasAuth(obtenerUsuarios: ObtenerUsuarios, obtenerSecreto: () => string): Router {
  const rutas = Router();
  rutas.use((_solicitud, respuesta, siguiente) => { respuesta.set('Cache-Control', 'no-store'); siguiente(); });
  const limitar = (limite: number) => rateLimit({ windowMs: 15 * 60 * 1000, limit: limite, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_solicitud, _respuesta, siguiente) => siguiente(new ErrorHttp(429, 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.')) });

  rutas.post('/registro', limitar(5), async (solicitud, respuesta) => {
    const entrada: unknown = solicitud.body;
    const datos = validarEntrada(esquemaRegistro, entrada);
    const secreto = obtenerSecreto();
    const passwordHash = await bcrypt.hash(datos.password, COSTE_BCRYPT);
    try {
      const usuario = await obtenerUsuarios().create({ data: {
        email: datos.email, passwordHash, nombre: datos.nombre, parroquia: datos.parroquia ?? null, rol: 'agricultor',
      }, select: seleccionUsuarioPublico });
      respuesta.status(201).json({ token: firmarToken(usuario.id, secreto), usuario: publicarUsuario(usuario) });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ErrorHttp(400, 'No se pudo registrar ese correo. Si ya tienes una cuenta, inicia sesión.');
      throw error;
    }
  });
  rutas.post('/login', limitar(10), async (solicitud, respuesta) => {
    const entrada: unknown = solicitud.body;
    const datos = validarEntrada(esquemaLogin, entrada);
    const usuario = await obtenerUsuarios().findUnique({ where: { email: datos.email } });
    if (!await comprobarPassword(datos.password, usuario?.passwordHash) || !usuario) throw new ErrorHttp(401, 'Correo o contraseña incorrectos.');
    respuesta.json({ token: firmarToken(usuario.id, obtenerSecreto()), usuario: publicarUsuario(usuario) });
  });
  rutas.get('/yo', autenticar(obtenerUsuarios, obtenerSecreto), (solicitud, respuesta) => { respuesta.json(obtenerUsuarioActual(solicitud)); });
  return rutas;
}
