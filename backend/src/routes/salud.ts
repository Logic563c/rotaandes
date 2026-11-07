import { Router } from 'express';

export const rutasSalud = Router();

rutasSalud.get('/health', (_solicitud, respuesta) => {
  respuesta.setHeader('Cache-Control', 'no-store');
  respuesta.json({ ok: true });
});
