import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';
import { catalogoCompleto, cultivosAmpliados, cultivosReferenciales } from '../../src/data/catalogoCultivos.js';

// Migración 20261115000100_catalogo_ampliado verificada en un esquema desechable de la base de pruebas:
// datos existentes intactos, cultivos nuevos insertables y reversión manual segura.
const url = validarUrlBase(process.env.TEST_DATABASE_URL, true);
const grupo = new Pool({ connectionString: url.replace(/\?.*$/, ''), max: 2 });
let conexion: PoolClient;
const esquema = `migracion_${randomBytes(4).toString('hex')}`;
const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const MIGRACIONES = ['../../prisma/migrations/20261107000100_esquema_inicial/migration.sql', '../../prisma/migrations/20261112000100_delimitacion_terreno/migration.sql'];
const NUEVA = leer('../../prisma/migrations/20261115000100_catalogo_ampliado/migration.sql');
const REVERSION = leer('../../prisma/reversiones/20261115000100_catalogo_ampliado.revertir.sql');
const COLUMNAS_NULABLES = ['altitud_min', 'altitud_max', 'lluvia_min_mensual_mm', 'demanda_agua', 'tolerancia_helada', 'tolerancia_sequia',
  'aporte_materia_organica', 'proteccion_erosion', 'valor_forraje', 'valor_mercado'];
const usuario = randomUUID(); const terreno = randomUUID();

async function huella(tabla: string): Promise<string> {
  const fila = (await conexion.query<{ huella: string | null }>(`SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS huella FROM "${tabla}" t`)).rows[0];
  return fila?.huella ?? 'vacia';
}
async function nulabilidad(): Promise<Record<string, boolean>> {
  const filas = await conexion.query<{ columna: string; obligatorio: boolean }>(`SELECT a.attname AS columna, a.attnotnull AS obligatorio FROM pg_attribute a
    JOIN pg_class t ON t.oid = a.attrelid WHERE t.relnamespace = $1::regnamespace AND t.relname = 'cultivos' AND a.attnum > 0 AND NOT a.attisdropped`, [esquema]);
  return Object.fromEntries(filas.rows.map((fila) => [fila.columna, fila.obligatorio]));
}
async function insertarCultivo(cultivo: typeof catalogoCompleto[number]): Promise<void> {
  await conexion.query(`INSERT INTO cultivos (id,nombre,familia,altitud_min,altitud_max,ciclo_meses,meses_siembra,lluvia_min_mensual_mm,demanda_agua,tolerancia_helada,tolerancia_sequia,fija_nitrogeno,aporte_materia_organica,proteccion_erosion,valor_forraje,valor_mercado,descripcion)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, [cultivo.id, cultivo.nombre, cultivo.familia, cultivo.altitudMin ?? null, cultivo.altitudMax ?? null, cultivo.cicloMeses,
    cultivo.mesesSiembra, cultivo.lluviaMinMensualMm ?? null, cultivo.demandaAgua ?? null, cultivo.toleranciaHelada ?? null, cultivo.toleranciaSequia ?? null, cultivo.fijaNitrogeno ?? false,
    cultivo.aporteMateriaOrganica ?? null, cultivo.proteccionErosion ?? null, cultivo.valorForraje ?? null, cultivo.valorMercado ?? null, cultivo.descripcion ?? null]);
}

beforeAll(async () => {
  conexion = await grupo.connect();
  await conexion.query(`CREATE SCHEMA "${esquema}"`); await conexion.query(`SET search_path TO "${esquema}"`);
  for (const ruta of MIGRACIONES) await conexion.query(leer(ruta));
  await conexion.query(`CREATE TABLE "_prisma_migrations" (migration_name text)`);
  await conexion.query(`INSERT INTO "_prisma_migrations" VALUES ('20261107000100_esquema_inicial'), ('20261112000100_delimitacion_terreno'), ('20261115000100_catalogo_ampliado')`);
  await conexion.query(`INSERT INTO usuarios (id,email,password_hash,nombre) VALUES ($1,'migracion@example.invalid','x','Prueba de migración')`, [usuario]);
  await conexion.query(`INSERT INTO terrenos (id,usuario_id,nombre,latitud,longitud,altitud_m) VALUES ($1,$2,'Lote de prueba',-0.95,-78.69,3150)`, [terreno, usuario]);
  for (const cultivo of cultivosReferenciales) await insertarCultivo(cultivo);
  await conexion.query(`INSERT INTO siembras (terreno_id,cultivo_id,fecha_siembra) VALUES ($1,'papa','2025-10-01'), ($1,'haba','2026-04-01')`, [terreno]);
});
afterAll(async () => { await conexion.query(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`); conexion.release(); await grupo.end(); });

describe('Migración del catálogo ampliado (esquema desechable)', () => {
  it('solo relaja NOT NULL en 10 columnas y conserva intactas todas las filas existentes', async () => {
    expect(NUEVA.replace(/--.*$/gm, '')).not.toMatch(/\b(DROP TABLE|DROP COLUMN|DELETE|UPDATE|TRUNCATE|RENAME|INSERT)\b/i);
    const antes = { cultivos: await huella('cultivos'), siembras: await huella('siembras'), terrenos: await huella('terrenos'), usuarios: await huella('usuarios') };
    // PostgreSQL 18 registra los NOT NULL como restricciones de tipo 'n'; CHECK, PK, FK y UNIQUE deben quedar iguales.
    const contar = async (filtro: string) => (await conexion.query(`SELECT count(*)::int AS n FROM pg_constraint WHERE connamespace = $1::regnamespace AND ${filtro}`, [esquema])).rows[0];
    const restriccionesAntes = await contar(`contype <> 'n'`); const notNullAntes = (await contar(`contype = 'n'`))?.n ?? 0;
    await conexion.query(NUEVA);
    expect({ cultivos: await huella('cultivos'), siembras: await huella('siembras'), terrenos: await huella('terrenos'), usuarios: await huella('usuarios') }).toEqual(antes);
    expect(await contar(`contype <> 'n'`)).toEqual(restriccionesAntes);
    const notNullDespues = (await contar(`contype = 'n'`))?.n ?? 0; if (notNullAntes > 0) expect(notNullAntes - notNullDespues).toBe(10);
    const columnas = await nulabilidad();
    for (const columna of COLUMNAS_NULABLES) expect(columnas[columna], columna).toBe(false);
    for (const columna of ['id', 'nombre', 'familia', 'ciclo_meses', 'meses_siembra', 'fija_nitrogeno']) expect(columnas[columna], columna).toBe(true);
  });
  it('admite los 19 cultivos nuevos con índices nulos y siembras sobre ellos; los originales no cambian', async () => {
    const originales = await huella('cultivos');
    for (const cultivo of cultivosAmpliados) await insertarCultivo(cultivo);
    expect((await conexion.query(`SELECT count(*)::int AS n FROM cultivos`)).rows[0]).toEqual({ n: 29 });
    expect((await conexion.query(`SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS huella FROM cultivos t WHERE id = ANY($1)`, [cultivosReferenciales.map((c) => c.id)])).rows[0]?.huella).toBe(originales);
    await conexion.query(`INSERT INTO siembras (terreno_id,cultivo_id,fecha_siembra) VALUES ($1,'lechuga','2026-11-01')`, [terreno]);
    await expect(conexion.query(`INSERT INTO siembras (terreno_id,cultivo_id,fecha_siembra) VALUES ($1,'inventado','2026-11-01')`, [terreno])).rejects.toThrow();
  });
  it('la reversión manual se niega si hay siembras de cultivos nuevos y no borra datos de usuarios', async () => {
    const siembras = await huella('siembras');
    await expect(conexion.query(REVERSION)).rejects.toThrow(/Hay siembras de cultivos de la ampliación/);
    await conexion.query('ROLLBACK');
    expect(await huella('siembras')).toBe(siembras);
    expect((await conexion.query(`SELECT count(*)::int AS n FROM cultivos`)).rows[0]).toEqual({ n: 29 });
  });
  it('sin siembras de cultivos nuevos, revierte: borra solo la ampliación y restaura NOT NULL', async () => {
    await conexion.query(`DELETE FROM siembras WHERE cultivo_id = 'lechuga'`);
    const originales = { cultivos: await conexion.query(`SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS h FROM cultivos t WHERE id = ANY($1)`, [cultivosReferenciales.map((c) => c.id)]), siembras: await huella('siembras') };
    await conexion.query(REVERSION);
    expect((await conexion.query(`SELECT count(*)::int AS n FROM cultivos`)).rows[0]).toEqual({ n: 10 });
    expect((await conexion.query(`SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS h FROM cultivos t`)).rows[0]?.h).toBe(originales.cultivos.rows[0]?.h);
    expect(await huella('siembras')).toBe(originales.siembras);
    const columnas = await nulabilidad(); for (const columna of COLUMNAS_NULABLES) expect(columnas[columna], columna).toBe(true);
    expect((await conexion.query(`SELECT migration_name FROM "_prisma_migrations" ORDER BY 1`)).rows.map((fila) => fila.migration_name)).toEqual(['20261107000100_esquema_inicial', '20261112000100_delimitacion_terreno']);
  });
});
