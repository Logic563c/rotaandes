import cors from 'cors';
import express from 'express';
import type { ConfiguracionServidor } from './configuracion.js';
import { ErrorHttp, manejarErrores } from './middleware/errores.js';
import { rutasSalud } from './routes/salud.js';

export function crearAplicacion(configuracion: ConfiguracionServidor) {
  const aplicacion = express();
  aplicacion.disable('x-powered-by');

  aplicacion.use(cors({
    origin(origen, resolver) {
      if (origen === undefined || origen === configuracion.origenPermitido) {
        resolver(null, true);
        return;
      }
      resolver(new ErrorHttp(403, 'Origen no permitido.'));
    },
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  }));

  aplicacion.use('/api', rutasSalud);
  aplicacion.use((_solicitud, respuesta) => {
    respuesta.status(404).json({ error: 'Ruta no encontrada.' });
  });
  aplicacion.use(manejarErrores);

  return aplicacion;
}
