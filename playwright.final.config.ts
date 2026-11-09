import { defineConfig } from '@playwright/test';
import configuracion from './playwright.experiencia.config.js';
const directorio = process.env.ROTAANDES_E2E_PROVEEDORES_REALES === '1' ? 'test-results/final-real' : 'test-results/final';
export default defineConfig({ ...configuracion, outputDir: directorio, projects: (configuracion.projects ?? []).map((proyecto) => ({ ...proyecto, outputDir: `${directorio}/${proyecto.name ?? 'sin-nombre'}` })), testMatch: ['**/entregaFinal.spec.ts'] });
