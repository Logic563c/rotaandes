import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';

const origen = readFileSync(new URL('../../scripts/configurarRolProduccion.sql', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const version = /SELECT current_setting\('server_version_num'\)[\s\S]*?AS version_compatible \\gset/;
const rolExiste = /SELECT EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'rotaandes_app'\) AS rol_existe \\gset/;
const rolSeguro = /SELECT rolcanlogin[\s\S]*?FROM pg_roles WHERE rolname = 'rotaandes_app' \\gset/;
const baseExiste = /SELECT EXISTS \(SELECT 1 FROM pg_database WHERE datname = 'rotaandes_prod'\) AS base_existe \\gset/;
const baseCompatible = /SELECT pg_get_userbyid[\s\S]*?FROM pg_database WHERE datname = 'rotaandes_prod' \\gset/;

describe('Bootstrap: psql debe devolver error al fallar una guarda, sin ejecutar DDL', () => {
  const casos = [
    { nombre: 'clave ausente', sql: origen, sinClave: true, mensaje: 'Falta la variable privada del rol de aplicación.' },
    { nombre: 'versión incompatible', sql: origen.replace(version, 'SELECT false AS version_compatible \\gset'), mensaje: 'Se requiere PostgreSQL 18.' },
    { nombre: 'rol incompatible', sql: origen.replace(rolExiste, 'SELECT true AS rol_existe \\gset').replace(rolSeguro, 'SELECT false AS rol_seguro \\gset'), mensaje: 'El rol existente tiene permisos incompatibles.' },
    { nombre: 'base incompatible', sql: origen.replace(rolExiste, 'SELECT true AS rol_existe \\gset').replace(rolSeguro, 'SELECT true AS rol_seguro \\gset').replace(baseExiste, 'SELECT true AS base_existe \\gset').replace(baseCompatible, 'SELECT false AS base_compatible \\gset'), mensaje: 'La base existente tiene otro propietario o codificación.' },
  ];
  it.each(casos)('termina con error ante $nombre', ({ sql, sinClave, mensaje }) => {
    const url = new URL(validarUrlBase(process.env.TEST_DATABASE_URL, true));
    const entorno: NodeJS.ProcessEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port, PGDATABASE: url.pathname.slice(1), PGUSER: url.username, PGPASSWORD: decodeURIComponent(url.password), PGOPTIONS: '-c default_transaction_read_only=on', PGCLIENTENCODING: 'UTF8', ROTAANDES_APP_PASSWORD: 'fixture_sin_credencial_real' };
    if (sinClave) delete entorno.ROTAANDES_APP_PASSWORD;
    const ejecutable = process.platform === 'win32' ? 'C:/Program Files/PostgreSQL/18/bin/psql.exe' : 'psql';
    // La conexión de pruebas es local y de solo lectura incluso si falla la guarda.
    const resultado = spawnSync(ejecutable, ['-X', '-q', '-w', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', env: entorno, timeout: 5000 });
    expect(resultado.status).toBe(3);
    expect(resultado.stderr.includes(mensaje)).toBe(true);
  });
});
