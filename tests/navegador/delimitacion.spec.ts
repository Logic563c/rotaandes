import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';

// Usuario y terreno temporales en la base local aislada; se eliminan al terminar. No son datos reales.
async function tocar(page: Page, movil: boolean, x: number, y: number) { if (movil) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }

test('delimitar, editar, guardar, recuperar y eliminar la zona de cultivo', async ({ page }, informacion) => {
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  const email = `delimitacion-e2e-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const movil = informacion.project.name.startsWith('celular');
  try {
    const usuario = await grupo.query<{ id: string }>('INSERT INTO usuarios (email, password_hash, nombre) VALUES ($1,$2,$3) RETURNING id', [email, await bcrypt.hash(password, 12), 'Persona de prueba']);
    const terreno = await grupo.query<{ id: string }>('INSERT INTO terrenos (usuario_id,nombre,latitud,longitud,altitud_m,area_ha) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [usuario.rows[0]?.id, 'Parcela de prueba para delimitar', -0.93, -78.62, 2800, 2.5]);
    const id = terreno.rows[0]?.id; if (!id) throw new Error('No se preparó la fixture aislada.');
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password);
    await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.goto(`/terrenos/${id}`);
    const modulo = page.getByRole('region', { name: 'Zona de cultivo', exact: true });
    await expect(modulo.getByText('Este terreno todavía no tiene una zona delimitada.')).toBeVisible();
    await modulo.getByRole('button', { name: 'Delimitar zona de cultivo' }).click();
    const mapa = modulo.locator('.mapa-delimitacion');
    await expect(mapa).toBeVisible(); await mapa.evaluate((elemento) => elemento.scrollIntoView({ block: 'center' }));
    const caja = await mapa.boundingBox(); if (!caja) throw new Error('Mapa sin tamaño');
    const cx = caja.x + caja.width / 2; const cy = caja.y + caja.height / 2; const dx = Math.min(90, caja.width / 2 - 40); const dy = 70;

    // Primero, un contorno cruzado (forma de moño): se explica y no se puede guardar.
    for (const [x, y] of [[cx - dx, cy - dy], [cx + dx, cy + dy], [cx + dx, cy - dy], [cx - dx, cy + dy]] as const) await tocar(page, movil, x, y);
    await expect(modulo.locator('.vertice-delimitacion')).toHaveCount(4);
    await modulo.getByRole('button', { name: 'Cerrar zona' }).click();
    await expect(modulo.getByText(/Los lados de la zona se cruzan/)).toBeVisible();
    await expect(modulo.getByRole('button', { name: 'Guardar delimitación' })).toBeDisabled();
    await modulo.getByRole('button', { name: 'Cancelar cambios' }).click();

    // Contorno válido: cuatro esquinas y cierre tocando el punto 1.
    await modulo.getByRole('button', { name: 'Delimitar zona de cultivo' }).click();
    await expect(mapa).toBeVisible(); await mapa.evaluate((elemento) => elemento.scrollIntoView({ block: 'center' }));
    const caja2 = await mapa.boundingBox(); if (!caja2 || Math.abs(caja2.y - caja.y) > 2) throw new Error('El mapa cambió de posición');
    for (const [x, y] of [[cx - dx, cy - dy], [cx + dx, cy - dy], [cx + dx, cy + dy], [cx - dx, cy + dy]] as const) await tocar(page, movil, x, y);
    await expect(modulo.getByRole('definition').filter({ hasText: /^4$/ })).toBeVisible();
    await modulo.screenshot({ path: informacion.outputPath('delimitacion-dibujando.png'), animations: 'disabled' });
    const primero = modulo.locator('.vertice-delimitacion--primero'); const centroPrimero = await primero.boundingBox(); if (!centroPrimero) throw new Error('Sin punto 1');
    await tocar(page, movil, centroPrimero.x + centroPrimero.width / 2, centroPrimero.y + centroPrimero.height / 2);
    await expect(modulo.getByText(/Zona cerrada/)).toBeVisible();
    const area = modulo.getByRole('definition').filter({ hasText: / ha/ }).first();
    await expect(area).toContainText(/\d+,\d{2} ha/); const areaAntes = await area.textContent();
    await expect(modulo.getByText(/respecto al área declarada de 2,5 ha/)).toBeVisible();

    // Editar un vértice: arrastrar el punto 3 hacia fuera.
    const tercero = modulo.locator('.vertice-delimitacion').filter({ hasText: /^3$/ }); const caja3 = await tercero.boundingBox(); if (!caja3) throw new Error('Sin punto 3');
    await page.mouse.move(caja3.x + caja3.width / 2, caja3.y + caja3.height / 2); await page.mouse.down();
    await page.mouse.move(caja3.x + caja3.width / 2 + 25, caja3.y + caja3.height / 2 + 20, { steps: 8 }); await page.mouse.up();
    await expect(area).not.toHaveText(areaAntes ?? '');
    // Insertar un punto intermedio tocando un «+».
    const intermedio = modulo.locator('.vertice-delimitacion--intermedio').first(); const cajaMas = await intermedio.boundingBox(); if (!cajaMas) throw new Error('Sin punto intermedio');
    await tocar(page, movil, cajaMas.x + cajaMas.width / 2, cajaMas.y + cajaMas.height / 2);
    await expect(modulo.locator('.vertice-delimitacion:not(.vertice-delimitacion--intermedio)')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const guardado = page.waitForResponse((respuesta) => respuesta.url().endsWith(`/terrenos/${id}/delimitacion`) && respuesta.request().method() === 'PUT');
    await modulo.getByRole('button', { name: 'Guardar delimitación' }).click();
    expect((await guardado).status()).toBe(200);
    await expect(modulo.getByText(/Delimitación guardada/)).toBeVisible();
    const fila = await grupo.query<{ poligono: { type: string; coordinates: number[][][] } | null; area_ha: string }>('SELECT poligono, area_ha FROM terrenos WHERE id = $1', [id]);
    expect(fila.rows[0]?.poligono?.type).toBe('Polygon'); expect(fila.rows[0]?.poligono?.coordinates[0]).toHaveLength(6); expect(Number(fila.rows[0]?.area_ha)).toBe(2.5);

    // Al volver a abrir el terreno, la zona guardada aparece sola: interior verde y exterior oscurecido.
    await page.reload();
    await expect(modulo.getByText(/Zona delimitada: \d+,\d{2} ha/)).toBeVisible();
    await expect(modulo.locator('.mapa-delimitacion path.leaflet-interactive, .mapa-delimitacion .leaflet-overlay-pane path')).not.toHaveCount(0);
    await expect(modulo.getByRole('button', { name: 'Editar vértices' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await modulo.screenshot({ path: informacion.outputPath('delimitacion-guardada.png'), animations: 'disabled' });

    // Eliminar la delimitación: el terreno vuelve a ser solo un punto y conserva su área declarada.
    await modulo.getByRole('button', { name: 'Eliminar delimitación' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(modulo.getByText(/Delimitación eliminada/)).toBeVisible();
    await expect(modulo.getByRole('button', { name: 'Delimitar zona de cultivo' })).toBeVisible();
    const final = await grupo.query<{ poligono: unknown; area_ha: string }>('SELECT poligono, area_ha FROM terrenos WHERE id = $1', [id]);
    expect(final.rows[0]?.poligono).toBeNull(); expect(Number(final.rows[0]?.area_ha)).toBe(2.5);
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email = $1', [email]);
    await grupo.end();
  }
});
