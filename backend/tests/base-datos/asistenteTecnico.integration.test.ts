import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { crearAplicacion } from '../../src/aplicacion.js';
import { obtenerConfiguracion } from '../../src/configuracion.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
afterAll(async () => { await prisma.$disconnect(); });
describe('Asistente real Windows con entrada oculta y PostgreSQL aislado', () => {
  it.runIf(process.platform === 'win32')('aprovisiona por stdin UTF-8, permite login y limpia únicamente su cuenta temporal', async () => {
    const email = `tecnico-asistente-${randomUUID()}@example.invalid`; const password = `Ñandú-${randomBytes(24).toString('base64url')}`;
    try {
      const salida = await promisify(execFile)('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('../../../tests/scripts/ejecutarAsistenteTecnicoPrueba.ps1', import.meta.url))], {
        windowsHide: true, timeout: 20000, env: { ...process.env, NODE_ENV: 'test', ROTAANDES_PRUEBA_CORREO: email, ROTAANDES_PRUEBA_CLAVE: password },
      });
      expect(salida.stdout).not.toContain(password); expect(salida.stderr).not.toContain(password);
      const cuenta = await prisma.usuario.findUniqueOrThrow({ where: { email } });
      expect(cuenta.rol).toBe('tecnico'); expect(cuenta.nombre).toBe('Técnico Ñandú de prueba'); expect(await bcrypt.compare(password, cuenta.passwordHash)).toBe(true);
      const app = crearAplicacion(obtenerConfiguracion({}), { obtenerUsuarios: () => prisma.usuario, obtenerSecreto: () => randomBytes(48).toString('base64url') });
      await request(app).post('/api/auth/login').send({ email, password }).expect(200).expect(({ body }) => { expect(body.usuario.rol).toBe('tecnico'); expect(body.usuario).not.toHaveProperty('password_hash'); });
    } finally { await prisma.usuario.deleteMany({ where: { email } }); }
  }, 30000);
});
