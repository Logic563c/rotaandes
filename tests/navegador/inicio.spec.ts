import { expect, test } from '@playwright/test';

test('la página se conecta al backend real y permite volver a comprobar', async ({ page }, informacionPrueba) => {
  const erroresPagina: string[] = [];
  page.on('pageerror', (error) => erroresPagina.push(error.message));
  const primeraRespuesta = page.waitForResponse('http://localhost:3000/api/health');
  await page.goto('/');
  const respuesta = await primeraRespuesta;
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toEqual({ ok: true });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Conoce tu terreno, comprende el clima');
  await expect(page.getByRole('status')).toContainText('Conexión disponible');

  await Promise.all([
    page.waitForResponse('http://localhost:3000/api/health'),
    page.getByRole('button', { name: 'Volver a comprobar' }).click(),
  ]);
  await expect(page.getByRole('status')).toContainText('Conexión disponible');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(erroresPagina).toEqual([]);
  await page.screenshot({ path: informacionPrueba.outputPath('inicio.png'), fullPage: true });
});
