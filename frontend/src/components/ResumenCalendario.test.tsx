import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResumenCalendario } from './ResumenCalendario';
import type { RespuestaCalendario } from '../types/api';
import { completarCalendario } from '../tests/calendarioPruebas';
function datosPrueba(): RespuestaCalendario {
  return completarCalendario({ cultivos: [{ id: 'papa', nombre: 'Papa', altitud_min: 2700, altitud_max: 3800 }], celdas: Array.from({ length: 12 }, (_, indice) => ({ cultivo_id: 'papa', mes: indice + 1, estado: indice === 0 ? 'recomendado' : 'no_determinado', motivo: 'Fixture de presentación: no es un resultado agronómico.' })), terreno: { altitud_m: null, area_ha: 1, tiene_riego: false }, escenario: { lluvia_pct: 0, temp_delta: 0 }, clima: { fuente: 'NASA POWER', resolucion: 'Fixture regional', periodo: { inicio: 2001, fin: 2025 }, actualizado_en: '2026-11-09T00:00:00Z', estado_datos: 'cache', desactualizado: true, advertencias: [] }, aviso: 'Fixture de prueba' });
}
describe('Resumen fiel al calendario recibido, sin cálculos agronómicos nuevos', () => {
  it('cambia el mes y conserva resultados no determinados, sin transformar ausencias en verde', async () => {
    render(<ResumenCalendario datos={datosPrueba()} />); const mes = screen.getByRole('combobox'); await userEvent.selectOptions(mes, '1'); expect(screen.getByText('Recomendado (1)')).toBeInTheDocument(); await userEvent.selectOptions(mes, '2'); expect(screen.getByText('Recomendado (0)')).toBeInTheDocument(); expect(screen.getByText('No determinado: faltan datos o fuentes (1)')).toBeInTheDocument();
  });
  it('identifica antigüedad y no inventa un motivo ni datos del clima', () => {
    const datos = datosPrueba(); const original = structuredClone(datos); render(<ResumenCalendario datos={datos} />); expect(within(screen.getByRole('region', { name: 'Resumen del calendario' })).getByText(/información desactualizada/)).toBeInTheDocument(); expect(datos).toEqual(original);
  });
  it('cuenta y agrupa las 348 casillas de los 29 cultivos en los doce meses y permite leer su mismo detalle', async () => {
    const datos = datosPrueba();
    const estados = ['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado'] as const;
    const etiquetas = ['Recomendado', 'Posible con precaución', 'No recomendado', 'No determinado: faltan datos o fuentes'];
    const plantilla = datos.cultivos[0]; if (!plantilla) throw new Error('Fixture incompleta.');
    datos.cultivos = Array.from({ length: 29 }, (_, indice) => ({ ...plantilla, id: `cultivo-${indice}`, nombre: `Cultivo de prueba ${indice}` }));
    datos.celdas = datos.cultivos.flatMap((cultivo, indice) => Array.from({ length: 12 }, (_, mes) => ({ cultivo_id: cultivo.id, mes: mes + 1, estado: estados[(indice + mes) % 4] ?? 'no_determinado', resumen: `Resumen de ${cultivo.id} mes ${mes + 1}`, motivo: 'Fixture de presentación.' })));
    const alSeleccionar = vi.fn(); render(<ResumenCalendario datos={datos} alSeleccionar={alSeleccionar} />);
    const region = screen.getByRole('region', { name: 'Resumen del calendario' });
    for (let mes = 1; mes <= 12; mes++) {
      await userEvent.selectOptions(within(region).getByRole('combobox'), String(mes));
      let total = 0;
      for (const [indice, estado] of estados.entries()) {
        const celdas = datos.celdas.filter((celda) => celda.mes === mes && celda.estado === estado); total += celdas.length;
        const termino = within(region).getByText(`${etiquetas[indice]} (${celdas.length})`); const grupo = termino.closest('dt')?.parentElement;
        if (!grupo) throw new Error('Grupo ausente.');
        expect(within(grupo).getAllByRole('button')).toHaveLength(celdas.length);
        for (const celda of celdas) {
          const nombre = datos.cultivos.find((cultivo) => cultivo.id === celda.cultivo_id)?.nombre;
          const boton = within(grupo).getByRole('button', { name: new RegExp(`^Ver motivos de ${nombre} en `) });
          fireEvent.click(boton); expect(alSeleccionar).toHaveBeenLastCalledWith(celda);
        }
      }
      expect(total).toBe(29); expect(within(region).getByRole('status')).toHaveTextContent('29 cultivos evaluados');
    }
    expect(alSeleccionar).toHaveBeenCalledTimes(348);
  }, 20000);
  it('conserva un resultado uniforme justificado y lo actualiza al recibir nuevos resultados del servidor', async () => {
    const datos = datosPrueba(); datos.celdas = datos.celdas.map((celda) => ({ ...celda, estado: 'posible_con_cuidado' }));
    const vista = render(<ResumenCalendario datos={datos} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '10'); expect(screen.getByText('Posible con precaución (1)')).toBeInTheDocument();
    expect(screen.getByText(/Todos tienen el mismo estado este mes/)).toBeInTheDocument();
    vista.rerender(<ResumenCalendario datos={{ ...datos, celdas: datos.celdas.map((celda) => ({ ...celda, estado: 'no_determinado' })) }} />);
    expect(screen.getByText('Posible con precaución (0)')).toBeInTheDocument(); expect(screen.getByText('No determinado: faltan datos o fuentes (1)')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('10');
  });
});
