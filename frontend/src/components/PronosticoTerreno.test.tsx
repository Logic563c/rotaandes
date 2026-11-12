import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import type { RespuestaPronostico, UsuarioPublico } from '../types/api';
import { PronosticoTerreno } from './PronosticoTerreno';

vi.mock('./GraficasPronostico', () => ({ GraficasPronostico: () => <div aria-label="Gráficas de prueba">Gráficas comprobadas en E2E</div> }));

// Fixture meteorológica sintética, exclusiva de pruebas y nunca persistida en desarrollo.
function datosPrueba(instante = new Date().toISOString()): RespuestaPronostico {
  const hoy = new Date(Date.parse(instante) - 5 * 3600000).toISOString().slice(0, 10);
  const siguiente = new Date(Date.parse(`${hoy}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  const dias = Array.from({ length: 7 }, (_valor, indice) => ({ fecha: new Date(Date.parse(`${hoy}T00:00:00Z`) + indice * 86400000).toISOString().slice(0, 10), t_min: indice === 0 ? 1.5 : indice === 1 ? null : 8, t_max: 20, precipitacion_mm: indice === 1 ? null : 0 }));
  return { dias, alertas: [{ fecha: hoy, tipo: 'helada', mensaje: 'Posible helada: mínima prevista 1,5 °C. Fixture sintética.' }], fuente: 'Open-Meteo', actualizado_en: instante,
    vigente_hasta: new Date(Math.min(Date.parse(instante) + 1800000, Date.parse(`${siguiente}T00:00:00-05:00`))).toISOString(), estado_datos: 'cache', zona_horaria: 'America/Guayaquil',
    coordenadas: { latitud: -0.93, longitud: -78.62 }, cuadricula: { latitud: -0.949, longitud: -78.6 }, unidades: { temperatura: '°C', precipitacion: 'mm' }, umbral_helada_c: 2,
    advertencias: ['Fixture sintética con valores ausentes; sin mínima no se evalúa helada.'], aviso: 'Alerta preventiva, no confirma una helada. No es medición exacta.' };
}
const clientes: QueryClient[] = [];
function mostrar() {
  let tokenActivo = 'token-a';
  const usuario: UsuarioPublico = { id: 'usuario-a', nombre: 'Persona de prueba', email: 'prueba@example.invalid', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const contenido = (id = 'usuario-a', token = 'token-a') => <QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { ...usuario, id }, token, estaValidando: false, error: null, confirmarSesion: async () => {}, reintentar: () => {}, guardarPerfil: () => {}, cerrarSesion: () => { tokenActivo = ''; }, esSesionActual: (actual) => actual === tokenActivo }}><PronosticoTerreno terrenoId="terreno-prueba" latitud={-0.93} longitud={-78.62} /></ContextoSesion.Provider></QueryClientProvider>;
  const vista = render(contenido());
  return { cerrar: () => { tokenActivo = ''; }, cambiar: () => { tokenActivo = 'token-b'; vista.rerender(contenido('usuario-b', 'token-b')); } };
}
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Pronóstico de siete días accesible y sin respuestas falsas', () => {
  it('carga a petición, muestra siete tarjetas, alertas, unidades, nulos y atribución', async () => {
    const pendiente = Promise.withResolvers<Response>(); const solicitar = vi.fn().mockReturnValue(pendiente.promise); vi.stubGlobal('fetch', solicitar);
    mostrar(); expect(solicitar).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando'); pendiente.resolve(new Response(JSON.stringify(datosPrueba())));
    const lista = await screen.findByRole('list', { name: 'Pronóstico diario' }); expect(within(lista).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Posible helada: mínima prevista 1,5 °C. Fixture sintética.')).toBeInTheDocument(); expect(screen.getAllByText('Sin dato')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Open-Meteo' })).toHaveAttribute('href', 'https://open-meteo.com/'); expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument();
    expect(screen.getByText(/Sin mínima: riesgo no evaluable/)).toBeInTheDocument();
  });
  it('muestra indisponibilidad y permite reintentar sin inventar cero ni alertas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('red')).mockImplementation(async () => new Response(JSON.stringify(datosPrueba()))));
    mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar'); expect(screen.queryByRole('list', { name: 'Pronóstico diario' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByRole('list', { name: 'Pronóstico diario' })).toBeInTheDocument();
  });
  it.each(['vencido', 'vacio', 'unidad', 'alerta'])('rechaza dato %s y no presenta tarjetas', async (caso) => {
    const datos = datosPrueba(caso === 'vencido' ? new Date(Date.now() - 1800001).toISOString() : undefined);
    const entrada = caso === 'vacio' ? { ...datos, dias: [] } : caso === 'unidad' ? { ...datos, unidades: { temperatura: '°F', precipitacion: 'mm' } } : caso === 'alerta' ? { ...datos, alertas: [] } : datos;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(entrada)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.queryByRole('list', { name: 'Pronóstico diario' })).not.toBeInTheDocument();
  });
  it('retira el pronóstico cuando llega su vencimiento aunque siga abierto', async () => {
    const datos = datosPrueba(); datos.vigente_hasta = new Date(Date.now() + 1200).toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(datos)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' }));
    expect(await screen.findByRole('list', { name: 'Pronóstico diario' })).toBeInTheDocument();
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('ya no está vigente'); expect(screen.queryByRole('list', { name: 'Pronóstico diario' })).not.toBeInTheDocument();
  });
  it('evita afirmar ausencia de heladas cuando falta una mínima y no hay alertas calculables', async () => {
    const datos = datosPrueba(); datos.dias[0] = { fecha: datos.dias[0]?.fecha ?? '', t_min: 8, t_max: 20, precipitacion_mm: 0 }; datos.alertas = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(datos)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' }));
    expect(await screen.findByText(/no se puede descartar riesgo/)).toBeInTheDocument();
  });
  it('una respuesta tardía no se muestra al cerrar la sesión', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise));
    const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' })); sesion.cerrar();
    await act(async () => { pendiente.resolve(new Response(JSON.stringify(datosPrueba()))); }); expect(screen.queryByRole('list', { name: 'Pronóstico diario' })).not.toBeInTheDocument();
  });
  it('al cambiar de usuario conserva exclusivamente la respuesta de la nueva cuenta', async () => {
    const pendiente = Promise.withResolvers<Response>(); const segunda = datosPrueba(); segunda.dias = segunda.dias.map((dia) => ({ ...dia, t_min: 9 })); segunda.alertas = [];
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pendiente.promise).mockResolvedValueOnce(new Response(JSON.stringify(segunda))));
    const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver pronóstico de siete días' })); sesion.cambiar();
    const lista = await screen.findByRole('list', { name: 'Pronóstico diario' }); expect(within(lista).getAllByText('9 °C')).toHaveLength(7);
    await act(async () => { pendiente.resolve(new Response(JSON.stringify(datosPrueba()))); });
    expect(within(lista).getAllByText('9 °C')).toHaveLength(7); expect(screen.queryByText(/mínima prevista 1,5/)).not.toBeInTheDocument();
  });
});
