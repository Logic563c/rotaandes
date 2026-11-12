import { defineConfig } from '@playwright/test';
import configuracion from './playwright.config.js';

// Ejecución propia (servidor nuevo): evita sumar inicios de sesión al límite de intentos de la batería principal.
export default defineConfig({ ...configuracion, outputDir: 'test-results/delimitacion', testIgnore: [], testMatch: ['**/delimitacion.spec.ts'] });
