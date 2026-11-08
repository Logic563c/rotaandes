import { Router } from 'express';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import { publicarCultivo } from '../services/datosAgricolas.js';

export function crearRutasCultivos(obtenerBase: ObtenerBaseAgricola): Router {
  const rutas = Router();
  rutas.get('/', async (_solicitud, respuesta) => {
    respuesta.set('Cache-Control', 'no-store');
    respuesta.json((await obtenerBase().cultivo.findMany({ orderBy: { nombre: 'asc' } })).map(publicarCultivo));
  });
  return rutas;
}
