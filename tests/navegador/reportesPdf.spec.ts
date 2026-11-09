import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { test, expect } from '@playwright/test';
import { PrismaClient, Prisma } from '../../backend/src/generated/prisma/client.js';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';
import { plantillasReferenciales } from '../../backend/src/data/catalogoPlantillas.js';
import { crearTecnicoLocal } from '../../backend/src/services/aprovisionarTecnico.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { obtenerClavePronostico } from '../../backend/src/services/pronostico.js';
import { claveTendencia } from '../../backend/src/services/tendencia.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';
import { crearBasePronostico } from '../../backend/tests/fixtures/pronosticoPruebas.js';
import { crearMensualPrueba, crearDiarioPrueba } from '../../backend/tests/fixtures/tendenciasPruebas.js';
import { leerPdf } from '../../backend/tests/fixtures/leerPdf.js';

test('informe PDF: descarga Bearer auténtica, contenido calculado, permisos y datos intactos', async ({ page }, informacion) => {
  test.setTimeout(120000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const emails = [`pdf-agricultor-${randomUUID()}@example.invalid`, `pdf-ajeno-${randomUUID()}@example.invalid`, `pdf-tecnico-${randomUUID()}@example.invalid`];
  const email = emails[0]; const emailAjeno = emails[1]; const emailTecnico = emails[2]; if (!email || !emailAjeno || !emailTecnico) throw new Error('Faltan cuentas temporales.');
  const password = randomBytes(24).toString('base64url'); const claves = [claveClima(-0.93, -78.62), obtenerClavePronostico(-0.93, -78.62), claveTendencia('mensual', -0.93, -78.62), claveTendencia('diario', -0.93, -78.62)];
  const anteriores = await prisma.climaCache.findMany({ where: { clave: { in: claves } } }); const cultivos: string[] = []; const plantillas: string[] = []; const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errores.push(m.text()); });
  const sesion = z.object({ token: z.string() });
  try {
    for (const c of cultivosReferenciales) { const filas = await prisma.cultivo.createManyAndReturn({ data: [c], skipDuplicates: true, select: { id: true } }); cultivos.push(...filas.map((f) => f.id)); }
    for (const p of plantillasReferenciales) { const filas = await prisma.plantillaRotacion.createManyAndReturn({ data: [p], skipDuplicates: true, select: { id: true } }); plantillas.push(...filas.map((f) => f.id)); }
    await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
    await page.goto('/registro'); await page.getByLabel('Nombre completo *').fill('Prueba temporal de informes'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } }); const terreno = await prisma.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Viña Ñandú de Pujilí', latitud: -0.93, longitud: -78.62, altitudM: 3000, areaHa: 1.2, tieneRiego: false } });
    await prisma.siembra.createMany({ data: [{ terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2024-10-01'), fechaCosecha: new Date('2025-04-01') }, { terrenoId: terreno.id, cultivoId: 'haba', fechaSiembra: new Date('2025-11-01') }] });
    const fecha = new Date().toISOString(); const clima = crearBasePrueba(fecha); clima.advertencias.push('Informe de prueba: altitud/riego y cachés controlados; no una finca observada.');
    const bases = [clima, crearBasePronostico(fecha), crearMensualPrueba(fecha), crearDiarioPrueba(fecha)];
    for (const [i, base] of bases.entries()) { const clave = claves[i]; if (!clave) throw new Error('Falta clave de prueba'); await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(fecha) }, update: { datos: base, actualizadoEn: new Date(fecha) } }); }
    const historial = await prisma.siembra.findMany({ where: { terrenoId: terreno.id }, orderBy: { id: 'asc' } }); const cache = await prisma.climaCache.findMany({ orderBy: { clave: 'asc' } });
    await page.goto(`/terrenos/${terreno.id}`); const boton = page.getByRole('button', { name: 'Descargar informe PDF', exact: true }); await expect(boton).toBeVisible();
    const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/terrenos/${terreno.id}/reporte.pdf`); const descarga = page.waitForEvent('download'); await boton.click();
    const http = await respuesta; expect(http.status()).toBe(200); expect(Boolean((await http.request().allHeaders()).authorization)).toBe(true); expect(http.headers()['content-type']).toContain('application/pdf');
    const archivo = await descarga; expect(archivo.suggestedFilename()).toBe(`rotaandes-${terreno.id}.pdf`); const ruta = informacion.outputPath('informe-controlado.pdf'); await archivo.saveAs(ruta); expect(await archivo.failure()).toBeNull(); const bytes = await readFile(ruta); const pdf = await leerPdf(bytes);
    expect(pdf.paginas.length).toBeGreaterThan(7); for (const texto of ['Viña Ñandú de Pujilí', 'NASA POWER', 'Open-Meteo', 'Papa', 'Haba', 'Calendario de siembra', '2005', 'Vacíos de información']) expect(pdf.texto.includes(texto)).toBe(true);
    expect(pdf.texto.includes(email)).toBe(false); expect(pdf.texto.includes(password)).toBe(false); expect(pdf.texto.includes('Sin dato')).toBe(true);
    await expect(page.getByText(/descarga del informe PDF está preparada/)).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('region', { name: 'Informe PDF del terreno' }).screenshot({ path: informacion.outputPath('descarga-pdf.png'), animations: 'disabled' });
    await page.route(`**/api/terrenos/${terreno.id}/reporte.pdf`, (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo de prueba controlado' }) })); await boton.click(); await expect(page.getByRole('alert')).toContainText('No se pudo preparar');
    await page.getByRole('region', { name: 'Informe PDF del terreno' }).screenshot({ path: informacion.outputPath('error-pdf.png'), animations: 'disabled' }); await page.unroute(`**/api/terrenos/${terreno.id}/reporte.pdf`);
    const registro = await page.request.post('http://localhost:3000/api/auth/registro', { data: { email: emailAjeno, password, nombre: 'Cuenta ajena temporal' } }); expect(registro.status()).toBe(201); const ajeno = sesion.parse(await registro.json()); expect((await page.request.get(`http://localhost:3000/api/terrenos/${terreno.id}/reporte.pdf`, { headers: { Authorization: `Bearer ${ajeno.token}` } })).status()).toBe(404);
    await crearTecnicoLocal({ email: emailTecnico, password, nombre: 'Técnico temporal PDF' }, () => prisma.usuario); const login = await page.request.post('http://localhost:3000/api/auth/login', { data: { email: emailTecnico, password } }); expect(login.status()).toBe(200); const tecnico = sesion.parse(await login.json());
    const lectura = await page.request.get(`http://localhost:3000/api/terrenos/${terreno.id}/reporte.pdf`, { headers: { Authorization: `Bearer ${tecnico.token}` } }); expect(lectura.status()).toBe(200); expect((await leerPdf(await lectura.body())).texto.includes('Viña Ñandú')).toBe(true);
    expect(await prisma.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await prisma.siembra.findMany({ where: { terrenoId: terreno.id }, orderBy: { id: 'asc' } })).toEqual(historial); expect(await prisma.climaCache.findMany({ orderBy: { clave: 'asc' } })).toEqual(cache); expect(errores).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-pdf.json'), JSON.stringify({ modo: 'PostgreSQL y motores reales aislados; cachés de prueba controlados; PDFKit real y parser PDF.js', paginas: pdf.paginas.length, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), autorizacion_bearer: true, propietario: 200, ajeno: 404, tecnico: 200, datos_agricolas_intactos: true, errores }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: emails } } }); for (const clave of claves) { const anterior = anteriores.find((f) => f.clave === clave); if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } }); }
    await prisma.plantillaRotacion.deleteMany({ where: { id: { in: plantillas } } }); await prisma.cultivo.deleteMany({ where: { id: { in: cultivos } } }); await prisma.$disconnect();
  }
});
