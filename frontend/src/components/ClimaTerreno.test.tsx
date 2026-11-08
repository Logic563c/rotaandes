import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import { ClimaTerreno } from './ClimaTerreno';

vi.mock('./GraficasClima', () => ({ GraficasClima: () => <div aria-label="Gráficas de prueba">Gráficas comprobadas en E2E</div> }));
// Valores sintéticos exclusivos de tests; no son una descarga de NASA ni se guardan en desarrollo.
function datosPrueba() {
  return { mensual: Array.from({ length: 12 }, (_valor, indice) => ({ mes: indice + 1, t_min: indice === 0 ? null : 3, t_med: 10, t_max: 20, lluvia_mm: indice === 0 ? null : 40, humedad_suelo: 0.6, riesgo_helada: indice === 0 ? null : 'medio' })),
    fuente: 'NASA POWER', resolucion: 'Resolución regional: aprox. 50 km.', periodo: { inicio: 2001, fin: 2025 }, actualizado_en: '2026-11-07T10:00:00Z', estado_datos: 'cache', desactualizado: false,
    coordenadas: { latitud: -0.93, longitud: -78.62 }, advertencias: ['Fixture simulada solo para pruebas. Enero sin lluvia ni mínima válidas.'], metodologia: 'Riesgo heurístico. No es pronóstico.', parametros: {} };
}
const clientes: QueryClient[] = [];
function mostrar() {
  let activa = true;
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  render(<QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { id: 'usuario-prueba', email: 'fixture@example.invalid', nombre: 'Prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null }, token: 'token-solo-prueba', estaValidando: false, error: null, confirmarSesion: async () => {}, cerrarSesion: () => { activa = false; }, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: () => activa }}><ClimaTerreno terrenoId="terreno-prueba" latitud={-0.93} longitud={-78.62} altitudM={3000} /></ContextoSesion.Provider></QueryClientProvider>);
  return { cerrar: () => { activa = false; } };
}
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; });
describe('Climatología histórica: estados honestos y accesibilidad', () => {
  it('no solicita datos hasta abrir y muestra carga, fuente, periodo y nulos reales', async () => {
    const pendiente = Promise.withResolvers<Response>(); const solicitar = vi.fn().mockReturnValue(pendiente.promise); vi.stubGlobal('fetch', solicitar);
    mostrar(); expect(solicitar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Ver climatología histórica' }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando información');
    pendiente.resolve(new Response(JSON.stringify(datosPrueba())));
    const tabla = await screen.findByRole('table');
    expect(screen.getByText(/Periodo 2001–2025/)).toBeInTheDocument();
    expect(screen.getByText(/Caché verificada/)).toBeInTheDocument();
    expect(within(tabla).getAllByRole('row')).toHaveLength(13);
    expect(within(tabla).getByRole('row', { name: /Enero/ })).toHaveTextContent('Sin dato');
    expect(screen.getByText(/Fixture simulada/)).toBeInTheDocument();
  });
  it('ante error no dibuja lluvia cero ni presenta valores ficticios y permite reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('red')).mockResolvedValueOnce(new Response(JSON.stringify(datosPrueba()))));
    mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver climatología histórica' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar'); expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByRole('table')).toBeInTheDocument();
  });
  it.each(['respaldo', 'desactualizado'])('identifica explícitamente datos de %s', async (estado) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...datosPrueba(), estado_datos: estado, desactualizado: true }))));
    mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver climatología histórica' }));
    await screen.findByRole('table'); expect(screen.getByText(/Desactualizado: más de 30 días/)).toBeInTheDocument();
    expect(screen.getByText(estado === 'respaldo' ? /Respaldo verificado/ : /NASA no disponible/)).toBeInTheDocument();
  });
  it('rechaza respuesta fuera del contrato y no muestra tabla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"mensual":[]}')));
    mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver climatología histórica' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('formato esperado'); expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('una respuesta tardía de una sesión cerrada no presenta datos', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise));
    const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver climatología histórica' }));
    sesion.cerrar(); await act(async () => { pendiente.resolve(new Response(JSON.stringify(datosPrueba()))); });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
