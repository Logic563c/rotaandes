import 'dotenv/config';
import { validarUrlBase } from '../src/lib/configuracionBase.js';

try {
  validarUrlBase(process.env.DATABASE_URL);
  console.info('Configuración de PostgreSQL local válida.');
} catch {
  console.error('Configura DATABASE_URL para rotaandes_dev mediante el asistente local. No compartas su contenido.');
  process.exitCode = 1;
}
