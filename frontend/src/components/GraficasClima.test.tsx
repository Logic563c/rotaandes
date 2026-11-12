import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GraficasClima } from './GraficasClima';
import { TooltipGrafica } from './AyudaGrafica';
import type { MesClima } from '../types/api';

// Valores sintéticos exclusivos de pruebas; no provienen de NASA.
const mensual: MesClima[] = Array.from({ length: 12 }, (_valor, indice) => ({ mes: indice + 1, t_min: indice === 6 ? 1.5 : 6, t_med: 11, t_max: 19,
  lluvia_mm: indice === 0 ? null : 30 + indice * 5, humedad_suelo: indice === 0 ? null : 0.5, riesgo_helada: indice === 6 ? 'alto' : 'bajo' }));

describe('Gráficas de climatología comprensibles', () => {
  it('muestra título, tipo de dato, fuente, ejes con unidades y leyenda en cada gráfica', () => {
    render(<GraficasClima mensual={mensual} fuente="Fuente: NASA POWER · promedio 2001–2020" />);
    const figuras = screen.getAllByRole('figure');
    expect(figuras).toHaveLength(3);
    const lluvia = screen.getByRole('figure', { name: 'Gráfica: Lluvia de cada mes' });
    expect(within(lluvia).getByText('Dato histórico')).toBeInTheDocument();
    expect(within(lluvia).getByText('Fuente: NASA POWER · promedio 2001–2020')).toBeInTheDocument();
    expect(within(lluvia).getByText('Lluvia en milímetros (mm) por mes')).toBeInTheDocument();
    expect(within(lluvia).getByText('Meses del año')).toBeInTheDocument();
    expect(within(within(lluvia).getByRole('list', { name: 'Leyenda de la gráfica' })).getByText('Lluvia promedio del mes (mm)')).toBeInTheDocument();
    const temperatura = screen.getByRole('figure', { name: 'Gráfica: Temperaturas de cada mes' });
    expect(within(temperatura).getByText('Temperatura en grados Celsius (°C)')).toBeInTheDocument();
    expect(within(within(temperatura).getByRole('list', { name: 'Leyenda de la gráfica' })).getByText('Límite de riesgo alto de helada: 2 °C')).toBeInTheDocument();
    const humedad = screen.getByRole('figure', { name: 'Gráfica: Humedad del suelo de cada mes' });
    expect(within(humedad).getByText(/de 0 \(seco\) a 1 \(saturado de agua\)/)).toBeInTheDocument();
  });
  it('resume los datos reales y declara los meses sin dato', () => {
    render(<GraficasClima mensual={mensual} fuente="Fuente" />);
    const lluvia = screen.getByRole('figure', { name: 'Gráfica: Lluvia de cada mes' });
    expect(within(lluvia).getByText(/el mes más lluvioso es diciembre \(85 mm\) y el más seco es febrero \(35 mm\)/)).toBeInTheDocument();
    expect(within(lluvia).getByText(/Sin dato en enero/)).toBeInTheDocument();
    expect(within(screen.getByRole('figure', { name: 'Gráfica: Temperaturas de cada mes' })).getByText(/La mínima más baja es 1,5 °C en julio/)).toBeInTheDocument();
  });
  it('ofrece «¿Cómo interpretar esta gráfica?» con ejes, colores, lectura, precauciones y ejemplo', async () => {
    render(<GraficasClima mensual={mensual} fuente="Fuente" />);
    const lluvia = screen.getByRole('figure', { name: 'Gráfica: Lluvia de cada mes' });
    await userEvent.click(within(lluvia).getByText('¿Cómo interpretar esta gráfica?'));
    for (const titulo of ['Qué muestra', 'Eje horizontal (de izquierda a derecha)', 'Eje vertical (de abajo hacia arriba)', 'Qué representa cada color', 'Valores altos y bajos', 'Precauciones', 'Ejemplo de lectura']) expect(within(lluvia).getByText(titulo)).toBeVisible();
    expect(within(lluvia).getByText(/no significa que no llueva/)).toBeVisible();
  });
  it('sin ningún dato muestra un mensaje en lugar de una gráfica vacía', () => {
    render(<GraficasClima mensual={mensual.map((mes) => ({ ...mes, lluvia_mm: null, humedad_suelo: null, t_min: null, t_med: null, t_max: null }))} fuente="Fuente" />);
    expect(screen.getByText('No hay datos válidos de lluvia para graficar.')).toBeInTheDocument();
    expect(screen.getByText('No hay temperaturas válidas para graficar.')).toBeInTheDocument();
    expect(screen.getByText('No hay datos válidos de humedad del suelo para graficar.')).toBeInTheDocument();
  });
});

describe('Cuadro emergente de las gráficas', () => {
  const filas = [{ nombre: 'Ene', nombreLargo: 'Enero', lluvia_mm: null, t_min: 3.25 }, { nombre: 'Feb', nombreLargo: 'Febrero', lluvia_mm: 41.26, t_min: 4 }];
  const series = [{ clave: 'lluvia_mm', nombre: 'Lluvia', unidad: 'mm', color: '#000', decimales: 1 }, { clave: 't_min', nombre: 'Mínima', unidad: '°C', color: '#000', decimales: 1 }];
  it('muestra el valor exacto con unidad del elemento señalado', () => {
    render(<TooltipGrafica activo etiqueta="Feb" filas={filas} claveEtiqueta="nombre" claveTitulo="nombreLargo" series={series} />);
    expect(screen.getByText('Febrero')).toBeInTheDocument(); expect(screen.getByText('41,3 mm')).toBeInTheDocument(); expect(screen.getByText('4 °C')).toBeInTheDocument();
  });
  it('indica «Sin dato» en lugar de cero y no se muestra si no está activo', () => {
    const { rerender } = render(<TooltipGrafica activo etiqueta="Ene" filas={filas} claveEtiqueta="nombre" claveTitulo="nombreLargo" series={series} />);
    expect(screen.getByText('Sin dato')).toBeInTheDocument(); expect(screen.queryByText('0 mm')).not.toBeInTheDocument();
    rerender(<TooltipGrafica activo={false} etiqueta="Ene" filas={filas} claveEtiqueta="nombre" series={series} />);
    expect(screen.queryByText('Enero')).not.toBeInTheDocument();
  });
});
