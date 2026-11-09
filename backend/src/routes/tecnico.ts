import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { permitirRoles } from '../middleware/rol.js';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { validarFiltrosTecnico } from '../services/panelTecnico.js';
import type { ServicioPanelTecnico } from '../services/panelTecnico.js';

export function crearRutasTecnico(autenticar: RequestHandler, consultar: ServicioPanelTecnico): Router {
  const rutas = Router();
  rutas.get('/tecnico/terrenos', autenticar, permitirRoles('tecnico'), rateLimit({ windowMs: 60000, limit: 30,
    keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas consultas al panel. Espera un minuto.' } }),
  async (solicitud, respuesta) => { respuesta.json(await consultar(validarFiltrosTecnico(solicitud.query))); });
  return rutas;
}
