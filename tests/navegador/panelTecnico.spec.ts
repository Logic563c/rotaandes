import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { test, expect } from '@playwright/test';
import { PrismaClient, Prisma } from '../../backend/src/generated/prisma/client.js';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';
import { crearTecnicoLocal } from '../../backend/src/services/aprovisionarTecnico.js';
import { obtenerClavePronostico } from '../../backend/src/services/pronostico.js';
import { crearBasePronostico } from '../../backend/tests/fixtures/pronosticoPruebas.js';

test('panel técnico: roles reales, mapa, filtros, alertas, consulta y ausencia de escrituras', async ({ page }, informacion) => {
  test.setTimeout(120000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const tecnicoEmail = `tecnico-e2e-${randomUUID()}@example.invalid`; const agricultorEmail = `panel-agricultor-${randomUUID()}@example.invalid`; const segundoEmail = `panel-segundo-${randomUUID()}@example.invalid`;
  const password = randomBytes(24).toString('base64url'); const claves = [obtenerClavePronostico(-0.93, -78.62), obtenerClavePronostico(-0.95, -78.64)];
  const anteriores = await prisma.climaCache.findMany({ where: { clave: { in: claves } } }); const cultivos: string[] = []; const errores: string[] = []; const mutaciones: string[] = []; let observar = false;
  page.on('pageerror', (error) => errores.push(error.message)); page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errores.push(m.text()); });
  page.on('request', (p) => { if (observar && new URL(p.url()).hostname === 'localhost' && !['GET', 'OPTIONS'].includes(p.method())) mutaciones.push(p.method()); });
  const sesion = z.object({ token: z.string(), usuario: z.object({ id: z.uuid() }) });
  try {
    for (const cultivo of cultivosReferenciales) { const filas = await prisma.cultivo.createManyAndReturn({ data: [cultivo], skipDuplicates: true, select: { id: true } }); cultivos.push(...filas.map((f) => f.id)); }
    const tecnico = await crearTecnicoLocal({ email: tecnicoEmail, nombre: 'Técnico temporal de pruebas', password }, () => prisma.usuario);
    const registrar = async (email: string, parroquia: string) => { const respuesta = await page.request.post('http://localhost:3000/api/auth/registro', { data: { email, password, nombre: 'Agricultor temporal', parroquia } }); expect(respuesta.status()).toBe(201); return sesion.parse(await respuesta.json()); };
    const agricultor = await registrar(agricultorEmail, 'Pujilí'); const segundo = await registrar(segundoEmail, 'Latacunga');
    const parcela = await prisma.terreno.create({ data: { usuarioId: agricultor.usuario.id, nombre: 'A - Parcela con posible helada', latitud: -0.93, longitud: -78.62, areaHa: 1.2 } });
    await prisma.terreno.create({ data: { usuarioId: agricultor.usuario.id, nombre: 'B - Parcela sin alertas previstas', latitud: -0.95, longitud: -78.64 } });
    await prisma.terreno.create({ data: { usuarioId: segundo.usuario.id, nombre: 'C - Parcela sin pronóstico', latitud: -0.94, longitud: -78.63 } });
    await prisma.siembra.createMany({ data: [{ terrenoId: parcela.id, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01') }, { terrenoId: parcela.id, cultivoId: 'haba', fechaSiembra: new Date('2026-01-01') }] });
    const fecha = new Date().toISOString(); const alerta = crearBasePronostico(fecha); const sinAlerta = crearBasePronostico(fecha); sinAlerta.coordenadas = { latitud: -0.95, longitud: -78.64 }; sinAlerta.dias.forEach((d) => { d.t_min = 3; });
    for (const base of [alerta, sinAlerta]) { const clave = obtenerClavePronostico(base.coordenadas.latitud, base.coordenadas.longitud); await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(fecha) }, update: { datos: base, actualizadoEn: new Date(fecha) } }); }
    const terrenosAntes = await prisma.terreno.findMany({ orderBy: { id: 'asc' } }); const siembrasAntes = await prisma.siembra.findMany({ orderBy: { id: 'asc' } }); const cacheAntes = await prisma.climaCache.findMany({ orderBy: { clave: 'asc' } });
    await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(tecnicoEmail); await page.getByLabel('Contraseña *', { exact: true }).fill(password);
    const login = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/login'); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); const acceso = sesion.parse(await (await login).json()); expect(acceso.usuario.id).toBe(tecnico.id);
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible(); observar = true; await page.getByRole('link', { name: 'Panel técnico', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Panel del técnico agrícola' })).toBeVisible(); await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);
    await expect(page.locator('.contenido-marcador-terreno').first()).toHaveCSS('display', 'flex');
    await expect(page.getByText('Última siembra: Haba', { exact: false })).toBeVisible(); await expect(page.getByText('❄ Posible helada', { exact: true })).toBeVisible(); await expect(page.getByText('✓ Sin alertas previstas', { exact: true })).toBeVisible(); await expect(page.getByText('? Estado desconocido', { exact: true })).toBeVisible();
    await expect(page.getByText('OpenStreetMap', { exact: true })).toBeVisible();
    const mapa = page.getByRole('region', { name: 'Mapa de terrenos' }); await mapa.screenshot({ path: informacion.outputPath('mapa-tecnico.png'), animations: 'disabled' });
    await page.getByLabel('Parroquia del perfil').selectOption('Pujilí'); await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2);
    await page.getByLabel('Cultivo en el historial').selectOption('papa'); await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1); await expect(page.getByText('Última siembra: Haba', { exact: false })).toBeVisible();
    await page.getByLabel('Cultivo en el historial').focus(); await expect(page.getByLabel('Cultivo en el historial')).toBeFocused(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.mouse.move(0, 0); await page.screenshot({ path: informacion.outputPath('panel-filtrado.png'), fullPage: true, animations: 'disabled' });
    await page.locator('.leaflet-marker-icon').click(); await expect(page.getByRole('link', { name: `Ver detalle de ${parcela.nombre}` })).toBeVisible();
    await page.getByRole('link', { name: `Consultar ${parcela.nombre}` }).click(); await expect(page.getByRole('heading', { name: parcela.nombre, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Eliminar terreno/ })).toHaveCount(0); await expect(page.getByRole('link', { name: /Editar terreno/ })).toHaveCount(0); await expect(page.getByRole('button', { name: /Registrar siembra/ })).toHaveCount(0);
    await page.screenshot({ path: informacion.outputPath('detalle-solo-lectura.png'), fullPage: true, animations: 'disabled' }); await page.getByRole('link', { name: '← Panel técnico', exact: true }).click();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click(); await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);
    await page.screenshot({ path: informacion.outputPath('panel-tecnico.png'), fullPage: true, animations: 'disabled' });
    await page.route('**/api/tecnico/terrenos?*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo controlado de prueba.' }) }));
    await page.getByRole('button', { name: 'Revisar datos guardados' }).click(); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('link', { name: `Consultar ${parcela.nombre}` })).toHaveCount(0);
    await page.screenshot({ path: informacion.outputPath('panel-error.png'), fullPage: true, animations: 'disabled' }); await page.unroute('**/api/tecnico/terrenos?*'); await page.getByRole('button', { name: 'Reintentar', exact: true }).click(); await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);
    expect(mutaciones).toEqual([]); expect(await prisma.terreno.findMany({ orderBy: { id: 'asc' } })).toEqual(terrenosAntes); expect(await prisma.siembra.findMany({ orderBy: { id: 'asc' } })).toEqual(siembrasAntes); expect(await prisma.climaCache.findMany({ orderBy: { clave: 'asc' } })).toEqual(cacheAntes);
    expect((await page.request.delete(`http://localhost:3000/api/terrenos/${parcela.id}`, { headers: { Authorization: `Bearer ${acceso.token}` } })).status()).toBe(403);
    observar = false; await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await page.getByLabel('Correo electrónico *').fill(segundoEmail); await page.getByLabel('Contraseña *', { exact: true }).fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Panel técnico', exact: true })).toHaveCount(0); await page.goto('/tecnico'); await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible(); await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
    expect((await page.request.get('http://localhost:3000/api/tecnico/terrenos', { headers: { Authorization: `Bearer ${segundo.token}` } })).status()).toBe(403); expect((await page.request.get(`http://localhost:3000/api/terrenos/${parcela.id}`, { headers: { Authorization: `Bearer ${segundo.token}` } })).status()).toBe(404);
    expect(errores).toEqual([]); await writeFile(informacion.outputPath('evidencia-tecnico.json'), JSON.stringify({ modo: 'Frontend/backend/PostgreSQL aislado reales; pronósticos sintéticos controlados y teselas OSM bloqueadas para no depender de Internet', terrenos: 3, filtros: { parroquia: 'Pujilí', cultivo_historial: 'papa', ultima_siembra: 'haba' }, mutaciones, errores, datos_agricolas_intactos: true }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: [tecnicoEmail, agricultorEmail, segundoEmail] } } });
    for (const clave of claves) { const anterior = anteriores.find((f) => f.clave === clave); if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } }); }
    await prisma.cultivo.deleteMany({ where: { id: { in: cultivos } } }); await prisma.$disconnect();
  }
});
