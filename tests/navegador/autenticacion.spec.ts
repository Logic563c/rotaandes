import { randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { test, expect } from '@playwright/test';
import { validarUrlBase } from '../../backend/src/lib/configuracionBase.js';

test('registro, perfil persistente, cierre y login reales', async ({ page }, informacion) => {
  const email = `navegador-${randomUUID()}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  const grupo = new Pool({ connectionString: validarUrlBase(process.env.TEST_DATABASE_URL, true) });
  try {
    await page.goto('/');
    await page.getByRole('link', { name: 'Registrarme' }).click();
    await page.getByLabel('Nombre completo *').fill('Persona de prueba');
    await page.getByLabel('Parroquia', { exact: false }).fill('Latacunga');
    await page.getByLabel('Correo electrónico *').fill(email);
    await page.getByLabel('Contraseña *').fill(password);
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(page.getByLabel('Contraseña *')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenido, Persona de prueba.' })).toBeVisible();
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click();
    await page.getByLabel('Teléfono', { exact: false }).fill('+593 99 123 4567');
    const agua = page.getByRole('slider', { name: /Cuidar el agua/ });
    await agua.focus(); await agua.press('End');
    await expect(agua).toHaveValue('5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toHaveText(/se guardó/);
    await page.reload();
    await expect(page.getByRole('slider', { name: /Cuidar el agua/ })).toHaveValue('5');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: informacion.outputPath('perfil.png'), fullPage: true });
    const filas = await grupo.query<{ prioridad_agua: number }>('SELECT prioridad_agua FROM usuarios WHERE email = $1', [email]);
    expect(filas.rows[0]?.prioridad_agua).toBe(5);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('rotaandes.sesion'))).toBeNull();
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await page.getByLabel('Correo electrónico *').fill(email);
    await page.getByLabel('Contraseña *').fill(password);
    await page.getByRole('button', { name: 'Ingresar a mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    // El cierre es local: no se afirma que revoque el JWT en el servidor.
  } finally {
    await grupo.query('DELETE FROM usuarios WHERE email = $1', [email]);
    await grupo.end();
  }
});

test('formularios accesibles y validación en pantalla', async ({ page }, informacion) => {
  await page.goto('/registro');
  await page.getByLabel('Nombre completo *').fill('Persona de prueba');
  await page.getByLabel('Correo electrónico *').fill('validacion@example.invalid');
  await page.getByLabel('Contraseña *').fill('corta');
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page.getByRole('alert')).toHaveText(/15 caracteres/);
  await page.getByLabel('Contraseña *').clear();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: informacion.outputPath('registro.png'), fullPage: true });
  await page.getByRole('link', { name: 'Inicia sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});
