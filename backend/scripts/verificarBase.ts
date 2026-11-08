import 'dotenv/config';
import { obtenerClientePrisma, cerrarConexionBase } from '../src/lib/prisma.js';

try {
  const cliente = obtenerClientePrisma();
  if (obtenerClientePrisma() !== cliente) throw new Error('La instancia de Prisma no se reutilizó.');
  const estado = await cliente.$queryRaw<Array<{ usuario: string; base: string; version: string; propietario: string;
    codificacion: string; superusuario: boolean; puede_crear_bases: boolean; puede_crear_roles: boolean }>>`
    SELECT current_user AS usuario, current_database() AS base, current_setting('server_version') AS version,
      pg_get_userbyid(d.datdba) AS propietario, pg_encoding_to_char(d.encoding) AS codificacion,
      r.rolsuper AS superusuario, r.rolcreatedb AS puede_crear_bases, r.rolcreaterole AS puede_crear_roles
    FROM pg_database d JOIN pg_roles r ON r.rolname = current_user WHERE d.datname = current_database()
  `;
  for (const fila of estado) console.info(fila);
  console.info('Instancia de Prisma reutilizada: sí.');
  const basesProyecto = await cliente.$queryRaw<Array<{ base: string; propietario: string; codificacion: string }>>`
    SELECT datname AS base, pg_get_userbyid(datdba) AS propietario, pg_encoding_to_char(encoding) AS codificacion
    FROM pg_database WHERE datname = 'rotaandes_dev' OR datname ~ '^rotaandes_pruebas_[a-f0-9]{8}$' ORDER BY datname
  `;
  console.info('Bases del proyecto:', basesProyecto);
  const tablas = await cliente.$queryRaw<Array<{ tabla: string }>>`
    SELECT tablename AS tabla FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.info('Tablas:', tablas.map((fila) => fila.tabla).join(', '));
  const registros = await cliente.$queryRaw<Array<{ tabla: string; registros: number }>>`
    SELECT 'usuarios' AS tabla, count(*)::integer AS registros FROM usuarios
    UNION ALL SELECT 'terrenos', count(*)::integer FROM terrenos
    UNION ALL SELECT 'cultivos', count(*)::integer FROM cultivos
    UNION ALL SELECT 'siembras', count(*)::integer FROM siembras
    UNION ALL SELECT 'plantillas_rotacion', count(*)::integer FROM plantillas_rotacion
    UNION ALL SELECT 'clima_cache', count(*)::integer FROM clima_cache
  `;
  console.info('Conteos de registros:', registros);
} catch {
  console.error('No se pudo verificar PostgreSQL. Revisa la configuración y las credenciales localmente; no las compartas.');
  process.exitCode = 1;
} finally {
  await cerrarConexionBase();
}
