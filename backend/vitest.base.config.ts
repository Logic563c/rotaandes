import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

config({ path: fileURLToPath(new URL('.env', import.meta.url)), quiet: true });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/base-datos/**/*.integration.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
