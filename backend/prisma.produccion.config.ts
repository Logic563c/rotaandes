import { defineConfig } from 'prisma/config';
import { validarUrlBase } from './src/lib/configuracionBase.js';

// No carga .env local ni acepta destinos de desarrollo/pruebas.
if (process.env.NODE_ENV !== 'production') throw new Error('La migración de producción exige NODE_ENV=production.');
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: validarUrlBase(process.env.DATABASE_URL, false) },
});
