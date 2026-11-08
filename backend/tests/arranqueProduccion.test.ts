import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const simuladas = vi.hoisted(() => ({ conectar: vi.fn(), consultar: vi.fn(), cerrar: vi.fn(), escuchar: vi.fn() }));
vi.mock('../src/lib/prisma.js', () => ({ obtenerClientePrisma: () => ({ $connect: simuladas.conectar, $queryRaw: simuladas.consultar }), cerrarConexionBase: simuladas.cerrar }));
vi.mock('../src/aplicacion.js', () => ({ crearAplicacion: () => ({ listen: simuladas.escuchar }) }));
const codigoAnterior = process.exitCode;
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  for (const [nombre, valor] of Object.entries({ NODE_ENV: 'production', PORT: '8080', TRUST_PROXY_HOPS: '1', CORS_ORIGIN: 'https://fixture.vercel.app', DATABASE_HOST: 'postgres.railway.internal', DATABASE_NAME: 'railway', DATABASE_USER: 'rotaandes_app', DATABASE_URL: 'postgresql://rotaandes_app:fixture_sin_credencial_real@postgres.railway.internal/railway', JWT_SECRET: 'x'.repeat(64) })) vi.stubEnv(nombre, valor);
  simuladas.conectar.mockResolvedValue(undefined); simuladas.cerrar.mockResolvedValue(undefined); simuladas.consultar.mockRejectedValue(new Error('Detalle privado de conexión de prueba'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { process.exitCode = codigoAnterior; vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('Arranque productivo: una inicialización del adaptador no prueba la conexión real', () => {
  it('no abre HTTP si $connect resuelve pero SELECT 1 falla', async () => {
    await import('../src/index.js');
    expect(simuladas.conectar).toHaveBeenCalledOnce(); expect(simuladas.consultar).toHaveBeenCalledOnce();
    expect(simuladas.escuchar).not.toHaveBeenCalled(); expect(process.exitCode).toBe(1); expect(simuladas.cerrar).toHaveBeenCalledOnce();
  });
  it('un fallo de inicialización se cierra sin imprimir su mensaje privado', async () => {
    simuladas.conectar.mockRejectedValue(new Error('Detalle privado de conexión de prueba'));
    await import('../src/index.js'); expect(simuladas.escuchar).not.toHaveBeenCalled(); expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith('No se pudo iniciar producción. Revisa configuración privada y disponibilidad de PostgreSQL.');
  });
  it('rechaza una URL local antes de crear el cliente productivo', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://rotaandes_app:fixture@127.0.0.1:5432/rotaandes_dev');
    await import('../src/index.js'); expect(simuladas.conectar).not.toHaveBeenCalled(); expect(simuladas.escuchar).not.toHaveBeenCalled(); expect(process.exitCode).toBe(1);
  });
});
