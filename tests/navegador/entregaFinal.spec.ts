import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
import { metadatosCapa, validarConsultaCapa } from '../../backend/src/data/catalogoCapas.js';
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
test('entrega final: agricultor completo, todos los módulos, persistencia y técnico de solo lectura', async ({ page }, informacion) => {
  test.setTimeout(240000); const reales = process.env.ROTAANDES_E2E_PROVEEDORES_REALES === '1';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const email = `entrega-final-${randomUUID()}@example.invalid`; const correoTecnico = `entrega-final-tecnico-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const claves = [claveClima(-0.93, -78.62), obtenerClavePronostico(-0.93, -78.62), claveTendencia('mensual', -0.93, -78.62), claveTendencia('diario', -0.93, -78.62)]; const anteriores = await prisma.climaCache.findMany({ where: { clave: { in: claves } } }); const cultivos: string[] = []; const plantillas: string[] = [];
  const errores: string[] = []; const fallosApi: number[] = [];
  page.on('pageerror', (error) => errores.push(error.message)); page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push(mensaje.text()); }); page.on('response', (respuesta) => { if (respuesta.url().startsWith('http://localhost:3000/api/') && respuesta.status() >= 400) fallosApi.push(respuesta.status()); });
  try {
    for (const cultivo of cultivosReferenciales) cultivos.push(...(await prisma.cultivo.createManyAndReturn({ data: [cultivo], skipDuplicates: true, select: { id: true } })).map((c) => c.id));
    for (const plantilla of plantillasReferenciales) plantillas.push(...(await prisma.plantillaRotacion.createManyAndReturn({ data: [plantilla], skipDuplicates: true, select: { id: true } })).map((p) => p.id));
    if (!reales) {
    const fecha = new Date().toISOString(); const bases = [crearBasePrueba(fecha), crearBasePronostico(fecha), crearMensualPrueba(fecha), crearDiarioPrueba(fecha)];
    for (const [indice, datos] of bases.entries()) { const clave = claves[indice]; if (!clave) throw new Error('Fixture incompleta'); await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos, actualizadoEn: new Date(fecha) }, update: { datos, actualizadoEn: new Date(fecha) } }); }
    await page.route('https://tile.openstreetmap.org/**', (ruta) => ruta.abort());
    // Solo transporte visual controlado: imágenes NASA archivadas, no una consulta nueva.
    await page.route('**/api/capas-visuales/**', async (ruta) => {
      const url = new URL(ruta.request().url()); const consulta = validarConsultaCapa(url.pathname.split('/')[3], Object.fromEntries(url.searchParams));
      const archivo = consulta.tipo === 'ndvi' ? 'ndvi-2023-01-01.png' : 'humedad_suelo-2023-01-17.png';
      const bytes = await readFile(new URL('../../backend/tests/fixtures/satelites/' + archivo, import.meta.url));
      await ruta.fulfill(url.pathname.endsWith('/imagen') ? { status: 200, contentType: 'image/png', body: bytes } : { status: 200, contentType: 'application/json', body: JSON.stringify({ ...metadatosCapa(consulta), estado_imagen: 'visible', origen: 'cache', consultado_en: new Date().toISOString(), sha256: createHash('sha256').update(bytes).digest('hex') }) });
    });
    }
    await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Conoce tu terreno, comprende el clima');
    for (const nombre of ['Registra tu terreno', 'Consulta el clima y tus cultivos', 'Compara opciones para tus próximas siembras']) await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
    await comprobarAncho(page); await comprobarEncabezados(page); const contrastes = await comprobarContraste(page); expect(contrastes.every((ratio) => ratio >= 4.5)).toBe(true); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused(); await page.keyboard.press('Enter'); expect(await page.evaluate(() => document.activeElement?.id)).toBe('contenido');
    await page.screenshot({ path: informacion.outputPath('landing.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('link', { name: 'Crear mi cuenta', exact: true }).click(); await comprobarCampos(page); await comprobarAncho(page);
    await page.getByLabel('Nombre completo *').fill('Agricultor temporal de experiencia'); await page.getByLabel('Parroquia', { exact: false }).fill('Latacunga'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Panel técnico', exact: true })).toHaveCount(0);
    async function ingresar(correo: string) { await page.getByLabel('Correo electrónico *').fill(correo); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible(); }
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click(); await ingresar(email);
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click(); await page.getByRole('slider', { name: /Cuidar el agua/ }).focus(); await page.keyboard.press('End'); await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click(); await expect(page.getByRole('status')).toContainText('se guardó');
    await page.getByRole('link', { name: 'Mi espacio', exact: true }).click();
    await page.getByRole('link', { name: 'Abrir mis terrenos', exact: true }).click(); await page.getByRole('link', { name: /Añadir terreno/ }).click(); await comprobarCampos(page);
    await expect(page.getByText(/Si el mapa no carga o prefieres usar el teclado/)).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible(); await page.locator('.leaflet-container').click({ position: { x: 120, y: 160 } }); await expect(page.getByLabel('Latitud *')).not.toHaveValue('');
    // Ajuste manual al punto de referencia verificado de Latacunga tras comprobar el mapa.
    await page.getByLabel('Nombre del terreno *').fill('Lote temporal de entrega final'); await page.getByLabel('Latitud *').fill('-0.93'); await page.getByLabel('Longitud *').fill('-78.62'); await page.getByLabel('Área declarada (hectáreas)').fill('1.2'); await comprobarAncho(page);
    await page.screenshot({ path: informacion.outputPath('formulario-terreno.png'), fullPage: true, animations: 'disabled' }); await page.getByRole('button', { name: 'Guardar terreno', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Lote temporal de entrega final', exact: true })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } }); const terreno = await prisma.terreno.findFirstOrThrow({ where: { usuarioId: usuario.id } });
    await page.getByLabel('Cultivo *').selectOption('papa'); await page.getByLabel('Fecha de siembra *').fill('2025-10-01'); await page.getByRole('button', { name: 'Guardar siembra', exact: true }).click(); await expect(page.getByText('La siembra se guardó correctamente.')).toBeVisible();
    await page.getByLabel('Cultivo *').selectOption('haba'); await page.getByLabel('Fecha de siembra *').fill('2026-10-01'); await page.getByRole('button', { name: 'Guardar siembra', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Haba', exact: true })).toBeVisible();
    expect(await prisma.siembra.count({ where: { terrenoId: terreno.id } })).toBe(2); expect((await prisma.usuario.findUniqueOrThrow({ where: { email } })).prioridadAgua).toBe(5);
    const siembras = await prisma.siembra.findMany({ where: { terrenoId: terreno.id } });
    const navegacion = page.getByRole('navigation', { name: 'Qué quieres consultar de tu terreno' }); const acceso = navegacion.getByRole('link', { name: '¿Qué puedo sembrar?', exact: true }); await acceso.focus(); await page.keyboard.press('Enter'); expect(await page.evaluate(() => document.activeElement?.id)).toBe('calendario');
    const respuestaCalendario = page.waitForResponse((respuesta) => respuesta.url().includes(`/api/terrenos/${terreno.id}/calendario?`)); await page.getByRole('button', { name: 'Ver calendario de siembra', exact: true }).click(); const respuesta = await respuestaCalendario; expect(respuesta.status()).toBe(200);
    // Oráculo HTTP real del motor: no se sustituyen los resultados de calendario en el navegador.
    const calculado: unknown = await respuesta.json(); if (typeof calculado !== 'object' || calculado === null || !('celdas' in calculado) || !Array.isArray(calculado.celdas)) throw new Error('Respuesta de calendario inválida');
    await page.getByLabel('Mes que quieres revisar').selectOption('1'); const resumen = page.getByRole('region', { name: 'Resumen del calendario' });
    for (const [estado, texto] of [['recomendado', 'Recomendado'], ['posible_con_cuidado', 'Posible con precaución'], ['no_recomendado', 'No recomendado'], ['no_determinado', 'No determinado: faltan datos o fuentes']]) { const cantidad = calculado.celdas.filter((celda: unknown) => typeof celda === 'object' && celda !== null && 'mes' in celda && celda.mes === 1 && 'estado' in celda && celda.estado === estado).length; await expect(resumen.getByText(`${texto} (${cantidad})`, { exact: true })).toBeVisible(); }
    await comprobarAncho(page); await resumen.screenshot({ path: informacion.outputPath('resumen-calendario.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Ver climatología histórica', exact: true }).click(); await expect(page.getByRole('table', { name: /Valores mensuales/ })).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Comparar rotaciones', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Actual: patrón del historial', exact: true })).toBeVisible(); await page.screenshot({ path: informacion.outputPath('detalle-terreno.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Ver pronóstico de siete días', exact: true }).click(); await expect(page.getByRole('region', { name: 'Pronóstico y posibles heladas', exact: true }).getByText('Open-Meteo', { exact: true }).first()).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Abrir simulador de escenarios', exact: true }).click(); const simulador = page.getByRole('region', { name: 'Simulador de escenarios climáticos', exact: true });
    const nuevaConsulta = page.waitForResponse((respuesta) => { const url = new URL(respuesta.url()); return url.pathname.endsWith('/rotaciones') && url.searchParams.get('lluvia_pct') === '-30' && url.searchParams.get('temp_delta') === '2'; });
    await simulador.getByRole('slider', { name: 'Variación de lluvia' }).focus(); await page.keyboard.press('Home'); await simulador.getByRole('slider', { name: 'Variación de temperatura' }).focus(); await page.keyboard.press('End');
    expect((await nuevaConsulta).status()).toBe(200); await simulador.getByRole('group', { name: 'Condiciones hipotéticas' }).screenshot({ path: informacion.outputPath('escenarios.png') });
    await page.getByRole('button', { name: 'Ver tendencias 2005–2024', exact: true }).click(); await expect(page.getByRole('region', { name: 'Tabla anual de tendencias', exact: true })).toBeVisible({ timeout: 60000 }); await page.getByRole('region', { name: 'Tabla anual de tendencias', exact: true }).screenshot({ path: informacion.outputPath('tendencias.png') });
    const visor = page.getByRole('region', { name: 'Mapa y capas satelitales', exact: true }); await visor.getByRole('button', { name: 'Explorar capas NASA' }).click();
    for (const [nombre, imagen] of [['Vegetación NDVI (MODIS)', 'Vegetación NDVI'], ['Humedad superficial (SMAP)', 'Humedad superficial SMAP']] as const) { await visor.getByRole('radio', { name: nombre, exact: true }).check(); await expect(visor.getByRole('img', { name: imagen, exact: true })).toBeVisible({ timeout: 30000 }); await expect(visor.getByRole('list', { name: 'Leyenda ' + imagen, exact: true })).toBeVisible(); await visor.screenshot({ path: informacion.outputPath(imagen === 'Vegetación NDVI' ? 'ndvi.png' : 'smap.png') }); }
    await comprobarAncho(page);
    await navegacion.screenshot({ path: informacion.outputPath('navegacion-terreno.png'), animations: 'disabled' });
    await page.getByRole('link', { name: 'Glosario', exact: true }).click(); await page.getByRole('searchbox', { name: 'Buscar una palabra' }).fill('helada'); await expect(page.getByRole('term').filter({ hasText: /^Helada$/ })).toBeVisible(); await comprobarAncho(page); await page.screenshot({ path: informacion.outputPath('glosario.png'), fullPage: true });
    await page.getByRole('link', { name: 'Fuentes', exact: true }).click(); await expect(page.getByText(/GeoJSON analítico/)).toBeVisible(); await expect(page.getByRole('main')).toBeFocused(); await comprobarAncho(page); await comprobarEncabezados(page); await page.screenshot({ path: informacion.outputPath('fuentes.png'), fullPage: true });
    await page.goto(`/terrenos/${terreno.id}`); const descarga = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar informe PDF', exact: true }).click(); const archivo = await descarga; const ruta = informacion.outputPath('informe-controlado.pdf'); await archivo.saveAs(ruta); expect((await leerPdf(await readFile(ruta))).texto.includes('Lote temporal de entrega final')).toBe(true);
    expect(await prisma.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await prisma.siembra.findMany({ where: { terrenoId: terreno.id } })).toEqual(siembras);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    await ingresar(email); await page.goto('/terrenos/' + terreno.id); await expect(page.getByRole('heading', { name: 'Lote temporal de entrega final', exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Haba', exact: true })).toBeVisible();
    await page.goto('/tecnico'); await expect(page.getByRole('alert')).toContainText('exclusivamente'); await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await crearTecnicoLocal({ email: correoTecnico, password, nombre: 'Técnico temporal de experiencia' }, () => prisma.usuario); await page.getByLabel('Correo electrónico *').fill(correoTecnico); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await page.getByRole('link', { name: 'Abrir panel técnico', exact: true }).click(); await expect(page.getByRole('heading', { name: /Lote temporal de entrega final/ })).toBeVisible(); await comprobarCampos(page); await comprobarAncho(page);
    await page.getByLabel('Parroquia del perfil').selectOption('Latacunga'); await page.getByLabel('Cultivo en el historial').selectOption('papa'); await expect(page.getByText(/Última siembra: Haba/)).toBeVisible();
    await prisma.climaCache.deleteMany({ where: { clave: obtenerClavePronostico(-0.93, -78.62) } }); await page.getByRole('button', { name: 'Revisar datos guardados', exact: true }).click(); await expect(page.getByText('? Estado desconocido', { exact: true })).toBeVisible();
    const token = await page.evaluate(() => sessionStorage.getItem('rotaandes.sesion')); if (!token) throw new Error('Falta sesión temporal');
    expect((await page.request.delete('http://localhost:3000/api/terrenos/' + terreno.id, { headers: { Authorization: 'Bearer ' + token } })).status()).toBe(403);
    const panel = await page.request.get('http://localhost:3000/api/tecnico/terrenos', { headers: { Authorization: 'Bearer ' + token } }); expect(panel.status()).toBe(200); const contenidoPanel = JSON.stringify(await panel.json()); for (const clavePrivada of ['password_hash', 'passwordHash', 'email', 'telefono']) expect(contenidoPanel.includes('"' + clavePrivada + '"')).toBe(false);
    await page.screenshot({ path: informacion.outputPath('panel-tecnico.png'), fullPage: true }); await page.getByRole('link', { name: /Consultar Lote temporal de entrega final/ }).click(); await expect(page.getByRole('link', { name: 'Editar terreno', exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Eliminar terreno', exact: true })).toHaveCount(0); await comprobarAncho(page);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click(); expect(errores).toEqual([]); expect(fallosApi).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-final.json'), JSON.stringify({ modo: reales ? 'SQL aislado y consultas reales de NASA POWER, Open-Meteo y GIBS; ausencia de caché técnica provocada después de las capturas para probar el estado desconocido' : 'SQL y motores reales aislados; cachés meteorológicas e imágenes NASA archivadas controladas', viewport: page.viewportSize(), recorrido_agricultor: true, lectura_tecnica: true, resumen_comparado_con_motor: true, pdf_parseado: true, datos_agricolas_intactos: true, contrastes, errores }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: [email, correoTecnico] } } });
    for (const clave of claves) { const anterior = anteriores.find((fila) => fila.clave === clave); if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } }); }
    await prisma.plantillaRotacion.deleteMany({ where: { id: { in: plantillas } } }); await prisma.cultivo.deleteMany({ where: { id: { in: cultivos } } }); await prisma.$disconnect();
  }
});
