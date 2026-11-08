import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';

export default defineConfig({ ...configuracion, outputDir: process.env.ROTAANDES_E2E_GIBS_REAL === '1' ? '.tmp/evidencias-capas-reales' : 'test-results/capas', testIgnore: [], testMatch: ['**/capas.spec.ts'] });
