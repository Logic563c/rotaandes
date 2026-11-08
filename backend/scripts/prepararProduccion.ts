import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { validarUrlBase } from '../src/lib/configuracionBase.js';
import { cargarCultivos } from '../src/data/catalogoCultivos.js';
import { cargarPlantillas } from '../src/data/catalogoPlantillas.js';

let prisma: PrismaClient | undefined;
try {
  if (process.env.NODE_ENV !== 'production') throw new Error('Entorno incorrecto.');
  const url = validarUrlBase(process.env.DATABASE_URL);
  // Este comando se ejecuta únicamente en el predeploy autorizado, con red privada.
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, connectionTimeoutMillis: 5000, options: '-c TimeZone=UTC' }) });
  await prisma.$connect();
  const permitidas = ['usuarios', 'terrenos', 'cultivos', 'siembras', 'plantillas_rotacion', 'clima_cache', '_prisma_migrations'];
  const existentes = await prisma.$queryRaw<{ nombre: string }[]>`SELECT tablename AS nombre FROM pg_tables WHERE schemaname = 'public'`;
  if (existentes.some((tabla) => !permitidas.includes(tabla.nombre))) throw new Error('Hay tablas ajenas al esquema autorizado.');
  const cli = fileURLToPath(new URL('../../node_modules/prisma/build/index.js', import.meta.url));
  const resultado = spawnSync(process.execPath, [cli, 'migrate', 'deploy', '--config', 'prisma.produccion.config.ts'], { cwd: process.cwd(), env: process.env, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
  // No se vuelca stdout/stderr del migrador: podría contener direcciones de conexión.
  if (resultado.status !== 0 || resultado.error) throw new Error('Migración fallida.');
  const tablas = await prisma.$queryRaw<{ nombre: string }[]>`SELECT tablename AS nombre FROM pg_tables WHERE schemaname = 'public'`;
  if (permitidas.some((nombre) => !tablas.some((tabla) => tabla.nombre === nombre))) throw new Error('Faltan tablas originales.');
  const restricciones = await prisma.$queryRaw<{ checks: number; relaciones: number }[]>`
    SELECT (SELECT COUNT(*)::int FROM pg_constraint WHERE conrelid = 'usuarios'::regclass AND contype = 'c') AS checks,
      (SELECT COUNT(*)::int FROM pg_constraint WHERE conrelid IN ('terrenos'::regclass, 'siembras'::regclass) AND contype = 'f') AS relaciones`;
  if (restricciones[0]?.checks !== 4 || restricciones[0]?.relaciones !== 3) throw new Error('Restricciones de esquema incompletas.');
  await prisma.$transaction(async (base) => { await cargarCultivos(base); await cargarPlantillas(base); });
  const cuentas = await prisma.usuario.count();
  const cultivos = await prisma.cultivo.count(); const plantillas = await prisma.plantillaRotacion.count();
  console.info(JSON.stringify({ preparacion: 'Migraciones aplicadas y catálogo autorizado verificado', cultivos, plantillas, usuarios_creados_por_semilla: 0, hay_usuarios_existentes: cuentas > 0 }));
} catch {
  console.error('No se pudo preparar el PostgreSQL privado de producción. Despliegue detenido; no se muestran credenciales ni detalles internos.');
  process.exitCode = 1;
} finally { await prisma?.$disconnect(); }
