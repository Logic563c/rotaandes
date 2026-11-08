import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';
import { validarUrlBase } from './src/lib/configuracionBase.js';

config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: validarUrlBase(process.env.TEST_DATABASE_URL, true) },
});
