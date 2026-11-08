import 'dotenv/config';
import { crearAplicacion } from './aplicacion.js';
import { obtenerConfiguracion } from './configuracion.js';
import { obtenerSecretoJwt } from './services/autenticacion.js';
import { cerrarConexionBase } from './lib/prisma.js';

try {
  const configuracion = obtenerConfiguracion();
  obtenerSecretoJwt();
  const aplicacion = crearAplicacion(configuracion);
  const servidor = aplicacion.listen(configuracion.puerto, '127.0.0.1', () => {
    console.info(`RotaAndes: http://localhost:${configuracion.puerto}`);
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
  console.error(error instanceof Error ? error.message : 'Configuración del servidor inválida.');
  process.exitCode = 1;
}
