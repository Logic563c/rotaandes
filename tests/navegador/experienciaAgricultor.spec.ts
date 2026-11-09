import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../backend/src/generated/prisma/client.js';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';
import { plantillasReferenciales } from '../../backend/src/data/catalogoPlantillas.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { obtenerClavePronostico } from '../../backend/src/services/pronostico.js';
import { claveTendencia } from '../../backend/src/services/tendencia.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';
import { crearBasePronostico } from '../../backend/tests/fixtures/pronosticoPruebas.js';
import { crearMensualPrueba, crearDiarioPrueba } from '../../backend/tests/fixtures/tendenciasPruebas.js';
import { crearTecnicoLocal } from '../../backend/src/services/aprovisionarTecnico.js';
import { leerPdf } from '../../backend/tests/fixtures/leerPdf.js';

async function comprobarAncho(pagina: Page) { expect(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }
async function comprobarEncabezados(pagina: Page) { const niveles = await pagina.locator('h1,h2,h3,h4,h5,h6').evaluateAll((encabezados) => encabezados.filter((encabezado) => encabezado.getClientRects().length).map((encabezado) => Number(encabezado.tagName.slice(1)))); expect(niveles.filter((nivel) => nivel === 1)).toHaveLength(1); expect(niveles.every((nivel, indice) => indice === 0 || nivel <= (niveles[indice - 1] ?? 0) + 1)).toBe(true); }
async function comprobarContraste(pagina: Page) {
  return pagina.evaluate(() => {
    const luminancia = (color: string) => { const canales = color.match(/[\d.]+/g)?.slice(0, 3).map((canal) => { const valor = Number(canal) / 255; return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4; }); return canales ? (canales[0] ?? 0) * 0.2126 + (canales[1] ?? 0) * 0.7152 + (canales[2] ?? 0) * 0.0722 : NaN; };
    const principal = document.querySelector('main'); const secundario = document.querySelector('main .text-oliva'); const boton = document.querySelector('main .boton-primario'); if (!principal || !secundario || !boton) throw new Error('Faltan muestras de contraste');
    const fondo = getComputedStyle(document.documentElement).getPropertyValue('--color-crema').trim(); const rgb = /^#([a-f0-9]{6})$/i.exec(fondo)?.[1]; if (!rgb) throw new Error('Paleta inesperada'); const crema = `rgb(${parseInt(rgb.slice(0, 2), 16)},${parseInt(rgb.slice(2, 4), 16)},${parseInt(rgb.slice(4, 6), 16)})`;
    return [[getComputedStyle(principal).color, crema], [getComputedStyle(secundario).color, crema], [getComputedStyle(boton).color, getComputedStyle(boton).backgroundColor]].map(([texto, base]) => { const a = luminancia(texto ?? ''); const b = luminancia(base ?? ''); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
  });
}
async function comprobarCampos(pagina: Page) {
  expect(await pagina.locator('input:not([type=hidden]),select,textarea').evaluateAll((campos) => campos.every((campo) => campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement || campo instanceof HTMLTextAreaElement ? Boolean(campo.labels?.length || campo.getAttribute('aria-label') || campo.getAttribute('aria-labelledby')) : false))).toBe(true);
}
test('recorrido comprensible: portada, registro, terreno, calendario calculado, glosario, PDF y lectura técnica', async ({ page }, informacion) => {
  test.setTimeout(120000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const email = `experiencia-${randomUUID()}@example.invalid`; const correoTecnico = `experiencia-tecnico-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const claves = [claveClima(-0.93, -78.62), obtenerClavePronostico(-0.93, -78.62), claveTendencia('mensual', -0.93, -78.62), claveTendencia('diario', -0.93, -78.62)]; const anteriores = await prisma.climaCache.findMany({ where: { clave: { in: claves } } }); const cultivos: string[] = []; const plantillas: string[] = [];
  const errores: string[] = []; const fallosApi: number[] = [];
  page.on('pageerror', (error) => errores.push(error.message)); page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push(mensaje.text()); }); page.on('response', (respuesta) => { if (respuesta.url().startsWith('http://localhost:3000/api/') && respuesta.status() >= 400) fallosApi.push(respuesta.status()); });
  try {
    for (const cultivo of cultivosReferenciales) cultivos.push(...(await prisma.cultivo.createManyAndReturn({ data: [cultivo], skipDuplicates: true, select: { id: true } })).map((c) => c.id));
    for (const plantilla of plantillasReferenciales) plantillas.push(...(await prisma.plantillaRotacion.createManyAndReturn({ data: [plantilla], skipDuplicates: true, select: { id: true } })).map((p) => p.id));
    const fecha = new Date().toISOString(); const bases = [crearBasePrueba(fecha), crearBasePronostico(fecha), crearMensualPrueba(fecha), crearDiarioPrueba(fecha)];
    for (const [indice, datos] of bases.entries()) { const clave = claves[indice]; if (!clave) throw new Error('Fixture incompleta'); await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos, actualizadoEn: new Date(fecha) }, update: { datos, actualizadoEn: new Date(fecha) } }); }
    await page.route('https://tile.openstreetmap.org/**', (ruta) => ruta.abort());
    await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Conoce tu terreno, comprende el clima');
    for (const nombre of ['Registra tu terreno', 'Consulta el clima y tus cultivos', 'Compara opciones para tus próximas siembras']) await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    await comprobarAncho(page); await comprobarEncabezados(page); const contrastes = await comprobarContraste(page); expect(contrastes.every((ratio) => ratio >= 4.5)).toBe(true); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused(); await page.keyboard.press('Enter'); expect(await page.evaluate(() => document.activeElement?.id)).toBe('contenido');
    await page.screenshot({ path: informacion.outputPath('landing.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: 'Crear mi cuenta', exact: true }).click(); await comprobarCampos(page); await comprobarAncho(page);
    await page.getByLabel('Nombre completo *').fill('Agricultor temporal de experiencia'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Panel técnico', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Abrir mis terrenos', exact: true }).click(); await page.getByRole('link', { name: /Añadir terreno/ }).click(); await comprobarCampos(page);
    await expect(page.getByText(/Si el mapa no carga o prefieres usar el teclado/)).toBeVisible(); await page.getByLabel('Nombre del terreno *').fill('Lote temporal de experiencia'); await page.getByLabel('Latitud *').fill('-0.93'); await page.getByLabel('Longitud *').fill('-78.62'); await page.getByLabel('Área declarada (hectáreas)').fill('1.2'); await comprobarAncho(page);
    await page.screenshot({ path: informacion.outputPath('formulario-terreno.png'), fullPage: true, animations: 'disabled' }); await page.getByRole('button', { name: 'Guardar terreno', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Lote temporal de experiencia', exact: true })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } }); const terreno = await prisma.terreno.findFirstOrThrow({ where: { usuarioId: usuario.id } });
    await page.getByLabel('Cultivo *').selectOption('papa'); await page.getByLabel('Fecha de siembra *').fill('2025-10-01'); await page.getByRole('button', { name: 'Guardar siembra', exact: true }).click(); await expect(page.getByText('La siembra se guardó correctamente.')).toBeVisible();
    const siembras = await prisma.siembra.findMany({ where: { terrenoId: terreno.id } });
    const navegacion = page.getByRole('navigation', { name: 'Qué quieres consultar de tu terreno' }); const acceso = navegacion.getByRole('link', { name: '¿Qué puedo sembrar?', exact: true }); await acceso.focus(); await page.keyboard.press('Enter'); expect(await page.evaluate(() => document.activeElement?.id)).toBe('calendario');
    const respuestaCalendario = page.waitForResponse((respuesta) => respuesta.url().includes(`/api/terrenos/${terreno.id}/calendario?`)); await page.getByRole('button', { name: 'Ver calendario de siembra', exact: true }).click(); const respuesta = await respuestaCalendario; expect(respuesta.status()).toBe(200);
    // Oráculo HTTP real del motor: no se sustituyen los resultados de calendario en el navegador.
    const calculado: unknown = await respuesta.json(); if (typeof calculado !== 'object' || calculado === null || !('celdas' in calculado) || !Array.isArray(calculado.celdas)) throw new Error('Respuesta de calendario inválida');
    await page.getByLabel('Mes que quieres revisar').selectOption('1'); const resumen = page.getByRole('region', { name: 'Resumen del calendario' });
    for (const [estado, texto] of [['recomendado', 'Recomendado según la regla referencial'], ['posible_con_cuidado', 'Posible con cuidado'], ['no_recomendado', 'No recomendado'], ['no_determinado', 'No determinado: falta información esencial']]) { const cantidad = calculado.celdas.filter((celda: unknown) => typeof celda === 'object' && celda !== null && 'mes' in celda && celda.mes === 1 && 'estado' in celda && celda.estado === estado).length; await expect(resumen.getByText(`${texto} (${cantidad})`, { exact: true })).toBeVisible(); }
    await comprobarAncho(page); await resumen.screenshot({ path: informacion.outputPath('resumen-calendario.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Ver climatología histórica', exact: true }).click(); await expect(page.getByRole('table', { name: /Valores mensuales/ })).toBeVisible();
    await page.getByRole('button', { name: 'Comparar rotaciones', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Actual: patrón del historial', exact: true })).toBeVisible(); await page.screenshot({ path: informacion.outputPath('detalle-terreno.png'), fullPage: true, animations: 'disabled' });
    await navegacion.screenshot({ path: informacion.outputPath('navegacion-terreno.png'), animations: 'disabled' });
    await page.getByRole('link', { name: 'Glosario', exact: true }).click(); await page.getByRole('searchbox', { name: 'Buscar una palabra' }).fill('helada'); await expect(page.getByRole('term').filter({ hasText: /^Helada$/ })).toBeVisible(); await comprobarAncho(page); await page.screenshot({ path: informacion.outputPath('glosario.png'), fullPage: true });
    await page.getByRole('link', { name: 'Fuentes', exact: true }).click(); await expect(page.getByText(/GeoJSON analítico/)).toBeVisible(); await expect(page.getByRole('main')).toBeFocused(); await comprobarAncho(page); await comprobarEncabezados(page); await page.screenshot({ path: informacion.outputPath('fuentes.png'), fullPage: true });
    await page.goto(`/terrenos/${terreno.id}`); const descarga = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar informe PDF', exact: true }).click(); const archivo = await descarga; const ruta = informacion.outputPath('informe-controlado.pdf'); await archivo.saveAs(ruta); expect((await leerPdf(await readFile(ruta))).texto.includes('Lote temporal de experiencia')).toBe(true);
    expect(await prisma.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await prisma.siembra.findMany({ where: { terrenoId: terreno.id } })).toEqual(siembras);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    await crearTecnicoLocal({ email: correoTecnico, password, nombre: 'Técnico temporal de experiencia' }, () => prisma.usuario); await page.getByLabel('Correo electrónico *').fill(correoTecnico); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await page.getByRole('link', { name: 'Abrir panel técnico', exact: true }).click(); await expect(page.getByRole('heading', { name: /Lote temporal de experiencia/ })).toBeVisible(); await comprobarCampos(page); await comprobarAncho(page);
    await page.screenshot({ path: informacion.outputPath('panel-tecnico.png'), fullPage: true }); await page.getByRole('link', { name: /Consultar Lote temporal de experiencia/ }).click(); await expect(page.getByRole('link', { name: 'Editar terreno', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Eliminar terreno', exact: true })).toHaveCount(0); await comprobarAncho(page);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click(); expect(errores).toEqual([]); expect(fallosApi).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-experiencia.json'), JSON.stringify({ modo: 'SQL y motores reales aislados; fuentes meteorológicas controladas, cartografía bloqueada y altitud con fallo permitido', viewport: page.viewportSize(), recorrido_agricultor: true, lectura_tecnica: true, resumen_comparado_con_motor: true, pdf_parseado: true, datos_agricolas_intactos: true, contrastes, errores }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: [email, correoTecnico] } } });
    for (const clave of claves) { const anterior = anteriores.find((fila) => fila.clave === clave); if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } }); }
    await prisma.plantillaRotacion.deleteMany({ where: { id: { in: plantillas } } }); await prisma.cultivo.deleteMany({ where: { id: { in: cultivos } } }); await prisma.$disconnect();
  }
});
test('información pública sin backend y rutas privadas protegidas', async ({ page }) => {
  await page.route('**/api/health', (ruta) => ruta.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Fallo controlado"}' }));
  await page.goto('/'); await expect(page.getByRole('button', { name: 'Reintentar conexión', exact: true })).toBeVisible(); await comprobarAncho(page); await page.getByRole('link', { name: 'Glosario', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Glosario agrícola y climático', exact: true })).toBeVisible();
  await page.goto('/acerca-de'); await expect(page.getByRole('heading', { name: 'Fuentes de información', exact: true })).toBeVisible(); await page.goto('/tecnico'); await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible(); await comprobarAncho(page);
});
