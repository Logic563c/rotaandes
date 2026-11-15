import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DiaPronostico, MesClima } from '../types/api';
import { tendenciaPrueba } from '../tests/tendenciaPruebas';
import { GraficasClima } from './GraficasClima';
import { GraficasPronostico } from './GraficasPronostico';
import { GraficasTendencia } from './GraficasTendencia';

// Datos sintéticos de interfaz; no son observaciones ni una consulta al proveedor.
const mensual: MesClima[] = Array.from({ length: 12 }, (_, indice) => ({ mes: indice + 1, t_min: 4, t_med: 11, t_max: 19, lluvia_mm: 70, humedad_suelo: 0.5, riesgo_helada: 'medio' }));
const dias: DiaPronostico[] = Array.from({ length: 7 }, (_, indice) => ({ fecha: `2026-11-${13 + indice}`, t_min: 1.5, t_max: 18, precipitacion_mm: 3 }));

function comprobarLectura(titulo: string, orientacion: RegExp, limite: RegExp) {
  const figura = screen.getByRole('figure', { name: `Gráfica: ${titulo}` });
  const lectura = within(figura).getByText('Para leerla:').parentElement;
  expect(lectura).toBeVisible();
  expect(lectura).toHaveTextContent(orientacion);
  expect(lectura).toHaveTextContent(limite);
  expect(figura).toHaveAccessibleDescription(orientacion);
  // La orientación se puede leer sin desplegar ni sustituir la ayuda existente.
  expect(figura.querySelector('details')).not.toHaveAttribute('open');
  expect(within(figura).getByText('Qué muestra')).not.toBeVisible();
  expect(within(figura).getByText('¿Cómo interpretar esta gráfica?')).toBeVisible();
  expect(within(figura).getByRole('list', { name: 'Leyenda de la gráfica' })).toBeVisible();
}

describe('Lectura inmediata sin abrir la ayuda detallada', () => {
  it.each([
    ['Lluvia de cada mes', /más alta significa más lluvia y más baja, menos/, /no indica cuánto lloverá este año/],
    ['Temperaturas de cada mes', /Más arriba significa más calor; más abajo, más frío/, /sin confirmar heladas en tu terreno/],
    ['Humedad del suelo de cada mes', /cerca de 1.*más húmedo.*cerca de 0, más seco/, /no mide el agua de tu parcela/],
  ] as const)('orienta la climatología: %s', (titulo, orientacion, limite) => {
    render(<GraficasClima mensual={mensual} fuente="Fuente: NASA POWER · promedio 2001–2020" />);
    comprobarLectura(titulo, orientacion, limite);
  });

  it.each([
    ['Temperaturas previstas', /naranja muestra la máxima y la morada, la mínima.*Más arriba significa más calor; más abajo, más frío/, /alertas preventivas; no confirma una helada/],
    ['Lluvia prevista', /Cada barra es un día.*más alta significa más lluvia prevista y más baja, menos/, /puede cambiar y no es el promedio mensual de NASA/],
  ] as const)('distingue el pronóstico diario: %s', (titulo, orientacion, limite) => {
    render(<GraficasPronostico dias={dias} umbralC={2} />);
    comprobarLectura(titulo, orientacion, limite);
  });

  it.each([
    ['Lluvia total de cada año', /Cada barra es un año completo.*más alta significa más lluvia y más baja, menos/, /un solo año no demuestra una tendencia ni predice/],
    ['Mes más frío de cada año', /promedio de mínimas del mes más frío.*más abajo significa más frío y más arriba, más templado/, /no es la noche más fría ni un pronóstico/],
    ['Días de helada de cada año', /mínima modelada de 0 °C o menos.*más alta significa más días y más baja, menos/, /no heladas observadas.*Un hueco no significa cero/],
    ['Humedad del suelo superficial de cada año', /humedad superficial promedio.*cerca de 1, más húmedo; cerca de 0, más seco/, /no es un porcentaje ni una medición de tu parcela/],
  ] as const)('explica las series históricas: %s', (titulo, orientacion, limite) => {
    const datos = tendenciaPrueba();
    render(<GraficasTendencia anual={datos.anual} tendencias={datos.tendencias} fuente="NASA POWER · 2005–2024" />);
    comprobarLectura(titulo, orientacion, limite);
  });

  it('con lluvia ausente conserva la guía y la indisponibilidad, sin fabricar un resumen numérico', () => {
    render(<GraficasClima mensual={mensual.map((mes) => ({ ...mes, lluvia_mm: null }))} fuente="Fuente" />);
    const figura = screen.getByRole('figure', { name: 'Gráfica: Lluvia de cada mes' });
    expect(within(figura).getByText('Para leerla:')).toBeVisible();
    expect(within(figura).getByText('No hay datos válidos de lluvia para graficar.')).toBeVisible();
    expect(within(figura).queryByText(/0 mm/)).not.toBeInTheDocument();
  });

  it('sin serie diaria no interpreta los huecos como cero heladas', () => {
    const datos = tendenciaPrueba(true);
    render(<GraficasTendencia anual={datos.anual} tendencias={datos.tendencias} fuente="NASA POWER · 2005–2024" />);
    const figura = screen.getByRole('figure', { name: 'Gráfica: Días de helada de cada año' });
    expect(within(figura).getByText(/Un hueco no significa cero/)).toBeVisible();
    expect(within(figura).getByText('No hay años completos para representar esta variable.')).toBeVisible();
    expect(within(figura).queryByText(/0 días/)).not.toBeInTheDocument();
  });

  it('la orientación preventiva no sustituye el umbral recibido por un valor fijo', () => {
    render(<GraficasPronostico dias={dias} umbralC={4} />);
    const figura = screen.getByRole('figure', { name: 'Gráfica: Temperaturas previstas' });
    expect(within(within(figura).getByRole('list', { name: 'Leyenda de la gráfica' })).getByText('Umbral de alerta de helada: 4 °C')).toBeVisible();
    expect(within(figura).queryByText(/2 °C/)).not.toBeInTheDocument();
    expect(within(figura).getByText('Para leerla:').parentElement).toHaveTextContent(/Compara la mínima con la línea roja/);
  });
});
