import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { validarUrlBase } from '../../src/lib/configuracionBase.js';

const urlPruebas = validarUrlBase(process.env.TEST_DATABASE_URL, true);
const grupo = new Pool({ connectionString: urlPruebas, max: 2, connectionTimeoutMillis: 3000 });
const prismaPruebas = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlPruebas, connectionTimeoutMillis: 3000, options: '-c TimeZone=UTC' }) });
let conexion: PoolClient;

beforeAll(async () => {
  try {
    await grupo.query('SELECT 1');
    await prismaPruebas.$connect();
  } catch {
    throw new Error('No se pudo abrir la base aislada. Ejecuta la configuración local y las migraciones de pruebas.');
  }
});

beforeEach(async () => {
  conexion = await grupo.connect();
  await conexion.query('BEGIN');
});

afterEach(async () => {
  if (conexion) {
    try { await conexion.query('ROLLBACK'); }
    finally { conexion.release(); }
  }
});

afterAll(async () => {
  await Promise.all([grupo.end(), prismaPruebas.$disconnect()]);
});

async function crearUsuario() {
  const email = `prueba-${randomUUID()}@example.invalid`;
  const resultado = await conexion.query<{ id: string }>(
    'INSERT INTO usuarios (email, password_hash, nombre) VALUES ($1, $2, $3) RETURNING id',
    [email, 'valor_sintetico_solo_pruebas', 'Usuario de prueba automatizada'],
  );
  const usuario = resultado.rows[0];
  if (!usuario) throw new Error('No se creó el usuario temporal de prueba.');
  return { id: usuario.id, email };
}

async function crearRelaciones() {
  const usuario = await crearUsuario();
  const cultivoId = `prueba_${randomUUID()}`;
  await conexion.query(`INSERT INTO cultivos
    (id, nombre, familia, altitud_min, altitud_max, ciclo_meses, meses_siembra,
     lluvia_min_mensual_mm, demanda_agua, tolerancia_helada, tolerancia_sequia,
     aporte_materia_organica, proteccion_erosion, valor_forraje, valor_mercado)
    VALUES ($1, 'Fixture SQL sin valor agronómico', 'Prueba', 1, 2, 1, ARRAY[1,2]::smallint[], 1, 1, 1, 1, 1, 1, 1, 1)`, [cultivoId]);
  const terreno = await conexion.query<{ id: string }>(
    'INSERT INTO terrenos (usuario_id, nombre, latitud, longitud) VALUES ($1, $2, $3, $4) RETURNING id',
    [usuario.id, 'Terreno temporal de prueba', 0, 0],
  );
  const terrenoId = terreno.rows[0]?.id;
  if (!terrenoId) throw new Error('No se creó el terreno temporal.');
  const siembra = await conexion.query<{ id: string }>(
    'INSERT INTO siembras (terreno_id, cultivo_id, fecha_siembra) VALUES ($1, $2, $3) RETURNING id',
    [terrenoId, cultivoId, '2026-01-01'],
  );
  const siembraId = siembra.rows[0]?.id;
  if (!siembraId) throw new Error('No se creó la siembra temporal.');
  return { usuario, cultivoId, terrenoId, siembraId };
}

describe('Esquema físico de PROYECTO.md', () => {
  it('se conecta como la aplicación sin privilegios administrativos y con UTF8', async () => {
    const resultado = await conexion.query<{ usuario: string; base: string; propietario: string; codificacion: string; administrador: boolean }>(`
      SELECT current_user AS usuario, current_database() AS base,
        pg_get_userbyid(d.datdba) AS propietario, pg_encoding_to_char(d.encoding) AS codificacion,
        (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole) AS administrador
      FROM pg_database d JOIN pg_roles r ON r.rolname = current_user
      WHERE d.datname = current_database()`);
    expect(resultado.rows[0]).toEqual({ usuario: 'rotaandes_app', base: new URL(urlPruebas).pathname.slice(1),
      propietario: 'rotaandes_app', codificacion: 'UTF8', administrador: false });
  });

  it('tiene exactamente las seis tablas de dominio y la tabla de migraciones', async () => {
    const resultado = await conexion.query<{ tabla: string }>("SELECT tablename AS tabla FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    expect(resultado.rows.map((fila) => fila.tabla)).toEqual([
      '_prisma_migrations', 'clima_cache', 'cultivos', 'plantillas_rotacion', 'siembras', 'terrenos', 'usuarios',
    ]);
  });

  const columnasEsperadas: Record<string, Record<string, string>> = {
    usuarios: { id: 'uuid!', email: 'text!', password_hash: 'text!', rol: 'text!', nombre: 'text!',
      parroquia: 'text?', telefono: 'text?', prioridad_agua: 'smallint?', prioridad_suelo: 'smallint?',
      prioridad_ingresos: 'smallint?', creado_en: 'timestamp with time zone?' },
    terrenos: { id: 'uuid!', usuario_id: 'uuid!', nombre: 'text!', latitud: 'double precision!',
      longitud: 'double precision!', altitud_m: 'integer?', area_ha: 'numeric(8,2)?', tiene_riego: 'boolean?',
      tipo_suelo: 'text?', creado_en: 'timestamp with time zone?' },
    cultivos: { id: 'text!', nombre: 'text!', familia: 'text!', altitud_min: 'integer!', altitud_max: 'integer!',
      ciclo_meses: 'smallint!', meses_siembra: 'smallint[]!', lluvia_min_mensual_mm: 'integer!', demanda_agua: 'smallint!',
      tolerancia_helada: 'smallint!', tolerancia_sequia: 'smallint!', fija_nitrogeno: 'boolean!',
      aporte_materia_organica: 'smallint!', proteccion_erosion: 'smallint!', valor_forraje: 'smallint!',
      valor_mercado: 'smallint!', descripcion: 'text?' },
    siembras: { id: 'uuid!', terreno_id: 'uuid!', cultivo_id: 'text!', fecha_siembra: 'date!', fecha_cosecha: 'date?',
      notas: 'text?', creado_en: 'timestamp with time zone?' },
    plantillas_rotacion: { id: 'text!', nombre: 'text!', secuencia: 'text[]!', descripcion: 'text?' },
    clima_cache: { clave: 'text!', datos: 'jsonb!', actualizado_en: 'timestamp with time zone?' },
  };

  it.each(Object.entries(columnasEsperadas))('conserva columnas, tipos y nulabilidad de %s', async (tabla, esperadas) => {
    const resultado = await conexion.query<{ columna: string; tipo: string; obligatorio: boolean }>(`
      SELECT a.attname AS columna, format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull AS obligatorio
      FROM pg_attribute a JOIN pg_class t ON t.oid = a.attrelid JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = $1 AND a.attnum > 0 AND NOT a.attisdropped`, [tabla]);
    // PostgreSQL representa explícitamente la precisión 6 que Prisma declara.
    // TIMESTAMPTZ sin precisión y TIMESTAMPTZ(6) conservan microsegundos.
    expect(Object.fromEntries(resultado.rows.map((fila) => [fila.columna,
      fila.tipo.replace(/^timestamp\(6\) with time zone$/, 'timestamp with time zone') + (fila.obligatorio ? '!' : '?'),
    ]))).toEqual(esperadas);
  });

  it('conserva las seis claves primarias', async () => {
    const resultado = await conexion.query<{ tabla: string; columna: string }>(`
      SELECT t.relname AS tabla, a.attname AS columna FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'p' AND c.connamespace = 'public'::regnamespace AND t.relname <> '_prisma_migrations'
      ORDER BY t.relname`);
    expect(resultado.rows).toEqual([
      { tabla: 'clima_cache', columna: 'clave' }, { tabla: 'cultivos', columna: 'id' },
      { tabla: 'plantillas_rotacion', columna: 'id' }, { tabla: 'siembras', columna: 'id' },
      { tabla: 'terrenos', columna: 'id' }, { tabla: 'usuarios', columna: 'id' },
    ]);
  });

  it('conserva las tres claves foráneas y sus acciones', async () => {
    const resultado = await conexion.query<{ tabla: string; columna: string; referencia: string; columna_referencia: string; borrado: string; actualizacion: string }>(`
      SELECT t.relname AS tabla, a.attname AS columna, r.relname AS referencia, ar.attname AS columna_referencia,
        c.confdeltype::text AS borrado, c.confupdtype::text AS actualizacion
      FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_class r ON r.oid = c.confrelid
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[1]
      JOIN pg_attribute ar ON ar.attrelid=r.oid AND ar.attnum=c.confkey[1]
      WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace ORDER BY t.relname, r.relname`);
    expect(resultado.rows).toEqual([
      { tabla: 'siembras', columna: 'cultivo_id', referencia: 'cultivos', columna_referencia: 'id', borrado: 'a', actualizacion: 'a' },
      { tabla: 'siembras', columna: 'terreno_id', referencia: 'terrenos', columna_referencia: 'id', borrado: 'c', actualizacion: 'a' },
      { tabla: 'terrenos', columna: 'usuario_id', referencia: 'usuarios', columna_referencia: 'id', borrado: 'c', actualizacion: 'a' },
    ]);
  });

  it('registra cuatro CHECK y la restricción UNIQUE en PostgreSQL', async () => {
    const resultado = await conexion.query<{ nombre: string }>(`
      SELECT conname AS nombre FROM pg_constraint WHERE conrelid = 'usuarios'::regclass AND contype IN ('c','u') ORDER BY conname`);
    expect(resultado.rows.map((fila) => fila.nombre)).toEqual([
      'usuarios_email_key', 'usuarios_prioridad_agua_check', 'usuarios_prioridad_ingresos_check',
      'usuarios_prioridad_suelo_check', 'usuarios_rol_check',
    ]);
  });

  it('genera UUID, rol, prioridades y fechas en PostgreSQL', async () => {
    const usuario = await crearUsuario();
    expect(usuario.id).toMatch(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
    const resultado = await conexion.query<{ rol: string; prioridad_agua: number; prioridad_suelo: number; prioridad_ingresos: number; creado_en: Date }>(
      'SELECT rol, prioridad_agua, prioridad_suelo, prioridad_ingresos, creado_en FROM usuarios WHERE id=$1', [usuario.id]);
    expect(resultado.rows[0]).toMatchObject({ rol: 'agricultor', prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3 });
    expect(resultado.rows[0]?.creado_en).toBeInstanceOf(Date);
    const predeterminados = await conexion.query<{ expresion: string }>(`
      SELECT pg_get_expr(d.adbin, d.adrelid) AS expresion FROM pg_attrdef d
      JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
      WHERE d.adrelid='usuarios'::regclass AND a.attname='id'`);
    expect(predeterminados.rows[0]?.expresion).toContain('gen_random_uuid()');
  });

  it('conserva los NULL permitidos aunque existan valores predeterminados', async () => {
    const usuario = await crearUsuario();
    const resultado = await conexion.query<{ prioridad_agua: null; creado_en: null }>(
      'UPDATE usuarios SET prioridad_agua=NULL, creado_en=NULL WHERE id=$1 RETURNING prioridad_agua, creado_en', [usuario.id]);
    expect(resultado.rows[0]).toEqual({ prioridad_agua: null, creado_en: null });
  });

  it('conserva todos los valores predeterminados del modelo de datos', async () => {
    const resultado = await conexion.query<{ tabla: string; columna: string; expresion: string }>(`
      SELECT t.relname AS tabla, a.attname AS columna, pg_get_expr(d.adbin,d.adrelid) AS expresion
      FROM pg_attrdef d JOIN pg_class t ON t.oid=d.adrelid
      JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
      WHERE t.relnamespace='public'::regnamespace AND t.relname <> '_prisma_migrations'`);
    const predeterminados = Object.fromEntries(resultado.rows.map((fila) => [
      `${fila.tabla}.${fila.columna}`, fila.expresion === 'CURRENT_TIMESTAMP' ? 'now()' : fila.expresion,
    ]));
    expect(predeterminados).toEqual({
      'usuarios.id': 'gen_random_uuid()', 'usuarios.rol': "'agricultor'::text",
      'usuarios.prioridad_agua': '3', 'usuarios.prioridad_suelo': '3', 'usuarios.prioridad_ingresos': '3',
      'usuarios.creado_en': 'now()', 'terrenos.id': 'gen_random_uuid()', 'terrenos.tiene_riego': 'false',
      'terrenos.creado_en': 'now()', 'cultivos.fija_nitrogeno': 'false', 'siembras.id': 'gen_random_uuid()',
      'siembras.creado_en': 'now()', 'clima_cache.actualizado_en': 'now()',
    });
  });
});

describe('Restricciones reales y relaciones', () => {
  it('rechaza correos repetidos', async () => {
    const usuario = await crearUsuario();
    await expect(conexion.query("INSERT INTO usuarios(email,password_hash,nombre) VALUES($1,'prueba','Duplicado')", [usuario.email]))
      .rejects.toMatchObject({ code: '23505' });
  });

  it('admite tecnico y rechaza otros roles', async () => {
    const usuario = await crearUsuario();
    await conexion.query("UPDATE usuarios SET rol='tecnico' WHERE id=$1", [usuario.id]);
    await expect(conexion.query("UPDATE usuarios SET rol='administrador' WHERE id=$1", [usuario.id])).rejects.toMatchObject({ code: '23514' });
  });

  it.each(['prioridad_agua', 'prioridad_suelo', 'prioridad_ingresos'])(
    'admite límites y rechaza valores fuera de rango en %s', async (columna) => {
      const usuario = await crearUsuario();
      await conexion.query(`UPDATE usuarios SET ${columna}=1 WHERE id=$1`, [usuario.id]);
      await conexion.query(`UPDATE usuarios SET ${columna}=5 WHERE id=$1`, [usuario.id]);
      await conexion.query('SAVEPOINT limite_inferior');
      await expect(conexion.query(`UPDATE usuarios SET ${columna}=0 WHERE id=$1`, [usuario.id])).rejects.toMatchObject({ code: '23514' });
      await conexion.query('ROLLBACK TO SAVEPOINT limite_inferior');
      await expect(conexion.query(`UPDATE usuarios SET ${columna}=6 WHERE id=$1`, [usuario.id])).rejects.toMatchObject({ code: '23514' });
    },
  );

  it('rechaza campos obligatorios nulos', async () => {
    await expect(conexion.query("INSERT INTO usuarios(email,password_hash,nombre) VALUES(NULL,'prueba','Prueba')"))
      .rejects.toMatchObject({ code: '23502' });
  });

  it('rechaza referencias inexistentes', async () => {
    await expect(conexion.query("INSERT INTO terrenos(usuario_id,nombre,latitud,longitud) VALUES($1,'Prueba',0,0)", [randomUUID()]))
      .rejects.toMatchObject({ code: '23503' });
  });

  it('relaciona usuario, terreno, cultivo y siembra', async () => {
    const datos = await crearRelaciones();
    const resultado = await conexion.query<{ usuario: string; cultivo: string }>(`
      SELECT u.id AS usuario, c.id AS cultivo FROM siembras s JOIN terrenos t ON t.id=s.terreno_id
      JOIN usuarios u ON u.id=t.usuario_id JOIN cultivos c ON c.id=s.cultivo_id WHERE s.id=$1`, [datos.siembraId]);
    expect(resultado.rows).toEqual([{ usuario: datos.usuario.id, cultivo: datos.cultivoId }]);
    const valores = await conexion.query<{ tiene_riego: boolean; fija_nitrogeno: boolean }>(
      'SELECT t.tiene_riego, c.fija_nitrogeno FROM terrenos t CROSS JOIN cultivos c WHERE t.id=$1 AND c.id=$2', [datos.terrenoId, datos.cultivoId]);
    expect(valores.rows[0]).toEqual({ tiene_riego: false, fija_nitrogeno: false });
  });

  it.each(['terreno_id', 'cultivo_id'])('rechaza una referencia inexistente en siembras.%s', async (columna) => {
    const datos = await crearRelaciones();
    await expect(conexion.query(`UPDATE siembras SET ${columna}=$1 WHERE id=$2`, [randomUUID(), datos.siembraId]))
      .rejects.toMatchObject({ code: '23503', constraint: `siembras_${columna}_fkey` });
  });

  it('borra terrenos y siembras en cascada al borrar su usuario', async () => {
    const datos = await crearRelaciones();
    await conexion.query('DELETE FROM usuarios WHERE id=$1', [datos.usuario.id]);
    expect((await conexion.query('SELECT id FROM terrenos WHERE id=$1', [datos.terrenoId])).rowCount).toBe(0);
    expect((await conexion.query('SELECT id FROM siembras WHERE id=$1', [datos.siembraId])).rowCount).toBe(0);
    expect((await conexion.query('SELECT id FROM cultivos WHERE id=$1', [datos.cultivoId])).rowCount).toBe(1);
  });

  it('borra solo las siembras dependientes al borrar un terreno', async () => {
    const datos = await crearRelaciones();
    await conexion.query('DELETE FROM terrenos WHERE id=$1', [datos.terrenoId]);
    expect((await conexion.query('SELECT id FROM siembras WHERE id=$1', [datos.siembraId])).rowCount).toBe(0);
    expect((await conexion.query('SELECT id FROM usuarios WHERE id=$1', [datos.usuario.id])).rowCount).toBe(1);
  });

  it('impide borrar un cultivo utilizado', async () => {
    const datos = await crearRelaciones();
    await expect(conexion.query('DELETE FROM cultivos WHERE id=$1', [datos.cultivoId])).rejects.toMatchObject({ code: '23503' });
  });

  it('almacena JSONB y arreglos de texto y smallint sin modificar el contrato', async () => {
    const datos = await crearRelaciones();
    const clave = `prueba_${randomUUID()}`;
    await conexion.query('INSERT INTO clima_cache(clave,datos) VALUES($1,$2::jsonb)', [clave, JSON.stringify({ prueba: true, valores: [1, 2] })]);
    const cache = await conexion.query<{ datos: unknown; actualizado_en: Date }>('SELECT datos,actualizado_en FROM clima_cache WHERE clave=$1', [clave]);
    expect(cache.rows[0]?.datos).toEqual({ prueba: true, valores: [1, 2] });
    expect(cache.rows[0]?.actualizado_en).toBeInstanceOf(Date);
    await conexion.query('INSERT INTO plantillas_rotacion(id,nombre,secuencia) VALUES($1,$2,$3::text[])', [clave, 'Fixture de arreglos', [datos.cultivoId, datos.cultivoId]]);
    expect((await conexion.query<{ secuencia: string[] }>('SELECT secuencia FROM plantillas_rotacion WHERE id=$1', [clave])).rows[0]?.secuencia)
      .toEqual([datos.cultivoId, datos.cultivoId]);
    expect((await conexion.query<{ meses_siembra: number[] }>('SELECT meses_siembra FROM cultivos WHERE id=$1', [datos.cultivoId])).rows[0]?.meses_siembra)
      .toEqual([1, 2]);
  });

  it('rechaza desbordamiento de NUMERIC(8,2) y SMALLINT', async () => {
    const datos = await crearRelaciones();
    await conexion.query('SAVEPOINT antes_del_error');
    await expect(conexion.query('UPDATE terrenos SET area_ha=1000000 WHERE id=$1', [datos.terrenoId])).rejects.toMatchObject({ code: '22003' });
    await conexion.query('ROLLBACK TO SAVEPOINT antes_del_error');
    await expect(conexion.query('UPDATE cultivos SET demanda_agua=40000 WHERE id=$1', [datos.cultivoId])).rejects.toMatchObject({ code: '22003' });
  });

  it('rechaza UUID y fechas inválidos', async () => {
    const datos = await crearRelaciones();
    await conexion.query('SAVEPOINT antes_del_error');
    await expect(conexion.query('SELECT id FROM usuarios WHERE id=$1', ['invalido'])).rejects.toMatchObject({ code: '22P02' });
    await conexion.query('ROLLBACK TO SAVEPOINT antes_del_error');
    await expect(conexion.query('UPDATE siembras SET fecha_siembra=$1 WHERE id=$2', ['2026-02-30', datos.siembraId]))
      .rejects.toMatchObject({ code: '22008' });
  });

  it('lee y escribe con Prisma usando los nombres mapeados, y revierte sus datos', async () => {
    const email = `prisma-${randomUUID()}@example.invalid`;
    const revertir = new Error('Reversión controlada de la prueba');
    await expect(prismaPruebas.$transaction(async (transaccion) => {
      const usuario = await transaccion.usuario.create({ data: { email, passwordHash: 'solo_prueba', nombre: 'Fixture Prisma' } });
      const terreno = await transaccion.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Fixture Prisma', latitud: 0,
        longitud: 0, areaHa: '1.25' } });
      expect(terreno.areaHa?.toString()).toBe('1.25');
      expect(usuario.prioridadAgua).toBe(3);
      expect((await transaccion.usuario.findUnique({ where: { id: usuario.id }, include: { terrenos: true } }))?.terrenos).toHaveLength(1);
      throw revertir;
    })).rejects.toBe(revertir);
    expect(await prismaPruebas.usuario.count({ where: { email } })).toBe(0);
  });

  it('rechaza una contraseña incorrecta sin revelar credenciales', async () => {
    const urlInvalida = new URL(urlPruebas);
    urlInvalida.password = decodeURIComponent(urlInvalida.password) + '-prueba-invalida';
    const grupoInvalido = new Pool({ connectionString: urlInvalida.toString(), connectionTimeoutMillis: 3000 });
    let conectado = false;
    let codigo: unknown;
    try {
      const clienteInvalido = await grupoInvalido.connect();
      conectado = true;
      clienteInvalido.release();
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) codigo = error.code;
    } finally { await grupoInvalido.end(); }
    // Comparar solo datos públicos; nunca entregar el cliente o su URL al reporter.
    expect({ conectado, codigo }).toEqual({ conectado: false, codigo: '28P01' });
  });
});
