// Restauración de prueba de un respaldo pg_dump (-Fc) en un ESQUEMA DESECHABLE de la base LOCAL de pruebas.
// No se conecta a producción. Muestra solo conteos y nombres de migraciones, nunca el contenido de las filas.
// Uso: node scripts/probarRestauracionRespaldo.mjs <ruta-del-respaldo.dump>
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import pg from 'pg';

const respaldo = process.argv[2];
if (!respaldo || !existsSync(respaldo)) { console.error('Indica la ruta de un archivo .dump existente.'); process.exit(2); }
config({ path: resolve(import.meta.dirname, '../backend/.env'), quiet: true });
const binarios = process.env.PG_BIN ?? 'C:/Program Files/PostgreSQL/18/bin';
let url;
try { url = new URL(process.env.TEST_DATABASE_URL ?? ''); } catch { console.error('Falta TEST_DATABASE_URL en backend/.env.'); process.exit(2); }
if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) { console.error('La restauración de prueba solo se permite en una base local.'); process.exit(2); }

const esquema = `restauracion_prueba_${randomBytes(4).toString('hex')}`;
const sqlTemporal = join(tmpdir(), `${esquema}.sql`);
const entorno = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) };
const ocultar = (texto) => String(texto ?? '').replace(/postgres(ql)?:\/\/\S+/g, '[url]').slice(0, 400);

const conversion = spawnSync(join(binarios, 'pg_restore.exe'), ['--no-owner', '--no-privileges', '-f', sqlTemporal, respaldo], { encoding: 'utf8' });
if (conversion.status !== 0) { console.error('pg_restore no pudo leer el respaldo:', ocultar(conversion.stderr)); process.exit(1); }
const barra = String.fromCharCode(92);
const sql = readFileSync(sqlTemporal, 'utf8').replace(/\bpublic\./g, `${esquema}.`)
  .replace("set_config('search_path', '', false)", `set_config('search_path', '${esquema}', false)`)
  .split('\n').filter((linea) => !linea.startsWith(`${barra}restrict`) && !linea.startsWith(`${barra}unrestrict`) && !/^CREATE SCHEMA public;|^COMMENT ON SCHEMA public/.test(linea)).join('\n');
writeFileSync(sqlTemporal, sql);

const cliente = new pg.Client({ connectionString: url.toString() }); await cliente.connect();
let correcto;
try {
  await cliente.query(`CREATE SCHEMA ${esquema}`);
  const carga = spawnSync(join(binarios, 'psql.exe'), ['-X', '-q', '-1', '-v', 'ON_ERROR_STOP=1', '-f', sqlTemporal], { env: entorno, encoding: 'utf8' });
  if (carga.status !== 0) throw new Error(`psql no pudo restaurar: ${ocultar(carga.stderr)}`);
  const tablas = ['usuarios', 'terrenos', 'siembras', 'cultivos', 'plantillas_rotacion', 'clima_cache', '_prisma_migrations'];
  for (const tabla of tablas) console.log(`  ${tabla.padEnd(20)} ${(await cliente.query(`SELECT count(*)::int AS n FROM ${esquema}.${tabla}`)).rows[0].n} filas`);
  const migraciones = await cliente.query(`SELECT migration_name FROM ${esquema}._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`);
  console.log('  migraciones aplicadas:', migraciones.rows.map((fila) => fila.migration_name).join(', '));
  console.log('  restricciones:', (await cliente.query(`SELECT count(*)::int AS n FROM pg_constraint WHERE connamespace = $1::regnamespace`, [esquema])).rows[0].n);
  const huerfanos = await cliente.query(`SELECT (SELECT count(*) FROM ${esquema}.terrenos t LEFT JOIN ${esquema}.usuarios u ON u.id = t.usuario_id WHERE u.id IS NULL)::int AS terrenos, (SELECT count(*) FROM ${esquema}.siembras s LEFT JOIN ${esquema}.terrenos t ON t.id = s.terreno_id WHERE t.id IS NULL)::int AS siembras`);
  console.log('  relaciones huérfanas:', JSON.stringify(huerfanos.rows[0]));
  correcto = huerfanos.rows[0].terrenos === 0 && huerfanos.rows[0].siembras === 0 && migraciones.rowCount > 0;
} finally {
  await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`); await cliente.end(); rmSync(sqlTemporal, { force: true });
  console.log('  esquema desechable y SQL temporal eliminados.');
}
console.log(correcto ? 'RESTAURACION_VERIFICADA' : 'RESTAURACION_CON_PROBLEMAS'); process.exit(correcto ? 0 : 1);
