import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { ErrorHttp } from '../middleware/errores.js';
import { esquemaTipoCapa, esquemaConsultaGeojson, validarConsultaCapa, metadatosCapa } from '../data/catalogoCapas.js';
import { ErrorCapaSatelital } from '../services/capasSatelitales.js';
import type { ServicioCapas } from '../services/capasSatelitales.js';

export function crearRutasCapas(autenticar: RequestHandler, consultar: ServicioCapas): Router {
  const rutas = Router();
  const limitar = rateLimit({ windowMs: 60000, limit: 60, keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas consultas de capas. Espera un minuto.' } });
  rutas.get('/capas/:tipo', autenticar, limitar, (solicitud) => {
    if (!esquemaTipoCapa.safeParse(solicitud.params.tipo).success || !esquemaConsultaGeojson.safeParse(solicitud.query).success) throw new ErrorHttp(400, 'Tipo o mes de capa inválidos.');
    throw new ErrorHttp(503, 'GeoJSON analítico no disponible: faltan los datos originales procesados y sus máscaras de calidad. El visor GIBS es una alternativa de imágenes, no de mediciones numéricas.');
  });
  rutas.get(['/capas-visuales/:tipo', '/capas-visuales/:tipo/imagen'], autenticar, limitar, async (solicitud, respuesta) => {
    let consulta;
    try { consulta = validarConsultaCapa(solicitud.params.tipo, solicitud.query); }
    catch { throw new ErrorHttp(400, 'Tipo, año, mes o fecha de capa inválidos.'); }
    try {
      const imagen = await consultar(consulta);
      if (solicitud.path.endsWith('/imagen')) { respuesta.type('image/png').send(imagen.bytes); return; }
      respuesta.json({ ...metadatosCapa(consulta), estado_imagen: imagen.visible ? 'visible' : 'sin_pixeles_visibles', sha256: imagen.sha256, consultado_en: imagen.consultado_en, origen: imagen.origen });
    } catch (error: unknown) { if (error instanceof ErrorCapaSatelital) throw new ErrorHttp(503, error.message); throw error; }
  });
  return rutas;
}
