import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';

// Procesos nuevos para conservar las cuotas reales de autenticación de las suites previas.
export default defineConfig({ ...configuracion, outputDir: 'test-results/escenarios', testIgnore: [], testMatch: ['**/escenarios.spec.ts'] });
