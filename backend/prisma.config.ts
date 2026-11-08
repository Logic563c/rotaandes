import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';
import { validarUrlBase } from './src/lib/configuracionBase.js';

if (process.env.NODE_ENV !== 'production') config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true });

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  ...(url ? { datasource: { url: validarUrlBase(url) } } : {}),
});
