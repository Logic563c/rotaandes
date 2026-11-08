import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';

const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
const cultivosCreados: string[] = [];
async function esperarMapa(pagina: Page) {
  await expect(pagina.locator('.leaflet-container')).toBeVisible();
  await expect(pagina.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  await expect(pagina.getByText('Cargando mapa base…', { exact: true })).toHaveCount(0);
}
test.beforeAll(async () => {
  for (const cultivo of cultivosReferenciales) {
    const resultado = await grupo.query<{ id: string }>(`INSERT INTO cultivos
      (id, nombre, familia, altitud_min, altitud_max, ciclo_meses, meses_siembra, lluvia_min_mensual_mm,
       demanda_agua, tolerancia_helada, tolerancia_sequia, fija_nitrogeno, aporte_materia_organica,
       proteccion_erosion, valor_forraje, valor_mercado, descripcion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (id) DO NOTHING RETURNING id`, [cultivo.id, cultivo.nombre, cultivo.familia, cultivo.altitudMin,
      cultivo.altitudMax, cultivo.cicloMeses, cultivo.mesesSiembra, cultivo.lluviaMinMensualMm, cultivo.demandaAgua,
      cultivo.toleranciaHelada, cultivo.toleranciaSequia, cultivo.fijaNitrogeno, cultivo.aporteMateriaOrganica,
      cultivo.proteccionErosion, cultivo.valorForraje, cultivo.valorMercado, cultivo.descripcion]);
    if (resultado.rows[0]) cultivosCreados.push(resultado.rows[0].id);
  }
});
test.afterAll(async () => {
  try { if (cultivosCreados.length) await grupo.query('DELETE FROM cultivos WHERE id = ANY($1::text[])', [cultivosCreados]); }
  finally { await grupo.end(); }
});

test('recorrido completo de terrenos, mapa y siembras con persistencia real', async ({ page }, informacion) => {
  test.setTimeout(60000);
  const email = `parcelas-${randomUUID()}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  try {
    await page.goto('/registro');
    await page.getByLabel('Nombre completo *').fill('Persona de prueba');
    await page.getByLabel('Correo electrónico *').fill(email);
    await page.getByLabel('Contraseña *').fill(password);
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.getByRole('link', { name: 'Mis terrenos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tu primera parcela empieza aquí' })).toBeVisible();
    await page.getByRole('link', { name: /Añadir terreno/ }).click();
    await page.locator('.leaflet-container').click({ position: { x: 165, y: 165 } });
    await expect(page.getByLabel('Latitud *')).not.toHaveValue('');
    await expect(page.getByLabel('Longitud *')).not.toHaveValue('');
    await page.getByLabel('Nombre del terreno *').fill('Parcela de prueba');
    await page.getByLabel('Área declarada (hectáreas)').fill('1.25');
    await page.getByLabel('Tipo de suelo', { exact: true }).selectOption('franco');
    await page.getByLabel('Mi terreno tiene riego').check();
    await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
    await esperarMapa(page);
    await page.screenshot({ path: informacion.outputPath('crear-terreno.png'), fullPage: true, animations: 'disabled' });
    const creacion = page.waitForResponse((respuesta) => respuesta.request().method() === 'POST' && respuesta.url().endsWith('/api/terrenos'));
    await page.getByRole('button', { name: 'Guardar terreno' }).click();
    expect((await creacion).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Parcela de prueba', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mis siembras' })).toBeVisible();
    await expect(page.getByText(/Catálogo referencial de Cotopaxi/)).toBeVisible();
    await page.getByLabel('Cultivo *').selectOption('papa');
    await page.getByLabel('Fecha de siembra *').fill('2024-02-29');
    await page.getByLabel('Fecha de cosecha (opcional)').fill('2024-02-28');
    await page.getByRole('button', { name: 'Guardar siembra' }).click();
    await expect(page.getByRole('alert')).toHaveText(/no puede ser anterior/);
    await page.getByLabel('Fecha de cosecha (opcional)').fill('2024-09-01');
    await page.getByLabel('Notas (opcional)').fill('Registro automatizado de prueba');
    await page.getByRole('button', { name: 'Guardar siembra' }).click();
    await expect(page.getByText('La siembra se guardó correctamente.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Papa', exact: true })).toBeVisible();
    await expect(page.getByText('29/02/2024', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Editar siembra de Papa' }).click();
    await page.getByLabel('Cultivo *').selectOption('haba');
    await page.getByLabel('Fecha de cosecha (opcional)').clear();
    await page.getByLabel('Notas (opcional)').fill('Registro actualizado de prueba');
    await page.getByRole('button', { name: 'Guardar siembra' }).click();
    await expect(page.getByRole('heading', { name: 'Haba', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Editar terreno', exact: true }).click();
    await page.getByLabel('Nombre del terreno *').fill('Parcela revisada');
    await page.getByLabel('Latitud *').fill('-0.94');
    await page.getByLabel('Longitud *').fill('-78.63');
    await page.getByLabel('Área declarada (hectáreas)').fill('2.50');
    await page.getByRole('button', { name: 'Guardar terreno' }).click();
    await expect(page.getByRole('heading', { name: 'Parcela revisada', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Registro actualizado de prueba', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await esperarMapa(page);
    await page.screenshot({ path: informacion.outputPath('detalle-terreno.png'), fullPage: true, animations: 'disabled' });
    const guardado = await grupo.query<{ id: string; area_ha: string; altitud_m: number | null }>(`SELECT t.id, t.area_ha, t.altitud_m FROM terrenos t
      JOIN usuarios u ON t.usuario_id = u.id WHERE u.email = $1`, [email]);
    expect(guardado.rows).toHaveLength(1);
    expect(guardado.rows[0]?.area_ha).toBe('2.50');
    informacion.annotations.push({ type: 'altitud_guardada', description: String(guardado.rows[0]?.altitud_m ?? 'NULL: proveedor no disponible') });
    await page.getByRole('link', { name: 'Mis terrenos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Parcela revisada' })).toBeVisible();
    await page.getByTitle('Parcela revisada', { exact: true }).click();
    await expect(page.getByRole('link', { name: 'Ver detalle de Parcela revisada' })).toBeVisible();
    await esperarMapa(page);
    await expect(page.locator('.leaflet-popup')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: informacion.outputPath('mis-terrenos.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: 'Ver detalle de Parcela revisada' }).click();
    await page.getByRole('button', { name: 'Eliminar siembra de Haba' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Haba', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar siembra de Haba' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByText('Este terreno aún no tiene siembras registradas.')).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar terreno', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('todas sus siembras');
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('heading', { name: 'Tu primera parcela empieza aquí' })).toBeVisible();
    const restantes = await grupo.query<{ cantidad: number }>('SELECT COUNT(*)::int AS cantidad FROM terrenos WHERE usuario_id = (SELECT id FROM usuarios WHERE email = $1)', [email]);
    expect(restantes.rows[0]?.cantidad).toBe(0);
  } finally { await grupo.query('DELETE FROM usuarios WHERE email = $1', [email]); }
});

test('el mapa sin conexión conserva la alternativa de coordenadas manuales', async ({ page }, informacion) => {
  const email = `mapa-${randomUUID()}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  try {
    await grupo.query('INSERT INTO usuarios (email, password_hash, nombre) VALUES ($1,$2,$3)', [email, await bcrypt.hash(password, 12), 'Persona de prueba']);
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/login');
    await page.getByLabel('Correo electrónico *').fill(email);
    await page.getByLabel('Contraseña *').fill(password);
    await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.goto('/terrenos/nuevo');
    await expect(page.getByText(/No se pudo cargar parte del mapa base/)).toBeVisible();
    await page.getByLabel('Latitud *').fill('-0.93');
    await page.getByLabel('Longitud *').fill('-78.62');
    await expect(page.getByLabel('Latitud *')).toHaveValue('-0.93');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: informacion.outputPath('mapa-sin-conexion.png'), fullPage: true });
  } finally { await grupo.query('DELETE FROM usuarios WHERE email = $1', [email]); }
});
