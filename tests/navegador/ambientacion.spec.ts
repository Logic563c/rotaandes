import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test('mantiene fondos estáticos, formularios opacos, teclado y tamaños móviles sin duplicar la fotografía de portada', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (error) => errores.push(error.message));
  for (const ancho of [320, 375, 390, 768, 1366]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/login');
    const fondo = page.locator('.marco__ambiente');
    await expect(fondo).toHaveAttribute('aria-hidden', 'true');
    expect(await fondo.evaluate((nodo) => getComputedStyle(nodo).pointerEvents)).toBe('none');
    await fondo.locator('img').evaluate((imagen: HTMLImageElement) => imagen.decode());
    expect(await fondo.locator('img').evaluate((imagen: HTMLImageElement) => imagen.naturalWidth)).toBeGreaterThan(0);
    expect(await page.locator('section[aria-label="Acceso a tu cuenta"]').evaluate((nodo) => getComputedStyle(nodo).backgroundColor)).toBe('rgb(255, 255, 255)');
    await page.getByLabel('Correo electrónico *').fill('solo-visual@example.invalid');
    await expect(page.getByLabel('Correo electrónico *')).toHaveValue('solo-visual@example.invalid');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('Conexión disponible');
    await expect(page.locator('.marco__ambiente')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /movimiento del fondo/ })).toHaveCount(0);
    expect(await page.locator('.portada-foto img,.tarjeta-flotante').evaluateAll((nodos) => nodos.every((nodo) => getComputedStyle(nodo).animationName === 'none'))).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('contenido');
  }
  expect(errores).toEqual([]);
});

test('mantiene contraste fotográfico en una cabecera larga de tableta', async ({ page }) => {
  // Respuesta controlada solo para probar el diseño; no crea usuarios ni consulta datos privados.
  await page.addInitScript((token) => sessionStorage.setItem('rotaandes.sesion', token),
    `prueba.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.visual`);
  await page.route('**/api/auth/yo', (ruta) => ruta.fulfill({ contentType: 'application/json', body: JSON.stringify({
    id: '10000000-0000-4000-8000-000000000002', email: 'visual@example.invalid', nombre: 'Agricultor de demostración',
    rol: 'agricultor', parroquia: 'Pujilí', telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null,
  }) }));
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/inicio');
  const titulo = page.getByRole('heading', { level: 1, name: 'Bienvenido, Agricultor de demostración.' });
  await expect(titulo).toBeVisible();
  await page.locator('.banner-foto__imagen').evaluate((imagen: HTMLImageElement) => imagen.decode());
  const color = await titulo.evaluate((nodo) => {
    const lienzo = document.createElement('canvas'); lienzo.width = 1; lienzo.height = 1;
    const contexto = lienzo.getContext('2d'); if (!contexto) throw new Error('No se pudo medir el color');
    contexto.fillStyle = getComputedStyle(nodo).color; contexto.fillRect(0, 0, 1, 1);
    const pixeles = contexto.getImageData(0, 0, 1, 1).data;
    return [pixeles[0] ?? 0, pixeles[1] ?? 0, pixeles[2] ?? 0];
  });
  await titulo.evaluate((nodo) => { nodo.style.color = 'transparent'; });
  const fondo = PNG.sync.read(await titulo.screenshot());
  await titulo.evaluate((nodo) => { nodo.style.removeProperty('color'); });
  const luminancia = (rojo: number, verde: number, azul: number) => {
    const canales = [rojo, verde, azul].map((canal) => { const valor = canal / 255; return valor <= 0.04045 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * (canales[0] ?? 0) + 0.7152 * (canales[1] ?? 0) + 0.0722 * (canales[2] ?? 0);
  };
  const texto = luminancia(color[0] ?? 0, color[1] ?? 0, color[2] ?? 0);
  let minimo = Infinity;
  for (let posicion = 0; posicion < fondo.data.length; posicion += 4) {
    const fondoPixel = luminancia(fondo.data[posicion] ?? 0, fondo.data[posicion + 1] ?? 0, fondo.data[posicion + 2] ?? 0);
    minimo = Math.min(minimo, (Math.max(texto, fondoPixel) + 0.05) / (Math.min(texto, fondoPixel) + 0.05));
  }
  expect(minimo).toBeGreaterThanOrEqual(4.5);
});
