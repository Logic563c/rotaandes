import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { test, expect } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';

test('calendario calculado, explicación accesible y aislamiento con PostgreSQL', async ({ page }, informacion) => {
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  const email = `calendario-e2e-${randomUUID()}@example.invalid`; const correoAjeno = `calendario-ajeno-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const clave = claveClima(-0.93, -78.62); const creados: string[] = [];
  const anterior = await grupo.query<{ datos: unknown; actualizado_en: Date | null }>('SELECT datos, actualizado_en FROM clima_cache WHERE clave=$1', [clave]);
  try {
    for (const cultivo of cultivosReferenciales) {
      const resultado = await grupo.query<{ id: string }>(`INSERT INTO cultivos (id,nombre,familia,altitud_min,altitud_max,ciclo_meses,meses_siembra,lluvia_min_mensual_mm,demanda_agua,tolerancia_helada,tolerancia_sequia,fija_nitrogeno,aporte_materia_organica,proteccion_erosion,valor_forraje,valor_mercado,descripcion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NULL) ON CONFLICT (id) DO NOTHING RETURNING id`, [cultivo.id,cultivo.nombre,cultivo.familia,cultivo.altitudMin,cultivo.altitudMax,cultivo.cicloMeses,cultivo.mesesSiembra,cultivo.lluviaMinMensualMm,cultivo.demandaAgua,cultivo.toleranciaHelada,cultivo.toleranciaSequia,cultivo.fijaNitrogeno,cultivo.aporteMateriaOrganica,cultivo.proteccionErosion,cultivo.valorForraje,cultivo.valorMercado]);
      if (resultado.rows[0]) creados.push(resultado.rows[0].id);
    }
    const crearUsuario = async (correo: string) => (await grupo.query<{ id: string }>('INSERT INTO usuarios (email,password_hash,nombre) VALUES ($1,$2,$3) RETURNING id', [correo, await bcrypt.hash(password, 12), 'Persona de prueba'])).rows[0]?.id;
    const usuario = await crearUsuario(email); const ajeno = await crearUsuario(correoAjeno);
    const crearTerreno = async (propietario: string | undefined) => (await grupo.query<{ id: string }>('INSERT INTO terrenos (usuario_id,nombre,latitud,longitud,altitud_m,tiene_riego) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [propietario, 'Parcela de prueba', -0.93, -78.62, 3000, false])).rows[0]?.id;
    const id = await crearTerreno(usuario); const idAjeno = await crearTerreno(ajeno); if (!id || !idAjeno) throw new Error('Fixture aislada incompleta.');
    const base = crearBasePrueba(new Date().toISOString()); base.parametros.PRECTOTCORR.valores[0] = null;
    base.advertencias.push('Prueba automatizada: clima controlado, no consulta NASA en vivo ni recomendación para una parcela real.');
    await grupo.query('INSERT INTO clima_cache (clave,datos,actualizado_en) VALUES ($1,$2,$3) ON CONFLICT (clave) DO UPDATE SET datos=EXCLUDED.datos,actualizado_en=EXCLUDED.actualizado_en', [clave, JSON.stringify(base), new Date(base.consultado_en)]);
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible(); await page.goto(`/terrenos/${id}`); await expect(page.getByText(/No se pudo cargar parte del mapa base/)).toBeVisible();
    const solicitud = page.waitForResponse((respuesta) => respuesta.url().includes(`/terrenos/${id}/calendario?`)); await page.getByRole('button', { name: 'Ver calendario de siembra' }).click(); const respuesta = await solicitud; expect(respuesta.status()).toBe(200);
    const cuerpo = z.object({ celdas: z.array(z.object({ cultivo_id: z.string(), mes: z.number(), estado: z.string(), motivo: z.string() })) }).parse(await respuesta.json());
    expect(cuerpo.celdas).toHaveLength(120); const calculada = cuerpo.celdas.find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1); expect(calculada?.estado).toBe('no_determinado');
    const region = page.getByRole('region', { name: 'Calendario de siembra', exact: true }); const matriz = region.getByRole('region', { name: 'Matriz mensual de siembra' });
    await expect(region.getByRole('columnheader')).toHaveCount(13); await expect(region.getByRole('rowheader')).toHaveCount(10); await expect(region.getByText(/Prueba automatizada:/)).toBeVisible();
    const celda = region.getByRole('button', { name: 'Papa, Enero: No determinado', exact: true }); await celda.focus(); await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: 'Papa · Enero' }); await expect(dialogo).toBeVisible(); await expect(dialogo.getByText(calculada?.motivo ?? 'Fixture incompleta', { exact: true })).toBeVisible();
    await dialogo.screenshot({ path: informacion.outputPath('explicacion.png'), animations: 'disabled' }); await page.keyboard.press('Escape'); await expect(dialogo).toHaveCount(0);
    await matriz.evaluate((elemento) => { elemento.scrollTop = 0; elemento.scrollLeft = 0; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); await region.screenshot({ path: informacion.outputPath('calendario.png'), animations: 'disabled' });
    await matriz.focus(); await page.keyboard.press('End'); await matriz.evaluate((elemento) => { elemento.scrollLeft = elemento.scrollWidth; }); await expect(region.getByRole('columnheader', { name: 'Diciembre', exact: true })).toBeVisible();
    const sinSesion = await page.request.get(`http://localhost:3000/api/terrenos/${id}/calendario`); expect(sinSesion.status()).toBe(401);
    await page.goto(`/terrenos/${idAjeno}`); await expect(page.getByRole('alert')).toContainText('Terreno no encontrado'); await expect(page.getByRole('button', { name: 'Ver calendario de siembra' })).toHaveCount(0);
    await page.route(`**/api/terrenos/${id}/calendario?**`, async (ruta) => { await ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'NASA simulado no disponible y sin información fiable.' }) }); });
    await page.goto(`/terrenos/${id}`); await expect(page.getByText(/No se pudo cargar parte del mapa base/)).toBeVisible(); await page.getByRole('button', { name: 'Ver calendario de siembra' }).click(); await expect(region.getByRole('alert')).toBeVisible(); await expect(region.getByRole('table')).toHaveCount(0);
    await region.screenshot({ path: informacion.outputPath('calendario-no-disponible.png'), animations: 'disabled' });
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email = ANY($1::text[])', [[email, correoAjeno]]);
    if (anterior.rows[0]) await grupo.query('UPDATE clima_cache SET datos=$2,actualizado_en=$3 WHERE clave=$1', [clave, JSON.stringify(anterior.rows[0].datos), anterior.rows[0].actualizado_en]); else await grupo.query('DELETE FROM clima_cache WHERE clave=$1', [clave]);
    if (creados.length) await grupo.query('DELETE FROM cultivos WHERE id=ANY($1::text[])', [creados]); await grupo.end();
  }
});
