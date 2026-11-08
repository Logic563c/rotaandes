import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { ErrorHttp } from '../middleware/errores.js';
import { filtroTerrenos } from '../services/datosAgricolas.js';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import { validarId } from '../services/validacionAgricola.js';
import { ErrorClima } from '../services/nasaPower.js';
import type { ServicioClima } from '../services/clima.js';

export function crearRutasClima(obtenerBase: ObtenerBaseAgricola, autenticar: RequestHandler, consultar: ServicioClima): Router {
  const rutas = Router();
  const limitar = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id,
    standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas consultas climáticas. Espera un minuto.' } });
  rutas.get('/terrenos/:id/clima', autenticar, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    if (Object.keys(solicitud.query).length > 0) throw new ErrorHttp(400, 'La climatología usa la ubicación guardada del terreno y no admite parámetros de consulta.');
    const terreno = await obtenerBase().terreno.findFirst({ where: { id, ...filtroTerrenos(obtenerUsuarioActual(solicitud)) }, select: { latitud: true, longitud: true, altitudM: true } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    try { respuesta.json(await consultar(terreno.latitud, terreno.longitud, terreno.altitudM)); }
    catch (error: unknown) { if (error instanceof ErrorClima) throw new ErrorHttp(500, error.message); throw error; }
  });
  return rutas;
}
