import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { obtenerConfiguracion } from '../src/configuracion.js';
import { validarUrlBase } from '../src/lib/configuracionBase.js';
import { crearAplicacion } from '../src/aplicacion.js';

const entorno = { NODE_ENV: 'production', PORT: '8080', CORS_ORIGIN: 'https://fixture.vercel.app', TRUST_PROXY_HOPS: '1', DATABASE_HOST: 'postgres.railway.internal', DATABASE_NAME: 'railway', DATABASE_USER: 'rotaandes_app' };
const url = 'postgresql://rotaandes_app:fixture_sin_credencial_real@postgres.railway.internal:5432/railway';
describe('Producción: destino privado, CORS exacto y proxy acotado', () => {
  it('usa 0.0.0.0 y PORT de la plataforma con un salto de proxy', () => {
    expect(obtenerConfiguracion(entorno)).toEqual({ puerto: 8080, origenPermitido: entorno.CORS_ORIGIN, host: '0.0.0.0', esProduccion: true, saltosProxy: 1 });
    expect(validarUrlBase(url, false, entorno)).toBe(url);
  });
  it.each(['', '*', 'https://*.vercel.app', 'http://fixture.vercel.app', 'https://fixture.vercel.app/', 'https://fixture.vercel.app/ruta', 'https://usuario:clave@fixture.vercel.app', 'https://fixture.vercel.app.ejemplo.com', 'http://localhost:5173'])('rechaza CORS de producción incorrecto (%#)', (origen) => {
    expect(() => obtenerConfiguracion({ ...entorno, CORS_ORIGIN: origen })).toThrow();
  });
  it.each([{ PORT: undefined }, { TRUST_PROXY_HOPS: undefined }, { TRUST_PROXY_HOPS: 'true' }, { TRUST_PROXY_HOPS: '2' }])('exige puerto/proxy explícitos (%#)', (cambios) => {
    expect(() => obtenerConfiguracion({ ...entorno, ...cambios })).toThrow();
  });
  it.each([url.replace('postgres.railway.internal', '127.0.0.1'), url.replace('railway.internal', 'example.com'), url.replace('/railway', '/rotaandes_dev'),
    url.replace('/railway', '/rotaandes_pruebas_a1b2c3d4'), url.replace('rotaandes_app:', 'postgres:'), `${url}?host=ajeno.invalid`, `${url}#otra`, url.replace('5432', '5433')])('rechaza un destino distinto al de producción autorizado (%#)', (valor) => {
    expect(() => validarUrlBase(valor, false, entorno)).toThrow();
  });
  it('sin destino fijado no acepta una URL externa; las pruebas siguen aisladas', () => {
    expect(() => validarUrlBase(url, false, { NODE_ENV: 'production' })).toThrow();
    expect(() => validarUrlBase(url, true, entorno)).toThrow();
    expect(() => validarUrlBase(url, false, {})).toThrow();
  });
  it('health y rutas privadas conservan contrato y cabeceras sin necesitar PostgreSQL', async () => {
    const app = crearAplicacion(obtenerConfiguracion(entorno));
    await request(app).get('/api/health').set('Origin', entorno.CORS_ORIGIN).expect(200, { ok: true }).expect('Access-Control-Allow-Origin', entorno.CORS_ORIGIN)
      .expect('X-Content-Type-Options', 'nosniff').expect('Cache-Control', 'no-store').expect('Strict-Transport-Security', 'max-age=31536000');
    await request(app).get('/api/health').set('Origin', 'https://otro.vercel.app').expect(403);
    await request(app).get('/api/terrenos').expect(401);
    expect(app.get('trust proxy')).toBe(1);
  });
});
