import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';

export default defineConfig({ ...configuracion, outputDir: 'test-results/tecnico', testIgnore: [], testMatch: ['**/panelTecnico.spec.ts'] });
