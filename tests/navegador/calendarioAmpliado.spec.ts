import { randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { z } from 'zod';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { catalogoCompleto } from '../../backend/src/data/catalogoCultivos.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';

// Catálogo completo (29 cultivos) con datos FICTICIOS y clima NASA archivado: grupos, filtros, explicación, celular y siembra de un cultivo nuevo.
test('calendario ampliado: categorías, filtros, explicación, celular y siembra de un cultivo nuevo', async ({ page }, informacion) => {
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  const email = `calendario-ampliado-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const clave = claveClima(-1.045, -78.591); const creados: string[] = [];
  const anterior = await grupo.query<{ datos: unknown; actualizado_en: Date | null }>('SELECT datos, actualizado_en FROM clima_cache WHERE clave=$1', [clave]);
  try {
    for (const cultivo of catalogoCompleto) {
      const resultado = await grupo.query<{ id: string }>(`INSERT INTO cultivos (id,nombre,familia,altitud_min,altitud_max,ciclo_meses,meses_siembra,lluvia_min_mensual_mm,demanda_agua,tolerancia_helada,tolerancia_sequia,fija_nitrogeno,aporte_materia_organica,proteccion_erosion,valor_forraje,valor_mercado,descripcion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING RETURNING id`, [cultivo.id, cultivo.nombre, cultivo.familia, cultivo.altitudMin ?? null, cultivo.altitudMax ?? null, cultivo.cicloMeses,
        cultivo.mesesSiembra, cultivo.lluviaMinMensualMm ?? null, cultivo.demandaAgua ?? null, cultivo.toleranciaHelada ?? null, cultivo.toleranciaSequia ?? null, cultivo.fijaNitrogeno ?? false,
        cultivo.aporteMateriaOrganica ?? null, cultivo.proteccionErosion ?? null, cultivo.valorForraje ?? null, cultivo.valorMercado ?? null, cultivo.descripcion ?? null]);
      if (resultado.rows[0]) creados.push(resultado.rows[0].id);
    }
    const usuario = (await grupo.query<{ id: string }>('INSERT INTO usuarios (email,password_hash,nombre) VALUES ($1,$2,$3) RETURNING id', [email, await bcrypt.hash(password, 12), 'Persona de prueba'])).rows[0]?.id;
    const id = (await grupo.query<{ id: string }>('INSERT INTO terrenos (usuario_id,nombre,latitud,longitud,altitud_m,tiene_riego) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [usuario, 'Huerto de prueba con riego', -1.045, -78.591, 2900, true])).rows[0]?.id;
    if (!id) throw new Error('Fixture incompleta.');
    const base = { ...crearBasePrueba(new Date().toISOString()), latitud: -1.045, longitud: -78.591 };
    await grupo.query('INSERT INTO clima_cache (clave,datos,actualizado_en) VALUES ($1,$2,$3) ON CONFLICT (clave) DO UPDATE SET datos=EXCLUDED.datos,actualizado_en=EXCLUDED.actualizado_en', [clave, JSON.stringify(base), new Date(base.consultado_en)]);
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible(); await page.goto(`/terrenos/${id}`);

    const solicitud = page.waitForResponse((respuesta) => respuesta.url().includes(`/terrenos/${id}/calendario?`)); await page.getByRole('button', { name: 'Ver calendario de siembra' }).click();
    const respuesta = await solicitud; expect(respuesta.status()).toBe(200);
    const cuerpo = z.object({ celdas: z.array(z.object({ cultivo_id: z.string(), mes: z.number(), estado: z.string(), resumen: z.string() })), cultivos: z.array(z.object({ id: z.string(), categoria_nombre: z.string(), ciclo_corto: z.boolean() })) }).parse(await respuesta.json());
    expect(cuerpo.celdas).toHaveLength(348); expect(cuerpo.cultivos).toHaveLength(29);
    const region = page.getByRole('region', { name: 'Calendario de siembra', exact: true }); const matriz = region.getByRole('region', { name: 'Matriz mensual de siembra' });
    await expect(region.getByRole('columnheader')).toHaveCount(13); await expect(region.getByRole('rowheader')).toHaveCount(29);
    for (const nombre of ['Hortalizas de hoja (8)', 'Hortalizas de raíz (4)', 'Cebollas (2)', 'Cucurbitáceas (fruto) (2)', 'Tubérculos andinos (3)']) await expect(matriz.getByText(nombre, { exact: true })).toBeVisible();
    for (const etiqueta of ['Recomendado', 'Posible con precaución', 'No recomendado', 'No determinado']) await expect(region.getByRole('list', { name: 'Leyenda del calendario' }).getByText(new RegExp(`^. ${etiqueta}$`))).toBeVisible();
    await region.getByRole('checkbox', { name: 'Solo ciclos de hasta 4 meses' }).check();
    await expect(region.getByRole('rowheader')).toHaveCount(cuerpo.cultivos.filter((cultivo) => cultivo.ciclo_corto).length);
    await region.getByRole('searchbox', { name: 'Buscar cultivo' }).fill('lechuga'); await expect(region.getByText('Ningún cultivo coincide con los filtros elegidos.')).toBeVisible();
    await region.getByRole('button', { name: 'Quitar filtros' }).click(); await expect(region.getByRole('rowheader')).toHaveCount(29);
    const lechuga = cuerpo.celdas.find((celda) => celda.cultivo_id === 'lechuga' && celda.mes === 2);
    await region.getByRole('button', { name: new RegExp('^Lechuga, Febrero:') }).click();
    const dialogo = page.getByRole('dialog', { name: 'Lechuga · Febrero' }); await expect(dialogo.getByText(lechuga?.resumen ?? 'Fixture incompleta', { exact: true })).toBeVisible();
    await expect(dialogo.getByText('Lactuca sativa', { exact: true })).toBeVisible(); await expect(dialogo.getByRole('link', { name: 'INIAP (Yugsi, 2011)' })).toBeVisible();
    await dialogo.screenshot({ path: informacion.outputPath('explicacion-lechuga.png'), animations: 'disabled' }); await page.keyboard.press('Escape'); await expect(dialogo).toHaveCount(0);
    await matriz.evaluate((elemento) => { elemento.scrollLeft = 0; }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await region.screenshot({ path: informacion.outputPath('calendario-ampliado.png'), animations: 'disabled' });

    // Registro de una siembra con un cultivo de la ampliación (sin índices de rotación) y persistencia en PostgreSQL.
    await expect(page.locator('#cultivo-siembra optgroup[label="Tubérculos andinos"] option', { hasText: 'Melloco' })).toHaveCount(1);
    await page.getByLabel('Cultivo *').selectOption('melloco'); await page.getByLabel('Fecha de siembra *').fill('2026-10-05');
    await page.getByRole('button', { name: 'Guardar siembra' }).click(); await expect(page.getByText('La siembra se guardó correctamente.')).toBeVisible();
    const guardada = await grupo.query<{ cultivo_id: string }>('SELECT cultivo_id FROM siembras WHERE terreno_id=$1', [id]); expect(guardada.rows.map((fila) => fila.cultivo_id)).toEqual(['melloco']);
    await expect(page.getByRole('region', { name: 'Mis siembras', exact: true }).getByText('Melloco').filter({ visible: true }).first()).toBeVisible();
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email=$1', [email]);
    if (anterior.rows[0]) await grupo.query('UPDATE clima_cache SET datos=$2,actualizado_en=$3 WHERE clave=$1', [clave, JSON.stringify(anterior.rows[0].datos), anterior.rows[0].actualizado_en]); else await grupo.query('DELETE FROM clima_cache WHERE clave=$1', [clave]);
    if (creados.length) await grupo.query('DELETE FROM cultivos WHERE id=ANY($1::text[])', [creados]); await grupo.end();
  }
});
