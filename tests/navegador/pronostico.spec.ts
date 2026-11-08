import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { test, expect } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { obtenerClavePronostico } from '../../backend/src/services/pronostico.js';
import { crearBasePronostico } from '../../backend/tests/fixtures/pronosticoPruebas.js';

test('pronóstico y alertas con caché controlada e indisponibilidad sin datos inventados', async ({ page }, informacion) => {
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  const email = `pronostico-e2e-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const clave = obtenerClavePronostico(-0.93, -78.62);
  const anterior = await grupo.query<{ datos: unknown; actualizado_en: Date | null }>('SELECT datos, actualizado_en FROM clima_cache WHERE clave=$1', [clave]);
  try {
    const usuario = await grupo.query<{ id: string }>('INSERT INTO usuarios (email,password_hash,nombre) VALUES ($1,$2,$3) RETURNING id', [email, await bcrypt.hash(password, 12), 'Persona de prueba']);
    const terrenos = await grupo.query<{ id: string }>('INSERT INTO terrenos (usuario_id,nombre,latitud,longitud,altitud_m) VALUES ($1,$2,$3,$4,$5) RETURNING id', [usuario.rows[0]?.id, 'Parcela de pronóstico de prueba', -0.93, -78.62, 3500]);
    const id = terrenos.rows[0]?.id; if (!id) throw new Error('No se pudo preparar la fixture aislada.');
    // Pronóstico totalmente sintético, solo en la base de pruebas. No se consulta Open-Meteo.
    const base = crearBasePronostico(new Date().toISOString());
    await grupo.query('INSERT INTO clima_cache (clave,datos,actualizado_en) VALUES ($1,$2,$3) ON CONFLICT (clave) DO UPDATE SET datos=EXCLUDED.datos, actualizado_en=EXCLUDED.actualizado_en', [clave, JSON.stringify(base), new Date(base.consultado_en)]);
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible(); await page.goto(`/terrenos/${id}`);
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByText(/No se pudo cargar parte del mapa base/)).toBeVisible();
    const solicitud = page.waitForResponse((respuesta) => respuesta.url().endsWith(`/terrenos/${id}/pronostico`));
    await page.getByRole('button', { name: 'Ver pronóstico de siete días' }).click(); const respuesta = await solicitud; expect(respuesta.status()).toBe(200);
    const region = page.getByRole('region', { name: 'Pronóstico y posibles heladas', exact: true });
    await expect(region.getByText(/Caché vigente/)).toBeVisible();
    await expect(region.getByRole('list', { name: 'Pronóstico diario' }).getByRole('listitem')).toHaveCount(7);
    await expect(region.getByText(/La temperatura mínima prevista es de/)).toHaveCount(3);
    await expect(region.getByText('Sin mínima: riesgo no evaluable')).toBeVisible(); await expect(region.getByRole('link', { name: 'CC BY 4.0' })).toBeVisible();
    await region.getByRole('button', { name: 'Comprobar actualización' }).click(); await expect(region.getByRole('button', { name: 'Comprobar actualización' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await region.screenshot({ path: informacion.outputPath('pronostico.png'), animations: 'disabled' });
    await page.route(`**/api/terrenos/${id}/pronostico`, async (ruta) => { await ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Proveedor simulado no disponible; sin pronóstico vigente.' }) }); });
    await page.reload(); await page.getByRole('button', { name: 'Ver pronóstico de siete días' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByText(/No se pudo cargar parte del mapa base/)).toBeVisible();
    await expect(region.getByRole('alert')).toBeVisible(); await expect(region.getByRole('list', { name: 'Pronóstico diario' })).toHaveCount(0);
    await region.screenshot({ path: informacion.outputPath('pronostico-no-disponible.png'), animations: 'disabled' });
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email=$1', [email]);
    if (anterior.rows[0]) await grupo.query('UPDATE clima_cache SET datos=$2,actualizado_en=$3 WHERE clave=$1', [clave, JSON.stringify(anterior.rows[0].datos), anterior.rows[0].actualizado_en]);
    else await grupo.query('DELETE FROM clima_cache WHERE clave=$1', [clave]);
    await grupo.end();
  }
});
