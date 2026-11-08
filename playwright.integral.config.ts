import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';

// Servidores nuevos: el recorrido usa sus propios límites de registro/login sin relajarlos.
export default defineConfig({ ...configuracion, outputDir: 'test-results/integral', testIgnore: [], testMatch: '**/primeraEntrega.spec.ts' });
