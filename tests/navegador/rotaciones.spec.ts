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

test('rotaciones integradas: tres estrategias calculadas, calendario, preferencias y sesión', async ({ page }, informacion) => {
  test.setTimeout(90000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true), options: '-c TimeZone=UTC' }) });
  const email = `rotaciones-e2e-${randomUUID()}@example.invalid`; const password = randomBytes(24).toString('base64url');
  const clave = claveClima(-0.93, -78.62); const errores: string[] = []; const erroresHttp: number[] = [];
  const cultivos: string[] = []; const plantillas: string[] = [];
  const anterior = await prisma.climaCache.findUnique({ where: { clave } });
  page.on('pageerror', (error) => errores.push(error.name));
  page.on('console', (mensaje) => { if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) errores.push('console.error'); });
  page.on('response', (respuesta) => { if (new URL(respuesta.url()).hostname === 'localhost' && respuesta.status() >= 400) erroresHttp.push(respuesta.status()); });
  try {
    for (const cultivo of cultivosReferenciales) { const filas = await prisma.cultivo.createManyAndReturn({ data: [cultivo], skipDuplicates: true, select: { id: true } }); cultivos.push(...filas.map((fila) => fila.id)); }
    for (const plantilla of plantillasReferenciales) { const filas = await prisma.plantillaRotacion.createManyAndReturn({ data: [plantilla], skipDuplicates: true, select: { id: true } }); plantillas.push(...filas.map((fila) => fila.id)); }
    await page.route('https://tile.openstreetmap.org/**', async (ruta) => { await ruta.abort(); });
    await page.goto('/registro'); await page.getByLabel('Nombre completo *').fill('Persona de prueba rotaciones'); await page.getByLabel('Correo electrónico *').fill(email); await page.getByLabel('Contraseña *').fill(password); await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    // Fixture explícita: altitud/área y clima controlados; no se presentan como una finca observada.
    const terreno = await prisma.terreno.create({ data: { usuarioId: usuario.id, nombre: 'Parcela controlada para rotaciones', latitud: -0.93, longitud: -78.62, altitudM: 3000, tieneRiego: false, areaHa: 1 } });
    const base = crearBasePrueba(new Date().toISOString()); base.advertencias.push('Prueba automatizada: climatología controlada, no una nueva consulta NASA.');
    await prisma.climaCache.upsert({ where: { clave }, create: { clave, datos: base, actualizadoEn: new Date(base.consultado_en) }, update: { datos: base, actualizadoEn: new Date(base.consultado_en) } });
    await page.goto(`/terrenos/${terreno.id}`);
    await page.getByLabel('Cultivo *').selectOption('papa'); await page.getByLabel('Fecha de siembra *').fill('2025-01-01'); await page.getByLabel('Fecha de cosecha (opcional)').fill('2025-07-01'); await page.getByRole('button', { name: 'Guardar siembra' }).click();
    await expect(page.getByRole('heading', { name: 'Papa', exact: true })).toBeVisible();
    const respuestaPendiente = page.waitForResponse((respuesta) => respuesta.url().includes(`/terrenos/${terreno.id}/rotaciones?`));
    await page.getByRole('button', { name: 'Comparar rotaciones' }).click(); const respuesta = await respuestaPendiente; expect(respuesta.status()).toBe(200);
    const esquema = z.object({ estrategias: z.array(z.object({ id: z.string().nullable(), es_actual: z.boolean(), nombre: z.string(), puntajes: z.object({ total: z.number().nullable() }), planificacion: z.array(z.object({ cultivo_id: z.string(), inicio_estimado: z.string().nullable(), motivo: z.string(), estado: z.string() })) })).length(3) });
    const calculadas = esquema.parse(await respuesta.json());
    expect(calculadas.estrategias.slice(1).every((estrategia) => estrategia.id !== null)).toBe(true);
    const region = page.getByRole('region', { name: 'Comparador de rotaciones', exact: true }); await expect(region.getByRole('article')).toHaveCount(3);
    for (const estrategia of calculadas.estrategias) await expect(region.getByRole('heading', { name: estrategia.nombre, exact: true })).toBeVisible();
    await expect(region.getByText(/climatología controlada/)).toBeVisible();
    await region.screenshot({ path: informacion.outputPath('comparador-resumen.png'), animations: 'disabled' });
    const consultaCalendario = page.waitForResponse((respuesta) => respuesta.url().includes(`/terrenos/${terreno.id}/calendario?`));
    await page.getByRole('button', { name: 'Ver calendario de siembra' }).click();
    const calendario = z.object({ celdas: z.array(z.object({ cultivo_id: z.string(), mes: z.number(), estado: z.string(), motivo: z.string() })) }).parse(await (await consultaCalendario).json());
    for (const estrategia of calculadas.estrategias) for (const paso of estrategia.planificacion) if (paso.inicio_estimado) {
      expect(calendario.celdas.find((celda) => celda.cultivo_id === paso.cultivo_id && celda.mes === Number(paso.inicio_estimado?.slice(5, 7))))
        .toMatchObject({ estado: paso.estado, motivo: paso.motivo });
    }
    await region.getByRole('article').first().getByText('Evidencia, ventajas y límites', { exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(region.getByRole('article').first().getByRole('heading', { name: 'Vacíos de información' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await region.screenshot({ path: informacion.outputPath('comparador-rotaciones.png'), animations: 'disabled' });
    const comprobacion = await page.request.get(`http://localhost:3000/api/terrenos/${terreno.id}/rotaciones`); expect(comprobacion.status()).toBe(401);
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click(); await page.getByRole('slider', { name: /Mejorar los ingresos/ }).press('End'); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.getByText('Tu perfil se guardó correctamente.')).toBeVisible();
    await page.goto(`/terrenos/${terreno.id}`); await page.getByRole('button', { name: 'Comparar rotaciones' }).click(); await expect(region.getByText(/ingresos 5/)).toBeVisible();
    const siembras = await prisma.siembra.findMany({ where: { terrenoId: terreno.id } }); expect(siembras).toHaveLength(1); expect(siembras[0]?.cultivoId).toBe('papa');
    await page.getByRole('button', { name: 'Editar siembra de Papa' }).click(); await page.getByLabel('Cultivo *').selectOption('haba'); await page.getByRole('button', { name: 'Guardar siembra' }).click();
    await expect(region.getByRole('article').first().getByRole('list', { name: /Secuencia/ }).getByText('1. Haba', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click(); await expect(page.getByRole('heading', { name: 'Comparador de rotaciones' })).toHaveCount(0);
    expect(errores).toEqual([]); expect(erroresHttp).toEqual([]);
    await writeFile(informacion.outputPath('evidencia-rotaciones.json'), JSON.stringify({ modo: 'PostgreSQL real aislado; altitud y climatología controladas', estrategias: calculadas.estrategias.map((valor) => ({ id: valor.id, total: valor.puntajes.total })), errores, erroresHttp }, null, 2));
  } finally {
    await prisma.usuario.deleteMany({ where: { email } });
    if (anterior) await prisma.climaCache.upsert({ where: { clave }, create: { ...anterior, datos: anterior.datos ?? Prisma.JsonNull }, update: { datos: anterior.datos ?? Prisma.JsonNull, actualizadoEn: anterior.actualizadoEn } }); else await prisma.climaCache.deleteMany({ where: { clave } });
    await prisma.plantillaRotacion.deleteMany({ where: { id: { in: plantillas } } }); await prisma.cultivo.deleteMany({ where: { id: { in: cultivos } } }); await prisma.$disconnect();
  }
});
