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
import { crearRutasClima } from './routes/clima.js';
import { crearServicioClima } from './services/clima.js';
import type { ObtenerCacheClima, ServicioClima } from './services/clima.js';
import { crearRutasPronostico } from './routes/pronostico.js';
import { crearServicioPronostico } from './services/pronostico.js';
import type { ObtenerCachePronostico, ServicioPronostico } from './services/pronostico.js';
import { crearRutasCalendario } from './routes/calendario.js';
import { crearRutasRotaciones } from './routes/rotaciones.js';
import { crearRutasCapas } from './routes/capas.js';
import { crearServicioCapas } from './services/capasSatelitales.js';
import type { ServicioCapas } from './services/capasSatelitales.js';
import { crearRutasTendencia } from './routes/tendencia.js';
import { crearServicioTendencia } from './services/tendencia.js';
import type { ServicioTendencia } from './services/tendencia.js';

export function crearAplicacion(configuracion: ConfiguracionServidor, dependencias: {
  obtenerUsuarios?: ObtenerUsuarios; obtenerSecreto?: () => string;
  obtenerBase?: ObtenerBaseAgricola; obtenerAltitud?: ObtenerAltitud;
  obtenerCacheClima?: ObtenerCacheClima; consultarClima?: ServicioClima;
  obtenerCachePronostico?: ObtenerCachePronostico; consultarPronostico?: ServicioPronostico;
  consultarCapas?: ServicioCapas;
  consultarTendencia?: ServicioTendencia;
} = {}) {
  const aplicacion = express();
  aplicacion.disable('x-powered-by');
  aplicacion.set('trust proxy', configuracion.saltosProxy);
  aplicacion.use((_solicitud, respuesta, siguiente) => {
    respuesta.setHeader('X-Content-Type-Options', 'nosniff');
    respuesta.setHeader('X-Frame-Options', 'DENY');
    respuesta.setHeader('Referrer-Policy', 'no-referrer');
    respuesta.setHeader('Cache-Control', 'no-store');
    if (configuracion.esProduccion) respuesta.setHeader('Strict-Transport-Security', 'max-age=31536000');
    siguiente();
  });

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
  aplicacion.use('/api', crearRutasCapas(autenticar(obtenerUsuarios, obtenerSecreto), dependencias.consultarCapas ?? crearServicioCapas()));
  aplicacion.use('/api/auth', crearRutasAuth(obtenerUsuarios, obtenerSecreto));
  aplicacion.use('/api/perfil', crearRutasPerfil(obtenerUsuarios, obtenerSecreto));
  const obtenerBase = dependencias.obtenerBase ?? obtenerClientePrisma;
  aplicacion.use('/api', crearRutasTendencia(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto), dependencias.consultarTendencia ?? crearServicioTendencia(dependencias.obtenerCacheClima ?? (() => obtenerClientePrisma().climaCache))));
  aplicacion.use('/api/cultivos', crearRutasCultivos(obtenerBase));
  aplicacion.use('/api', crearRutasPronostico(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto), dependencias.consultarPronostico ?? crearServicioPronostico(dependencias.obtenerCachePronostico ?? (() => obtenerClientePrisma().climaCache))));
  const consultarClima = dependencias.consultarClima ?? crearServicioClima(dependencias.obtenerCacheClima ?? (() => obtenerClientePrisma().climaCache));
  aplicacion.use('/api', crearRutasCalendario(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto), consultarClima));
  aplicacion.use('/api', crearRutasRotaciones(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto), consultarClima));
  aplicacion.use('/api', crearRutasClima(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto), consultarClima));
  aplicacion.use('/api', crearRutasSiembras(obtenerBase, autenticar(obtenerUsuarios, obtenerSecreto)));
  aplicacion.use('/api/terrenos', autenticar(obtenerUsuarios, obtenerSecreto), crearRutasTerrenos(obtenerBase, dependencias.obtenerAltitud ?? crearServicioElevacion()));
  aplicacion.use((_solicitud, respuesta) => {
    respuesta.status(404).json({ error: 'Ruta no encontrada.' });
  });
  aplicacion.use(manejarErrores);

  return aplicacion;
}
