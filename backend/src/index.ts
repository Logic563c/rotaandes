if (process.env.NODE_ENV !== 'production') await import('dotenv/config');
import { crearAplicacion } from './aplicacion.js';
import { obtenerConfiguracion } from './configuracion.js';
import { obtenerSecretoJwt } from './services/autenticacion.js';
import { cerrarConexionBase, obtenerClientePrisma } from './lib/prisma.js';
import { validarUrlBase } from './lib/configuracionBase.js';

try {
  const configuracion = obtenerConfiguracion();
  obtenerSecretoJwt();
  if (configuracion.esProduccion) {
    validarUrlBase(process.env.DATABASE_URL);
    await obtenerClientePrisma().$connect();
    // El adaptador puede inicializar un pool de forma diferida: comprobar una consulta real.
    await obtenerClientePrisma().$queryRaw`SELECT 1`;
  }
  const aplicacion = crearAplicacion(configuracion);
  const servidor = aplicacion.listen(configuracion.puerto, configuracion.host, () => {
    console.info(`RotaAndes: servidor HTTP iniciado en el puerto ${configuracion.puerto}.`);
  });

  servidor.on('error', () => {
    console.error('No se pudo iniciar el servidor. Comprueba que el puerto esté disponible.');
    process.exitCode = 1;
  });

  function cerrarServidor() {
    servidor.close((error) => {
      void cerrarConexionBase().catch(() => { console.error('No se pudo cerrar la conexión a la base.'); process.exitCode = 1; });
      if (error) {
        console.error('No se pudo cerrar el servidor correctamente.');
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', cerrarServidor);
  process.once('SIGTERM', cerrarServidor);
} catch (error: unknown) {
  console.error(process.env.NODE_ENV === 'production' ? 'No se pudo iniciar producción. Revisa configuración privada y disponibilidad de PostgreSQL.' : error instanceof Error ? error.message : 'Configuración del servidor inválida.');
  await cerrarConexionBase().catch(() => { console.error('No se pudo cerrar la conexión tras el fallo de arranque.'); });
  process.exitCode = 1;
}
