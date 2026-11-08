import cors from 'cors';
import express from 'express';
import type { ConfiguracionServidor } from './configuracion.js';
import { ErrorHttp, manejarErrores } from './middleware/errores.js';
import { rutasSalud } from './routes/salud.js';
import { crearRutasAuth } from './routes/auth.js';
import { crearRutasPerfil } from './routes/perfil.js';
import { obtenerClientePrisma } from './lib/prisma.js';
import { obtenerSecretoJwt } from './services/autenticacion.js';
import type { ObtenerUsuarios } from './services/autenticacion.js';
import { autenticar } from './middleware/auth.js';
import { crearRutasTerrenos } from './routes/terrenos.js';
import { crearRutasSiembras } from './routes/siembras.js';
import { crearRutasCultivos } from './routes/cultivos.js';
import { crearServicioElevacion } from './services/elevacion.js';
import type { ObtenerAltitud } from './services/elevacion.js';
import type { ObtenerBaseAgricola } from './services/datosAgricolas.js';

export function crearAplicacion(configuracion: ConfiguracionServidor, dependencias: {
  obtenerUsuarios?: ObtenerUsuarios; obtenerSecreto?: () => string;
  obtenerBase?: ObtenerBaseAgricola; obtenerAltitud?: ObtenerAltitud;
} = {}) {
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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }));

  aplicacion.use('/api', rutasSalud);
  aplicacion.use(express.json({ limit: '16kb', strict: true }));
  const obtenerUsuarios = dependencias.obtenerUsuarios ?? (() => obtenerClientePrisma().usuario);
  const obtenerSecreto = dependencias.obtenerSecreto ?? (() => obtenerSecretoJwt());
  aplicacion.use('/api/auth', crearRutasAuth(obtenerUsuarios, obtenerSecreto));
  aplicacion.use('/api/perfil', crearRutasPerfil(obtenerUsuarios, obtenerSecreto));
  const obtenerBase = dependencias.obtenerBase ?? obtenerClientePrisma;
  aplicacion.use('/api/cultivos', crearRutasCultivos(obtenerBase));
  aplicacion.use('/api', crearRutasSiembras(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto)));
  aplicacion.use('/api/terrenos', autenticar(obtenerUsuarios, obtenerSecreto), crearRutasTerrenos(obtenerBase, dependencias.obtenerAltitud ?? crearServicioElevacion()));
  aplicacion.use((_solicitud, respuesta) => {
    respuesta.status(404).json({ error: 'Ruta no encontrada.' });
  });
  aplicacion.use(manejarErrores);

  return aplicacion;
}
