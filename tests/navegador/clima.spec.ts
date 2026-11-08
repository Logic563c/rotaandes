import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { test, expect } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';

test('climatología con caché simulada, gráficas accesibles e indisponibilidad sin datos falsos', async ({ page }, informacion) => {
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  const email = `clima-e2e-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const clave = claveClima(-0.93, -78.62);
  const anterior = await grupo.query<{ datos: unknown; actualizado_en: Date | null }>('SELECT datos, actualizado_en FROM clima_cache WHERE clave = $1', [clave]);
  try {
    const usuario = await grupo.query<{ id: string }>('INSERT INTO usuarios (email, password_hash, nombre) VALUES ($1,$2,$3) RETURNING id', [email, await bcrypt.hash(password, 12), 'Persona de prueba']);
    const terreno = await grupo.query<{ id: string }>('INSERT INTO terrenos (usuario_id,nombre,latitud,longitud,altitud_m) VALUES ($1,$2,$3,$4,$5) RETURNING id', [usuario.rows[0]?.id, 'Parcela de prueba climática', -0.93, -78.62, 3500]);
    const id = terreno.rows[0]?.id; if (!id) throw new Error('No se preparó la fixture aislada.');
    // Fixture de pruebas basada en la respuesta archivada; la fecha es simulada, no una consulta en vivo.
    const base = crearBasePrueba(new Date().toISOString());
    base.advertencias.push('Prueba automatizada: caché simulada basada en la respuesta NASA archivada; este recorrido no consulta Internet.');
    await grupo.query('INSERT INTO clima_cache (clave,datos,actualizado_en) VALUES ($1,$2,$3) ON CONFLICT (clave) DO UPDATE SET datos=EXCLUDED.datos, actualizado_en=EXCLUDED.actualizado_en', [clave, JSON.stringify(base), new Date(base.consultado_en)]);
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password);
    await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.goto(`/terrenos/${id}`);
    const solicitud = page.waitForResponse((respuesta) => respuesta.url().endsWith(`/terrenos/${id}/clima`));
    await page.getByRole('button', { name: 'Ver climatología histórica' }).click();
    const respuesta = await solicitud; expect(respuesta.status()).toBe(200);
    const region = page.getByRole('region', { name: 'Climatología histórica', exact: true });
    await expect(region.getByText(/Caché verificada/)).toBeVisible();
    await expect(region.getByText(/Periodo 2001–2025/)).toBeVisible();
    await expect(region.getByRole('table').getByRole('row')).toHaveCount(13);
    await expect(region.locator('.recharts-wrapper')).toHaveCount(2);
    await expect(region.locator('.recharts-line')).toHaveCount(3);
    await expect(region.getByText(/caché simulada/)).toBeVisible();
    await expect(region.getByRole('row', { name: /Enero/ })).toContainText('Alto');
    const tabla = region.getByRole('region', { name: 'Tabla mensual de clima' });
    await tabla.focus(); await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await region.screenshot({ path: informacion.outputPath('climatologia.png'), animations: 'disabled' });
    await page.route(`**/api/terrenos/${id}/clima`, async (ruta) => { await ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Proveedor simulado no disponible, sin caché.' }) }); });
    await page.reload(); await page.getByRole('button', { name: 'Ver climatología histórica' }).click();
    await expect(region.getByRole('alert')).toBeVisible(); await expect(region.getByRole('table')).toHaveCount(0);
    await expect(region.locator('.recharts-wrapper')).toHaveCount(0);
    await region.screenshot({ path: informacion.outputPath('clima-no-disponible.png'), animations: 'disabled' });
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email = $1', [email]);
    if (anterior.rows[0]) await grupo.query('UPDATE clima_cache SET datos=$2, actualizado_en=$3 WHERE clave=$1', [clave, JSON.stringify(anterior.rows[0].datos), anterior.rows[0].actualizado_en]);
    else await grupo.query('DELETE FROM clima_cache WHERE clave=$1', [clave]);
    await grupo.end();
  }
});
