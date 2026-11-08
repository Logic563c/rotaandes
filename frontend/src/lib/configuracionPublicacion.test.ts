import { describe, expect, it } from 'vitest';
import { validarUrlPublicacion } from './configuracionPublicacion';

describe('URL pública: sin fallback local ni secretos', () => {
  it('admite un origen Railway HTTPS, sin afirmar que exista el dominio de prueba', () => {
    expect(validarUrlPublicacion('https://fixture.up.railway.app').origin).toBe('https://fixture.up.railway.app');
  });
  it.each([undefined, '', 'http://localhost:3000', 'https://localhost', 'https://*.up.railway.app', 'http://fixture.up.railway.app', 'https://fixture.up.railway.app.ejemplo.com',
    'https://fixture.up.railway.app/api', 'https://usuario:clave@fixture.up.railway.app', 'https://fixture.up.railway.app?token=fixture', 'https://fixture.up.railway.app#fragmento', 'https://fixture.up.railway.app:8443'])('rechaza destino inválido (%#)', (valor) => {
    expect(() => validarUrlPublicacion(valor)).toThrow();
  });
});
