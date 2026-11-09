import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ResumenCalendario } from './ResumenCalendario';
import type { RespuestaCalendario } from '../types/api';
function datosPrueba(): RespuestaCalendario {
  return { cultivos: [{ id: 'papa', nombre: 'Papa', altitud_min: 2700, altitud_max: 3800 }], celdas: Array.from({ length: 12 }, (_, indice) => ({ cultivo_id: 'papa', mes: indice + 1, estado: indice === 0 ? 'recomendado' : 'no_determinado', motivo: 'Fixture de presentación: no es un resultado agronómico.' })), terreno: { altitud_m: null, area_ha: 1, tiene_riego: false }, escenario: { lluvia_pct: 0, temp_delta: 0 }, clima: { fuente: 'NASA POWER', resolucion: 'Fixture regional', periodo: { inicio: 2001, fin: 2025 }, actualizado_en: '2026-11-09T00:00:00Z', estado_datos: 'cache', desactualizado: true, advertencias: [] }, aviso: 'Fixture de prueba' };
}
describe('Resumen fiel al calendario recibido, sin cálculos agronómicos nuevos', () => {
  it('cambia el mes y conserva resultados no determinados, sin transformar ausencias en verde', async () => {
    render(<ResumenCalendario datos={datosPrueba()} />); const mes = screen.getByRole('combobox'); await userEvent.selectOptions(mes, '1'); expect(screen.getByText('Recomendado según la regla referencial (1)')).toBeInTheDocument(); await userEvent.selectOptions(mes, '2'); expect(screen.getByText('Recomendado según la regla referencial (0)')).toBeInTheDocument(); expect(screen.getByText('No determinado: falta información esencial (1)')).toBeInTheDocument();
  });
  it('identifica antigüedad y no inventa un motivo ni datos del clima', () => {
    const datos = datosPrueba(); const original = structuredClone(datos); render(<ResumenCalendario datos={datos} />); expect(within(screen.getByRole('region', { name: 'Resumen del calendario' })).getByText(/información desactualizada/)).toBeInTheDocument(); expect(datos).toEqual(original);
  });
});
