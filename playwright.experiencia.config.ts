import { defineConfig, devices } from '@playwright/test';
import configuracion from './playwright.config.js';
export default defineConfig({ ...configuracion, outputDir: 'test-results/experiencia', testIgnore: [], testMatch: ['**/experienciaAgricultor.spec.ts'], projects: [
  { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
  ...[320, 375, 390].map((ancho) => ({ name: `celular-${ancho}`, use: { viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true } })),
] });
