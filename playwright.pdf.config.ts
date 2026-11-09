import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';
export default defineConfig({ ...configuracion, outputDir: 'test-results/pdf', testIgnore: [], testMatch: ['**/reportesPdf.spec.ts'] });
