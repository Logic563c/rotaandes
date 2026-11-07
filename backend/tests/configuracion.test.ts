import { describe, expect, it } from 'vitest';
import { obtenerConfiguracion } from '../src/configuracion.js';

describe('Configuración del servidor', () => {
  it('usa el puerto 3000 y el origen local de Vite por defecto', () => {
    expect(obtenerConfiguracion({})).toEqual({ puerto: 3000, origenPermitido: 'http://localhost:5173' });
  });

  it.each(['', '0', '-1', '65536', '3000abc', '3.5', ' 3000 ', '1e3'])(
    'rechaza PORT=%s', (puerto) => {
      expect(() => obtenerConfiguracion({ PORT: puerto })).toThrow('PORT');
    },
  );

  it.each(['*', '', 'https://ejemplo.com', 'http://localhost:5173/'])(
    'rechaza CORS_ORIGIN=%s', (origen) => {
      expect(() => obtenerConfiguracion({ CORS_ORIGIN: origen })).toThrow('CORS_ORIGIN');
    },
  );
});
