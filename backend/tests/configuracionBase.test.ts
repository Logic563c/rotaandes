import { describe, expect, it } from 'vitest';
import { validarUrlBase } from '../src/lib/configuracionBase.js';

const URL_FICTICIA = 'postgresql://rotaandes_app:solo_prueba@127.0.0.1:5432/rotaandes_dev?schema=public';

describe('Límites de conexión a PostgreSQL', () => {
  it('admite el destino local de desarrollo', () => {
    expect(validarUrlBase(URL_FICTICIA)).toBe(URL_FICTICIA);
  });

  it('admite el esquema público predeterminado sin parámetros', () => {
    const url = URL_FICTICIA.replace('?schema=public', '');
    expect(validarUrlBase(url)).toBe(url);
  });

  it.each([
    'host=servidor-ajeno.invalid', 'port=5433', 'user=postgres', 'password=fixture',
    'options=-csearch_path%3Dotro', 'sslkey=fixture.key', 'schema=otro', 'schema=public',
  ])('rechaza parámetros que sobrescriben la conexión o duplican el esquema (caso %#)', (consulta) => {
    expect(() => validarUrlBase(`${URL_FICTICIA}&${consulta}`)).toThrow();
    expect(() => validarUrlBase(`${URL_FICTICIA.replace('rotaandes_dev', 'rotaandes_pruebas_a1b2c3d4')}&${consulta}`, true)).toThrow();
  });

  it('rechaza fragmentos ajenos a la configuración de conexión', () => {
    expect(() => validarUrlBase(`${URL_FICTICIA}#fragmento`)).toThrow();
  });

  it.each([undefined, '', 'sin-formato', URL_FICTICIA.replace('127.0.0.1', 'ejemplo.com'),
    URL_FICTICIA.replace('rotaandes_app:', 'postgres:'), URL_FICTICIA.replace('rotaandes_dev', 'otra_base'),
    URL_FICTICIA.replace('5432', '5433'), URL_FICTICIA.replace('schema=public', 'schema=privado')])(
    'rechaza configuraciones fuera del destino autorizado (caso %#)', (url) => {
      expect(() => validarUrlBase(url)).toThrow();
    },
  );

  it('impide ejecutar pruebas de escritura sobre desarrollo', () => {
    expect(() => validarUrlBase(URL_FICTICIA, true)).toThrow();
    const urlPruebas = URL_FICTICIA.replace('rotaandes_dev', 'rotaandes_pruebas_a1b2c3d4');
    expect(validarUrlBase(urlPruebas, true)).toBe(urlPruebas);
    expect(() => validarUrlBase(urlPruebas)).toThrow();
  });

  it('no conserva el error de URL que podría contener credenciales', () => {
    let fallo: unknown;
    try { validarUrlBase('fixture sin formato de URL'); }
    catch (error: unknown) { fallo = error; }
    expect(fallo).toBeInstanceOf(Error);
    expect(fallo).not.toHaveProperty('cause');
    expect(fallo).not.toHaveProperty('input');
  });
});
