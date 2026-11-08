import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { test, expect } from '@playwright/test';
import { PrismaClient, Prisma } from '../../backend/src/generated/prisma/client.js';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';
import { cultivosReferenciales } from '../../backend/src/data/catalogoCultivos.js';
import { plantillasReferenciales } from '../../backend/src/data/catalogoPlantillas.js';
import { claveClima } from '../../backend/src/services/clima.js';
import { crearBasePrueba } from '../../backend/tests/fixtures/nasaPruebas.js';

const esquemaCalendario = z.object({ celdas: z.array(z.object({ cultivo_id: z.string(), mes: z.number(), estado: z.string(), motivo: z.string() })).length(120) });
const esquemaRotaciones = z.object({ estrategias: z.array(z.object({ id: z.string().nullable(), nombre: z.string(), puntajes: z.object({ total: z.number().nullable() }) })).length(3) });

test('simulador: escenarios calculados, restauración, aislamiento y datos originales intactos', async ({ page }, informacion) => {
  test.setTimeout(120000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const email = `escenarios-e2e-${randomUUID()}@example.invalid`; const segunda = `escenarios-segunda-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const clave = claveClima(-0.93, -78.62); const anterior = await prisma.climaCache.findUnique({ where: { clave } });
  const cultivos: string[] = []; const plantillas: string[] = []; const errores: string[] = [];
  const mutaciones: string[] = []; let observarMutaciones = false;
  page.on('pageerror', (error) => errores.push(error.name));
  page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push('console.error'); });
  page.on('request', (peticion) => { if (observarMutaciones && new URL(peticion.url()).hostname === 'localhost' && !['GET', 'OPTIONS'].includes(peticion.method())) mutaciones.push(peticion.method()); });
  try {
    for (const cultivo of cultivosReferenciales) { const filas = await prisma.cultivo.createManyAndReturn({ data: [cultivo], skipDuplicates: true, select: { id: true } }); cultivos.push(...filas.map((fila) => fila.id)); }
    for (const plantilla of plantillasReferenciales) { const filas = await prisma.plantillaRotacion.createManyAndReturn({ data: [plantilla], skipDuplicates: true, select: { id: true } }); plantillas.push(...filas.map((fila) => fila.id)); }
    await page.route('https://tile.openstreetmap.org/**', (ruta) => ruta.abort());
    await page.goto('/registro'); await page.getByLabel('Nombre completo *').fill('Prueba de escenarios'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    const terreno = await prisma.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Parcela controlada de escenarios', latitud: -0.93, longitud: -78.62, altitudM: 3000, tieneRiego: false, areaHa: 1 } });
    await prisma.siembra.create({ data: { terrenoId: terreno.id, cultivoId: 'papa', fechaSiembra: new Date('2025-01-01'), fechaCosecha: new Date('2025-07-01') } });
    const base = crearBasePrueba(new Date().toISOString()); base.advertencias.push('Prueba controlada de escenarios: no es una nueva observación NASA.');
    await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(base.consultado_en) }, update: { datos: base, actualizadoEn: new Date(base.consultado_en) } });
    const siembrasAntes = await prisma.siembra.findMany({ where: { terrenoId: terreno.id } }); const cacheAntes = await prisma.climaCache.findUniqueOrThrow({ where: { clave } });
    await page.goto(`/terrenos/${terreno.id}`);
    const esperar = (ruta: string, lluvia: number, temperatura: number) => page.waitForResponse((respuesta) => {
      const url = new URL(respuesta.url()); return url.pathname.endsWith(`/${terreno.id}/${ruta}`) && url.searchParams.get('lluvia_pct') === String(lluvia) && url.searchParams.get('temp_delta') === String(temperatura);
    });
    const originalCalendario = esperar('calendario', 0, 0); const originalRotaciones = esperar('rotaciones', 0, 0);
    observarMutaciones = true;
    await page.getByRole('button', { name: 'Abrir simulador de escenarios' }).click();
    const calendarioBase = esquemaCalendario.parse(await (await originalCalendario).json()); const rotacionesBase = esquemaRotaciones.parse(await (await originalRotaciones).json());
    const region = page.getByRole('region', { name: 'Simulador de escenarios climáticos', exact: true });
    await expect(region.getByText('Escenario original seleccionado')).toBeVisible();
    const lluvia = region.getByRole('slider', { name: 'Variación de lluvia' }); const temperatura = region.getByRole('slider', { name: 'Variación de temperatura' });
    // Teclado nativo: límites reales del control en navegador, sin simular cambios React.
    const calendarioPendiente = esperar('calendario', -30, 2); const rotacionesPendientes = esperar('rotaciones', -30, 2);
    await lluvia.focus(); await page.keyboard.press('Home'); await temperatura.focus(); await page.keyboard.press('End');
    await expect(lluvia).toHaveValue('-30'); await expect(temperatura).toHaveValue('2');
    const calendarioNuevo = esquemaCalendario.parse(await (await calendarioPendiente).json()); const rotacionesNuevas = esquemaRotaciones.parse(await (await rotacionesPendientes).json());
    await expect(region.getByText('Simulación: lluvia -30 %, temperatura +2 °C')).toBeVisible();
    const cambios = calendarioNuevo.celdas.filter((celda) => calendarioBase.celdas.find((anterior) => anterior.cultivo_id === celda.cultivo_id && anterior.mes === celda.mes)?.estado !== celda.estado);
    await expect(region.getByText(`${cambios.length} de 120 celdas cambian de estado respecto al original.`)).toBeVisible();
    const tabla = region.getByRole('region', { name: 'Calendario comparado de escenarios' }); await expect(tabla.getByRole('columnheader')).toHaveCount(13); await expect(tabla.getByRole('rowheader')).toHaveCount(10);
    await expect(region.getByRole('article')).toHaveCount(3);
    for (const estrategia of rotacionesNuevas.estrategias) await expect(region.getByRole('heading', { name: estrategia.nombre, exact: true }).last()).toBeVisible();
    await region.getByRole('group', { name: 'Condiciones hipotéticas' }).screenshot({ path: informacion.outputPath('controles-escenarios.png'), animations: 'disabled' });
    await tabla.screenshot({ path: informacion.outputPath('calendario-comparado.png'), animations: 'disabled' });
    const seleccion = cambios.find((celda) => celda.cultivo_id === 'papa') ?? calendarioNuevo.celdas.find((celda) => celda.cultivo_id === 'papa'); if (!seleccion) throw new Error('No hay celda para comparar.');
    const indice = seleccion.mes - 1; const boton = tabla.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Papa', exact: true }) }).getByRole('button').nth(indice);
    await boton.focus(); await page.keyboard.press('Enter'); const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText(seleccion.motivo, { exact: true })).toBeVisible();
    const original = calendarioBase.celdas.find((celda) => celda.cultivo_id === 'papa' && celda.mes === seleccion.mes); if (!original) throw new Error('Original ausente.'); await expect(dialogo.getByText(original.motivo, { exact: true })).toBeVisible();
    await dialogo.screenshot({ path: informacion.outputPath('explicacion-escenarios.png'), animations: 'disabled' }); await page.keyboard.press('Escape'); await expect(dialogo).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await region.screenshot({ path: informacion.outputPath('simulador-escenarios.png'), animations: 'disabled' });
    await lluvia.focus(); await page.keyboard.press('End'); await temperatura.focus(); await page.keyboard.press('Home');
    await expect(region.getByText('Simulación: lluvia +30 %, temperatura -2 °C')).toBeVisible();
    await region.getByRole('button', { name: 'Restaurar escenario original' }).click(); await expect(region.getByText('Escenario original seleccionado')).toBeVisible(); await expect(lluvia).toHaveValue('0'); await expect(temperatura).toHaveValue('0');
    expect(await prisma.siembra.findMany({ where: { terrenoId: terreno.id } })).toEqual(siembrasAntes); expect(await prisma.terreno.findUniqueOrThrow({ where: { id: terreno.id } })).toEqual(terreno); expect(await prisma.climaCache.findUniqueOrThrow({ where: { clave } })).toEqual(cacheAntes); expect(mutaciones).toEqual([]);
    const sinSesion = await page.request.get(`http://localhost:3000/api/terrenos/${terreno.id}/calendario?lluvia_pct=-30&temp_delta=2`); expect(sinSesion.status()).toBe(401);
    // Fallo controlado exclusivamente de prueba; no se atribuye a una caída real de NASA.
    await page.route(`**/terrenos/${terreno.id}/calendario?**`, (ruta) => ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo controlado de prueba.' }) }));
    await region.getByRole('button', { name: 'Actualizar ambos escenarios' }).click(); await expect(region.getByRole('alert')).toBeVisible(); await expect(region.getByRole('table')).toHaveCount(0);
    await region.screenshot({ path: informacion.outputPath('escenario-no-disponible.png'), animations: 'disabled' });
    await page.unroute(`**/terrenos/${terreno.id}/calendario?**`); await region.getByRole('button', { name: 'Reintentar' }).click(); await expect(region.getByText('Escenario original seleccionado')).toBeVisible();
    observarMutaciones = false; await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await expect(page.getByRole('heading', { name: 'Simulador de escenarios climáticos' })).toHaveCount(0);
    // Nueva cuenta por API y luego interfaz: no recibe el contexto ni el escenario anterior.
    const registro = await page.request.post('http://localhost:3000/api/auth/registro', { data: { email: segunda, password, nombre: 'Segunda cuenta temporal' } }); expect(registro.status()).toBe(201);
    await page.goto('/login'); await page.getByLabel('Correo electrónico *').fill(segunda); await page.getByLabel('Contraseña *', { exact: true }).fill(password); await page.getByRole('button', { name: 'Ingresar a mi cuenta', exact: true }).click(); await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.goto(`/terrenos/${terreno.id}`); await expect(page.getByRole('alert')).toHaveText('Terreno no encontrado.'); await expect(page.getByRole('heading', { name: 'Simulador de escenarios climáticos' })).toHaveCount(0);
    expect(errores).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-escenarios.json'), JSON.stringify({ modo: 'PostgreSQL real aislado, clima/altitud controlados y etiquetados', escenario: { lluvia_pct: -30, temp_delta: 2 }, celdas: calendarioNuevo.celdas.length, cambios: cambios.length, rotaciones_originales: rotacionesBase.estrategias, rotaciones_simuladas: rotacionesNuevas.estrategias, datos_originales_intactos: true, mutaciones, errores }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: [email, segunda] } } });
    if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } });
    await prisma.plantillaRotacion.deleteMany({ where: { id: { in: plantillas } } }); await prisma.cultivo.deleteMany({ where: { id: { in: cultivos } } }); await prisma.$disconnect();
  }
});
