import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ejecutar = promisify(execFile);
describe('Asistente de cuenta técnica: límites antes de conectar', () => {
  it('rechaza producción sin leer contraseña, consultar SQL ni exponer el entorno', async () => {
    const marcador = randomBytes(32).toString('base64url');
    const resultado = await ejecutar(process.execPath, ['--import', 'tsx', 'scripts/aprovisionarTecnico.ts'], { cwd: fileURLToPath(new URL('../', import.meta.url)), timeout: 15000,
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: marcador }, windowsHide: true }).then((salida) => ({ ...salida, codigo: 0 }), (error: unknown) => {
      if (typeof error !== 'object' || error === null || !('stdout' in error) || !('stderr' in error) || !('code' in error)) throw error;
      return { stdout: String(error.stdout), stderr: String(error.stderr), codigo: error.code };
    });
    expect(resultado.codigo).toBe(1); expect(resultado.stdout).toBe(''); expect(resultado.stderr).toContain('No se creó la cuenta técnica'); expect(resultado.stderr).not.toContain(marcador);
  });
});
