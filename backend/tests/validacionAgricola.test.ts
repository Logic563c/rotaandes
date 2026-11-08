import { describe, expect, it } from 'vitest';
import { esFechaReal, camposTerreno } from '../src/services/validacionAgricola.js';

describe('Fechas civiles y área declarada', () => {
  it.each(['2024-02-29', '2000-02-29', '2026-12-31', '0001-01-01', '9999-12-31'])('acepta fecha real %s', (fecha) => { expect(esFechaReal(fecha)).toBe(true); });
  it.each(['', '2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-1-01', '0000-01-01', '2026-01-01T00:00:00Z', '2026-01-01+05:00'])('rechaza fecha inválida %s', (fecha) => { expect(esFechaReal(fecha)).toBe(false); });
  it.each([0.01, 0.29, 1.1, 999999.99, null])('acepta área representable en NUMERIC(8,2): %s', (area_ha) => {
    expect(camposTerreno.safeParse({ nombre: 'Parcela', latitud: 0, longitud: 0, area_ha }).success).toBe(true);
  });
  it.each([0, -1, 0.001, 1000000, '1.25', false])('rechaza área inválida: %s', (area_ha) => {
    expect(camposTerreno.safeParse({ nombre: 'Parcela', latitud: 0, longitud: 0, area_ha }).success).toBe(false);
  });
});
