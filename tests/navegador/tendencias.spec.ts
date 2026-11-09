import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { PrismaClient, Prisma } from '../../backend/src/generated/prisma/client.js';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { claveTendencia } from '../../backend/src/services/tendencia.js';
import { crearMensualPrueba, crearDiarioPrueba } from '../../backend/tests/fixtures/tendenciasPruebas.js';
import { construirAnual } from '../../backend/src/services/analisisTendencia.js';

test('historia climática: PostgreSQL, veinte años, gráficos, errores, permisos y persistencia', async ({ page }, informacion) => {
  test.setTimeout(120000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const email = `tendencias-e2e-${randomUUID()}@example.invalid`; const segunda = `tendencias-ajeno-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const claves = [claveTendencia('mensual', -0.93, -78.62), claveTendencia('diario', -0.93, -78.62)];
  const anteriores = await prisma.climaCache.findMany({ where: { clave: { in: claves } } }); const errores: string[] = []; const mutaciones: string[] = []; let observar = false;
  page.on('pageerror', (error) => errores.push(error.message));
  page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push(mensaje.text()); });
  page.on('request', (peticion) => { if (observar && new URL(peticion.url()).hostname === 'localhost' && !['GET', 'OPTIONS'].includes(peticion.method())) mutaciones.push(peticion.method()); });
  try {
    await page.route('https://tile.openstreetmap.org/**', (ruta) => ruta.abort());
    await page.goto('/registro'); await page.getByLabel('Nombre completo *').fill('Prueba de tendencias'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    const terreno = await prisma.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Parcela de tendencias de prueba', latitud: -0.93, longitud: -78.62, areaHa: 1 } });
    const fecha = new Date().toISOString(); const mensual = crearMensualPrueba(fecha); const diario = crearDiarioPrueba(fecha);
    // Descargas reales archivadas; fecha y un dato diario modificados EXCLUSIVAMENTE para comprobar cobertura incompleta.
    diario.valores[0] = null; diario.advertencias.push('Dato diario retirado deliberadamente en prueba controlada; no es una nueva descarga NASA.');
    for (const base of [mensual, diario]) { const clave = claveTendencia(base.tipo, base.latitud, base.longitud); await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(fecha) }, update: { datos: base, actualizadoEn: new Date(fecha) } }); }
    const esperado = construirAnual(mensual, diario); const cacheAntes = await prisma.climaCache.findMany({ where: { clave: { in: claves } }, orderBy: { clave: 'asc' } });
    await page.goto(`/terrenos/${terreno.id}`); observar = true;
    const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/terrenos/${terreno.id}/tendencia`);
    await page.getByRole('button', { name: 'Ver tendencias 2005–2024' }).click();
    expect(z.object({ anual: z.array(z.unknown()) }).parse(await (await respuesta).json()).anual).toEqual(esperado);
    const region = page.getByRole('region', { name: '¿Cómo ha cambiado el clima?', exact: true }); const tabla = region.getByRole('table');
    await expect(tabla.getByRole('row')).toHaveCount(21); await expect(region.getByRole('figure')).toHaveCount(3); await expect(region.locator('.recharts-surface')).toHaveCount(3);
    await expect(tabla.getByRole('row', { name: /^2005 / })).toContainText('No disponible'); await expect(region.getByText(/7304 de 7305/)).toBeVisible();
    await expect(region.getByText(/Dato diario retirado deliberadamente/)).toBeVisible();
    const regionTabla = region.getByRole('region', { name: 'Tabla anual de tendencias' }); await regionTabla.focus(); await expect(regionTabla).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await region.getByRole('heading', { name: '¿Cómo ha cambiado el clima?', exact: true }).scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.screenshot({ path: informacion.outputPath('tendencias-pantalla.png'), animations: 'disabled' });
    await region.screenshot({ path: informacion.outputPath('tendencias-completas.png'), animations: 'disabled' });
    await region.getByRole('figure').first().screenshot({ path: informacion.outputPath('precipitacion-anual.png'), animations: 'disabled' });
    await regionTabla.screenshot({ path: informacion.outputPath('tabla-cobertura.png'), animations: 'disabled' });
    expect(await prisma.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await prisma.siembra.count({ where: { terrenoId: terreno.id } })).toBe(0);
    expect(await prisma.climaCache.findMany({ where: { clave: { in: claves } }, orderBy: { clave: 'asc' } })).toEqual(cacheAntes); expect(mutaciones).toEqual([]);
    await page.route(`**/terrenos/${terreno.id}/tendencia`, (ruta) => ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo controlado para probar indisponibilidad.' }) }));
    await region.getByRole('button', { name: 'Volver a comprobar tendencias' }).click(); await expect(region.getByRole('alert')).toBeVisible(); await expect(region.getByRole('table')).toHaveCount(0);
    await region.screenshot({ path: informacion.outputPath('tendencias-indisponibles.png'), animations: 'disabled' });
    await page.unroute(`**/terrenos/${terreno.id}/tendencia`); await region.getByRole('button', { name: 'Reintentar' }).click(); await expect(tabla.getByRole('row')).toHaveCount(21);
    observar = false; await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *', { exact: true }).fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.goto(`/terrenos/${terreno.id}`); await page.getByRole('button', { name: 'Ver tendencias 2005–2024' }).click(); await expect(page.getByRole('region', { name: 'Tabla anual de tendencias' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    const registro = await page.request.post('http://localhost:3000/api/auth/registro', { data: { nombre: 'Otra cuenta temporal', email: segunda, password } }); expect(registro.status()).toBe(201);
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(segunda); await page.getByLabel('Contraseña *', { exact: true }).fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.goto(`/terrenos/${terreno.id}`); await expect(page.getByRole('alert')).toHaveText('Terreno no encontrado.'); await expect(page.getByRole('heading', { name: '¿Cómo ha cambiado el clima?' })).toHaveCount(0); expect(errores).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-tendencias.json'), JSON.stringify({ modo: 'PostgreSQL aislado real; archivos NASA archivados con fecha y un dato diario alterados explícitamente en prueba', anual: esperado, errores, mutaciones, sin_desbordamiento: true }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: [email, segunda] } } });
    for (const clave of claves) { const anterior = anteriores.find((fila) => fila.clave === clave); if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } }); }
    await prisma.$disconnect();
  }
});
