import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { crearAplicacion } from '../src/aplicacion.js';
import { obtenerConfiguracion } from '../src/configuracion.js';
import { manejarErrores } from '../src/middleware/errores.js';

const aplicacion = crearAplicacion(obtenerConfiguracion({}));

describe('GET /api/health', () => {
  it('devuelve el contrato público sin autenticación y sin caché', async () => {
    await request(aplicacion).get('/api/health')
      .expect(200, { ok: true })
      .expect('Content-Type', /json/)
      .expect('Cache-Control', 'no-store');
  });

  it('permite el origen local configurado', async () => {
    await request(aplicacion).get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200)
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173');
  });

  it('responde al preflight para GET desde el origen permitido', async () => {
    await request(aplicacion).options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204)
      .expect('Access-Control-Allow-Methods', 'GET');
  });

  it.each(['https://ejemplo.com', 'http://localhost:5174', 'http://localhost:5173.ejemplo.com', 'null'])(
    'rechaza el origen %s', async (origen) => {
      const respuesta = await request(aplicacion).get('/api/health')
        .set('Origin', origen)
        .expect(403, { error: 'Origen no permitido.' });
      expect(respuesta.headers).not.toHaveProperty('access-control-allow-origin');
    },
  );

  it('permite seleccionar 127.0.0.1 sin permitir a la vez otros orígenes', async () => {
    const aplicacionLocal = crearAplicacion(obtenerConfiguracion({ CORS_ORIGIN: 'http://127.0.0.1:5173' }));
    await request(aplicacionLocal).get('/api/health').set('Origin', 'http://127.0.0.1:5173').expect(200);
    await request(aplicacionLocal).get('/api/health').set('Origin', 'http://localhost:5173').expect(403);
  });

  it('mantiene el formato de error en rutas inexistentes', async () => {
    await request(aplicacion).get('/api/inexistente')
      .expect(404, { error: 'Ruta no encontrada.' });
  });

  it('no habilita métodos de escritura', async () => {
    await request(aplicacion).post('/api/health').expect(404);
  });
});

describe('Errores inesperados', () => {
  it('devuelve JSON sin exponer el detalle interno', async () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const aplicacionPrueba = express();
    aplicacionPrueba.get('/fallo', () => { throw new Error('Detalle interno privado'); });
    aplicacionPrueba.use(manejarErrores);
    try {
      await request(aplicacionPrueba).get('/fallo')
        .expect(500, { error: 'No se pudo completar la solicitud.' });
    } finally {
      registro.mockRestore();
    }
  });
});
