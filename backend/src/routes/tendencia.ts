import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { ErrorHttp } from '../middleware/errores.js';
import { filtroTerrenos } from '../services/datosAgricolas.js';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import { validarId } from '../services/validacionAgricola.js';
import { ErrorTendencia } from '../services/nasaHistorico.js';
import type { ServicioTendencia } from '../services/tendencia.js';

export function crearRutasTendencia(obtenerBase: ObtenerBaseAgricola, autenticar: RequestHandler, consultar: ServicioTendencia): Router {
  const rutas = Router();
  const limitar = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id,
    standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas consultas históricas. Espera un minuto.' } });
  rutas.get('/terrenos/:id/tendencia', autenticar, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    if (Object.keys(solicitud.query).length) throw new ErrorHttp(400, 'Las tendencias usan el periodo 2005–2024 y la ubicación guardada; no admiten parámetros de consulta.');
    const terreno = await obtenerBase().terreno.findFirst({ where: { id, ...filtroTerrenos(obtenerUsuarioActual(solicitud)) }, select: { latitud: true, longitud: true } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    try { respuesta.json(await consultar(terreno.latitud, terreno.longitud)); }
    catch (error: unknown) { if (error instanceof ErrorTendencia) throw new ErrorHttp(503, error.message); throw error; }
  });
  return rutas;
}
