import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { z } from 'zod';
import { test, expect } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { obtenerClavePronostico } from '../../backend/src/services/pronostico.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';
import { crearBasePronostico } from '../../backend/tests/fixtures/pronosticoPruebas.js';

test('primera entrega: recorrido integral persistente de un agricultor', async ({ page }, informacion) => {
  test.setTimeout(120000);
  const reales = process.env.ROTAANDES_E2E_PROVEEDORES_REALES === '1';
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  const email = `integral-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const creados: string[] = []; const respaldos: { clave: string; fila: { datos: unknown; actualizado_en: Date | null } | undefined }[] = [];
  const errores: string[] = []; const fallosHttp: { ruta: string; estado: number }[] = []; const fallosExternos = new Set<string>(); const jsonExternos: string[] = [];
  page.on('pageerror', (error) => errores.push(error.stack ?? error.name));
  page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push('console.error'); });
  page.on('response', (respuesta) => {
    const url = new URL(respuesta.url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && respuesta.status() >= 400) fallosHttp.push({ ruta: url.pathname, estado: respuesta.status() });
    if (url.hostname === 'tile.openstreetmap.org' && respuesta.status() >= 400) fallosExternos.add('Teselas OSM no disponibles');
  });
  page.on('requestfailed', (solicitud) => {
    const url = new URL(solicitud.url());
    if (url.hostname === 'tile.openstreetmap.org') fallosExternos.add('Fallo de red de teselas OSM');
    else if (solicitud.failure()?.errorText !== 'net::ERR_ABORTED') errores.push('Recurso local o JSON no cargado');
  });
  page.on('request', (solicitud) => { if (['api.open-meteo.com', 'power.larc.nasa.gov'].includes(new URL(solicitud.url()).hostname)) jsonExternos.push('JSON directo a proveedor'); });
  const capturar = async (nombre: string) => { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); await page.screenshot({ path: informacion.outputPath(`${nombre}.png`), fullPage: true, animations: 'disabled' }); };
  const ingresar = async () => {
    await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
  };
  try {
    for (const cultivo of cultivosReferenciales) {
      const resultado = await grupo.query<{ id: string }>(`INSERT INTO cultivos (id,nombre,familia,altitud_min,altitud_max,ciclo_meses,meses_siembra,lluvia_min_mensual_mm,demanda_agua,tolerancia_helada,tolerancia_sequia,fija_nitrogeno,aporte_materia_organica,proteccion_erosion,valor_forraje,valor_mercado,descripcion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NULL) ON CONFLICT (id) DO NOTHING RETURNING id`, [cultivo.id,cultivo.nombre,cultivo.familia,cultivo.altitudMin,cultivo.altitudMax,cultivo.cicloMeses,cultivo.mesesSiembra,cultivo.lluviaMinMensualMm,cultivo.demandaAgua,cultivo.toleranciaHelada,cultivo.toleranciaSequia,cultivo.fijaNitrogeno,cultivo.aporteMateriaOrganica,cultivo.proteccionErosion,cultivo.valorForraje,cultivo.valorMercado]);
      if (resultado.rows[0]) creados.push(resultado.rows[0].id);
    }
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Conexión disponible' })).toBeVisible(); await capturar('01-portada');
    await page.getByRole('link', { name: 'Crear mi cuenta', exact: true }).click(); await capturar('02-registro');
    await page.getByLabel('Nombre completo *').fill('Agricultor de auditoría'); await page.getByLabel('Parroquia', { exact: false }).fill('Latacunga'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible(); await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await capturar('03-acceso'); await ingresar(); await capturar('04-espacio-personal');
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click();
    await page.getByRole('slider', { name: /Cuidar el agua/ }).press('End'); await page.getByRole('slider', { name: /Cuidar el suelo/ }).press('Home'); await page.getByRole('slider', { name: /Cuidar el suelo/ }).press('ArrowRight'); await page.getByRole('slider', { name: /Mejorar los ingresos/ }).press('End'); await page.getByRole('slider', { name: /Mejorar los ingresos/ }).press('ArrowLeft');
    await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.getByText('Tu perfil se guardó correctamente.')).toBeVisible(); await capturar('05-perfil');
    await page.getByRole('link', { name: 'Mis terrenos', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Tu primera parcela empieza aquí' })).toBeVisible(); await capturar('06-terrenos-vacios');
    await page.getByRole('link', { name: /Añadir terreno/ }).click(); const mapa = page.locator('.leaflet-container'); await expect(mapa).toBeVisible(); await mapa.click();
    const latitud = Number(await page.getByLabel('Latitud *').inputValue()); const longitud = Number(await page.getByLabel('Longitud *').inputValue());
    expect(Math.abs(latitud + 0.93)).toBeLessThan(0.1); expect(Math.abs(longitud + 78.62)).toBeLessThan(0.1);
    await page.getByLabel('Nombre del terreno *').fill('Parcela integral de prueba'); await page.getByLabel('Área declarada (hectáreas)').fill('1.25'); await page.getByLabel('Tipo de suelo', { exact: true }).selectOption('franco'); await page.getByLabel('Mi terreno tiene riego').check();
    await expect(page.getByText('Cargando mapa base…', { exact: true })).toHaveCount(0); await capturar('07-crear-terreno');
    const guardado = page.waitForResponse((respuesta) => respuesta.request().method() === 'POST' && respuesta.url().endsWith('/api/terrenos')); await page.getByRole('button', { name: 'Guardar terreno' }).click(); expect((await guardado).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Parcela integral de prueba', exact: true })).toBeVisible();
    const filas = await grupo.query<{ id: string; latitud: number; longitud: number; altitud_m: number | null }>('SELECT t.id,t.latitud,t.longitud,t.altitud_m FROM terrenos t JOIN usuarios u ON u.id=t.usuario_id WHERE u.email=$1', [email]);
    expect(filas.rows).toHaveLength(1); const terreno = filas.rows[0]; if (!terreno) throw new Error('No se persistió el terreno temporal.'); expect(terreno.latitud).toBe(latitud); expect(terreno.longitud).toBe(longitud);
    if (reales) expect(typeof terreno.altitud_m).toBe('number');
    for (const clave of [claveClima(latitud, longitud), obtenerClavePronostico(latitud, longitud)]) { const anterior = await grupo.query<{ datos: unknown; actualizado_en: Date | null }>('SELECT datos,actualizado_en FROM clima_cache WHERE clave=$1', [clave]); respaldos.push({ clave, fila: anterior.rows[0] }); }
    if (!reales) {
      const clima = crearBasePrueba(new Date().toISOString()); clima.latitud = latitud; clima.longitud = longitud; clima.advertencias.push('Auditoría automatizada: clima controlado de prueba, no consulta NASA real para esta parcela.');
      const pronostico = crearBasePronostico(new Date().toISOString()); pronostico.coordenadas = { latitud, longitud };
      for (const [clave, datos] of [[claveClima(latitud, longitud), clima], [obtenerClavePronostico(latitud, longitud), pronostico]] as const) await grupo.query('INSERT INTO clima_cache (clave,datos,actualizado_en) VALUES ($1,$2,$3) ON CONFLICT (clave) DO UPDATE SET datos=EXCLUDED.datos,actualizado_en=EXCLUDED.actualizado_en', [clave, JSON.stringify(datos), new Date(datos.consultado_en)]);
    }
    for (const siembra of [{ id: 'papa', nombre: 'Papa', fecha: '2025-10-01', cosecha: '2026-04-01' }, { id: 'haba', nombre: 'Haba', fecha: '2026-10-01', cosecha: '' }]) {
      await page.getByLabel('Cultivo *').selectOption(siembra.id); await page.getByLabel('Fecha de siembra *').fill(siembra.fecha); await page.getByLabel('Fecha de cosecha (opcional)').fill(siembra.cosecha); await page.getByLabel('Notas (opcional)').fill(`Registro temporal de ${siembra.nombre}`);
      const respuesta = page.waitForResponse((valor) => valor.request().method() === 'POST' && valor.url().endsWith(`/terrenos/${terreno.id}/siembras`)); await page.getByRole('button', { name: 'Guardar siembra' }).click(); expect((await respuesta).status()).toBe(201); await expect(page.getByRole('heading', { name: siembra.nombre, exact: true })).toBeVisible();
    }
    await expect(page.locator('article')).toHaveCount(2); await capturar('08-detalle-e-historial');
    const consultaClima = page.waitForResponse((valor) => valor.url().endsWith(`/terrenos/${terreno.id}/clima`)); await page.getByRole('button', { name: 'Ver climatología histórica' }).click(); const respuestaClima = await consultaClima; expect(respuestaClima.status()).toBe(200);
    const clima = z.object({ mensual: z.array(z.object({ mes: z.number(), lluvia_mm: z.number().nullable() })).length(12), fuente: z.literal('NASA POWER'), periodo: z.object({ inicio: z.number(), fin: z.number() }), actualizado_en: z.string(), estado_datos: z.string(), parametros: z.record(z.string(), z.object({ unidad: z.string(), valores: z.array(z.number().nullable()) })) }).parse(await respuestaClima.json());
    expect(clima.parametros.PRECTOTCORR?.unidad).toBe('mm/day'); expect(clima.parametros.T2M?.unidad).toBe('C');
    const regionClima = page.getByRole('region', { name: 'Climatología histórica', exact: true }); await expect(regionClima.locator('.recharts-wrapper')).toHaveCount(2); await expect(regionClima.getByRole('row')).toHaveCount(13); await regionClima.screenshot({ path: informacion.outputPath('09-clima.png'), animations: 'disabled' });
    const consultaPronostico = page.waitForResponse((valor) => valor.url().endsWith(`/terrenos/${terreno.id}/pronostico`)); await page.getByRole('button', { name: 'Ver pronóstico de siete días' }).click(); const respuestaPronostico = await consultaPronostico; expect(respuestaPronostico.status()).toBe(200);
    const pronostico = z.object({ dias: z.array(z.object({ fecha: z.string(), t_min: z.number().nullable() })).length(7), alertas: z.array(z.object({ fecha: z.string() })), fuente: z.literal('Open-Meteo'), unidades: z.object({ temperatura: z.literal('°C'), precipitacion: z.literal('mm') }), zona_horaria: z.literal('America/Guayaquil'), actualizado_en: z.string(), umbral_helada_c: z.number() }).parse(await respuestaPronostico.json());
    expect(pronostico.alertas.map((alerta) => alerta.fecha)).toEqual(pronostico.dias.filter((dia) => dia.t_min !== null && dia.t_min <= pronostico.umbral_helada_c).map((dia) => dia.fecha));
    const regionPronostico = page.getByRole('region', { name: 'Pronóstico y posibles heladas', exact: true }); await expect(regionPronostico.getByRole('list', { name: 'Pronóstico diario' }).getByRole('listitem')).toHaveCount(7); await regionPronostico.screenshot({ path: informacion.outputPath('10-pronostico.png'), animations: 'disabled' });
    const consultaCalendario = page.waitForResponse((valor) => valor.url().includes(`/terrenos/${terreno.id}/calendario?`)); await page.getByRole('button', { name: 'Ver calendario de siembra' }).click(); const respuestaCalendario = await consultaCalendario; expect(respuestaCalendario.status()).toBe(200);
    const calendario = z.object({ celdas: z.array(z.object({ cultivo_id: z.string(), mes: z.number(), estado: z.string(), motivo: z.string() })).length(120) }).parse(await respuestaCalendario.json());
    const regionCalendario = page.getByRole('region', { name: 'Calendario de siembra', exact: true }); await expect(regionCalendario.getByRole('columnheader')).toHaveCount(13);
    for (const seleccion of [{ id: 'papa', nombre: 'Papa', mes: 1, etiqueta: 'Enero' }, { id: 'haba', nombre: 'Haba', mes: 10, etiqueta: 'Octubre' }]) {
      const celda = calendario.celdas.find((valor) => valor.cultivo_id === seleccion.id && valor.mes === seleccion.mes); if (!celda) throw new Error('Celda ausente.');
      await regionCalendario.getByRole('button', { name: new RegExp(`^${seleccion.nombre}, ${seleccion.etiqueta}:`) }).focus(); await page.keyboard.press('Enter'); const dialogo = page.getByRole('dialog'); await expect(dialogo.getByText(celda.motivo, { exact: true })).toBeVisible(); await dialogo.screenshot({ path: informacion.outputPath(`explicacion-${seleccion.id}.png`), animations: 'disabled' }); await page.keyboard.press('Escape');
    }
    await regionCalendario.getByRole('region', { name: 'Matriz mensual de siembra' }).evaluate((elemento) => { elemento.scrollTop = 0; elemento.scrollLeft = 0; }); await regionCalendario.screenshot({ path: informacion.outputPath('11-calendario.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Editar siembra de Papa' }).click(); await page.getByLabel('Fecha de cosecha (opcional)').fill('2026-04-15'); await page.getByLabel('Notas (opcional)').fill('Papa revisada en auditoría'); await page.getByRole('button', { name: 'Guardar siembra' }).click(); await expect(page.getByText('Papa revisada en auditoría', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Editar terreno', exact: true }).click(); await page.getByLabel('Nombre del terreno *').fill('Parcela integral revisada'); await page.getByLabel('Área declarada (hectáreas)').fill('2.50'); await page.getByRole('button', { name: 'Guardar terreno' }).click(); await expect(page.getByRole('heading', { name: 'Parcela integral revisada', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Mis terrenos', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Parcela integral revisada', exact: true })).toBeVisible(); await expect(page.getByText('Cargando mapa base…', { exact: true })).toHaveCount(0); await capturar('12-mis-terrenos');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click(); expect(await page.evaluate(() => sessionStorage.getItem('rotaandes.sesion'))).toBeNull(); await ingresar();
    await page.goto(`/terrenos/${terreno.id}`); await expect(page.getByRole('heading', { name: 'Parcela integral revisada', exact: true })).toBeVisible(); await expect(page.getByText('Papa revisada en auditoría', { exact: true })).toBeVisible(); await expect(page.getByText('15/04/2026', { exact: true })).toBeVisible(); await expect(page.locator('article')).toHaveCount(2); await capturar('13-persistencia-tras-login');
    const perfil = await grupo.query('SELECT prioridad_agua,prioridad_suelo,prioridad_ingresos FROM usuarios WHERE email=$1', [email]); expect(perfil.rows[0]).toEqual({ prioridad_agua: 5, prioridad_suelo: 2, prioridad_ingresos: 4 });
    const persistencia = await grupo.query<{ area_ha: string; cantidad: number }>('SELECT t.area_ha, (SELECT COUNT(*)::int FROM siembras s WHERE s.terreno_id=t.id) AS cantidad FROM terrenos t WHERE t.id=$1', [terreno.id]); expect(persistencia.rows[0]).toEqual({ area_ha: '2.50', cantidad: 2 });
    expect(errores).toEqual([]); expect(fallosHttp).toEqual([]); expect(jsonExternos).toEqual([]);
    await writeFile(informacion.outputPath('evidencia.json'), JSON.stringify({ modo: reales ? 'proveedores reales desde backend' : 'clima y pronóstico controlados en base aislada; elevación y mapa externos', coordenadas: { latitud, longitud }, altitud_m: terreno.altitud_m,
      perfil: perfil.rows[0], persistencia: persistencia.rows[0], clima: { fuente: clima.fuente, periodo: clima.periodo, actualizado_en: clima.actualizado_en, estado: clima.estado_datos }, pronostico: { fuente: pronostico.fuente, actualizado_en: pronostico.actualizado_en, dias: 7, alertas: pronostico.alertas.length, umbral_c: pronostico.umbral_helada_c },
      calendario: { celdas: calendario.celdas.length, estados: [...new Set(calendario.celdas.map((celda) => celda.estado))] }, erroresAplicacion: errores, erroresHttpLocales: fallosHttp, avisosExternos: [...fallosExternos], jsonDirectoProveedor: jsonExternos }, null, 2), 'utf8');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email=$1', [email]);
    for (const respaldo of respaldos) {
      if (respaldo.fila) await grupo.query('UPDATE clima_cache SET datos=$2,actualizado_en=$3 WHERE clave=$1', [respaldo.clave, JSON.stringify(respaldo.fila.datos), respaldo.fila.actualizado_en]);
      else await grupo.query('DELETE FROM clima_cache WHERE clave=$1', [respaldo.clave]);
    }
    if (creados.length) await grupo.query('DELETE FROM cultivos WHERE id=ANY($1::text[])', [creados]); await grupo.end();
  }
});
