import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { validarUrlPublicacion } from './src/lib/configuracionPublicacion.js';

export default defineConfig(({ mode }) => {
  if (mode === 'publicacion') {
    const valor = process.env.VITE_API_URL ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL;
    validarUrlPublicacion(valor);
  }
  return {
  plugins: [react(), tailwindcss()],
  server: { host: 'localhost', port: 5173, strictPort: true },
  preview: { host: 'localhost', port: 5173, strictPort: true },
  };
});
