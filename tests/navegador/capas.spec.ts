import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { test, expect } from '@playwright/test';
import { PrismaClient } from '../../backend/src/generated/prisma/client.js';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { metadatosCapa, validarConsultaCapa } from '../../backend/src/data/catalogoCapas.js';

test('capas NASA: imágenes, fechas, leyenda, ausencia, errores y mapa de terrenos', async ({ page }, informacion) => {
  test.setTimeout(120000); const real = process.env.ROTAANDES_E2E_GIBS_REAL === '1';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) }) });
  const email = `capas-e2e-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const errores: string[] = []; const jsonDirectos: string[] = []; const mutaciones: string[] = []; const evidencias: unknown[] = [];
  let observar = false;
  page.on('pageerror', (error) => errores.push(error.name));
  page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push('console.error'); });
  page.on('request', (solicitud) => { const url = new URL(solicitud.url()); if (url.hostname === 'gibs.earthdata.nasa.gov') jsonDirectos.push('Petición GIBS directa del navegador'); if (observar && url.hostname === 'localhost' && !['GET', 'OPTIONS'].includes(solicitud.method())) mutaciones.push(solicitud.method()); });
  if (!real) {
    // Reproducción controlada de imágenes NASA archivadas; no es una nueva consulta externa.
    await page.route('https://tile.openstreetmap.org/**', (ruta) => ruta.abort());
    await page.route('**/api/capas-visuales/**', async (ruta) => {
      const url = new URL(ruta.request().url()); const tipo = url.pathname.split('/')[3];
      const consulta = validarConsultaCapa(tipo, Object.fromEntries(url.searchParams));
      const archivo = consulta.tipo === 'ndvi' ? 'ndvi-2023-01-01.png' : 'humedad_suelo-2023-01-17.png';
      const bytes = await readFile(new URL(`../../backend/tests/fixtures/satelites/${archivo}`, import.meta.url));
      if (url.pathname.endsWith('/imagen')) { await ruta.fulfill({ status: 200, contentType: 'image/png', body: bytes }); return; }
      await ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...metadatosCapa(consulta), estado_imagen: 'visible', origen: 'gibs', consultado_en: '2026-11-08T21:20:00Z', sha256: createHash('sha256').update(bytes).digest('hex') }) });
    });
  }
  try {
    await page.goto('/registro'); await page.getByLabel('Nombre completo *').fill('Prueba de capas'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    const terreno = await prisma.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Parcela temporal para visualizar capas', latitud: -0.93, longitud: -78.62, areaHa: 1, altitudM: 3000 } });
    await page.goto(`/terrenos/${terreno.id}`);
    const visor = page.getByRole('region', { name: 'Mapa y capas satelitales', exact: true }); await visor.getByRole('button', { name: 'Explorar capas NASA' }).click(); observar = true;
    const esquema = z.object({ tipo: z.string(), producto: z.string(), fecha: z.string(), estado_imagen: z.string(), sha256: z.string(), origen: z.string(), consultado_en: z.string() });
    for (const [tipo, nombre, alt] of [['ndvi', 'Vegetación NDVI (MODIS)', 'Vegetación NDVI'], ['humedad_suelo', 'Humedad superficial (SMAP)', 'Humedad superficial SMAP']] as const) {
      const respuesta = page.waitForResponse((respuesta) => { const url = new URL(respuesta.url()); return url.pathname === `/api/capas-visuales/${tipo}`; });
      await visor.getByRole('radio', { name: nombre, exact: true }).check(); const recibida = await respuesta; expect(recibida.status()).toBe(200); const datos = esquema.parse(await recibida.json());
      expect(datos.estado_imagen).toBe('visible'); if (real) expect(['gibs', 'cache']).toContain(datos.origen);
      const imagen = visor.getByRole('img', { name: alt, exact: true }); await expect(imagen).toBeVisible(); await expect.poll(() => imagen.evaluate((elemento) => elemento instanceof HTMLImageElement && elemento.complete && elemento.naturalWidth === 920)).toBe(true);
      await expect(visor.getByRole('list', { name: `Leyenda ${alt}` })).toBeVisible(); await expect(visor.getByText(/No es un promedio de enero/)).toBeVisible(); await expect(visor.getByTitle('Parcela temporal para visualizar capas', { exact: true })).toBeVisible();
      await visor.screenshot({ path: informacion.outputPath(`${tipo}.png`), animations: 'disabled' });
      evidencias.push({ ...datos, modo: real ? 'NASA GIBS consultado desde backend, sin interceptar capas' : 'Respuesta controlada con imagen NASA archivada' });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await visor.getByRole('checkbox', { name: 'Mostrar cartografía debajo de la capa' }).uncheck(); await expect(visor.getByRole('img', { name: 'Humedad superficial SMAP' })).toBeVisible();
    await visor.getByRole('combobox', { name: 'Año', exact: true }).selectOption('2024'); await expect(visor.getByRole('combobox', { name: 'Fecha de la imagen' })).toHaveValue('2024-01-17');
    await visor.getByRole('combobox', { name: 'Mes', exact: true }).selectOption('2'); await expect(visor.getByRole('combobox', { name: 'Fecha de la imagen' })).toHaveValue('2024-02-17');
    await visor.getByRole('combobox', { name: 'Fecha de la imagen' }).selectOption('2024-02-18'); await expect(visor.getByRole('combobox', { name: 'Fecha de la imagen' })).toHaveValue('2024-02-18');
    await visor.getByRole('radio', { name: 'Solo mapa base', exact: true }).check(); await expect(visor.locator('img.leaflet-image-layer')).toHaveCount(0);
    expect(await prisma.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await prisma.climaCache.count()).toBe(0); expect(mutaciones).toEqual([]);
    // Casos deliberadamente controlados, también después de las capturas reales.
    await page.route('**/api/capas-visuales/ndvi?**', (ruta) => ruta.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo controlado de prueba.' }) }));
    await visor.getByRole('radio', { name: 'Vegetación NDVI (MODIS)', exact: true }).check(); await expect(visor.getByRole('alert')).toBeVisible(); await expect(visor.locator('img.leaflet-image-layer')).toHaveCount(0);
    await visor.screenshot({ path: informacion.outputPath('indisponibilidad.png'), animations: 'disabled' });
    await page.unroute('**/api/capas-visuales/ndvi?**');
    await page.route('**/api/capas-visuales/ndvi?**', (ruta) => { const consulta = validarConsultaCapa('ndvi', Object.fromEntries(new URL(ruta.request().url()).searchParams)); return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...metadatosCapa(consulta), estado_imagen: 'sin_pixeles_visibles', sha256: '0'.repeat(64), consultado_en: '2026-11-08T21:20:00Z', origen: 'gibs' }) }); });
    await visor.getByRole('button', { name: 'Reintentar', exact: true }).click(); await expect(visor.getByText(/Sin píxeles visibles en esta fecha/)).toBeVisible(); await expect(visor.locator('img.leaflet-image-layer')).toHaveCount(0);
    await visor.screenshot({ path: informacion.outputPath('sin-pixeles.png'), animations: 'disabled' });
    observar = false; await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await expect(page.getByRole('heading', { name: 'Mapa y capas satelitales' })).toHaveCount(0);
    expect(errores).toEqual([]); expect(jsonDirectos).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-capas.json'), JSON.stringify({ modo: real ? 'Visualización real de NASA GIBS; incidencias finales simuladas expresamente' : 'Prueba controlada, imágenes NASA archivadas y contexto de terreno sintético', evidencias, errores, jsonDirectos, datos_terreno_intactos: true, mutaciones }, null, 2));
  } finally { await prisma.usuario.deleteMany({ where: { email } }); await prisma.$disconnect(); }
});
