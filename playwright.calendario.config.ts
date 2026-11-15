import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';

// Batería propia: servidor nuevo para no compartir el límite de inicios de sesión con la ejecución por defecto.
export default defineConfig({ ...configuracion, outputDir: 'test-results/calendario-ampliado', testIgnore: [], testMatch: ['**/calendarioAmpliado.spec.ts'] });
