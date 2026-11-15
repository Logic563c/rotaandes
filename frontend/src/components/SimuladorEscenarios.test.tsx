import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import type { UsuarioPublico } from '../types/api';
import { crearEscenariosPrueba } from '../tests/escenariosPruebas';
import { SimuladorEscenarios } from './SimuladorEscenarios';

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
const clientes: QueryClient[] = [];
function mostrar() {
  let tokenActivo = 'token-a';
  const usuario: UsuarioPublico = { id: 'usuario-a', email: 'fixture@example.invalid', nombre: 'Prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const contenido = (id = 'usuario-a', token = 'token-a') => <QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { ...usuario, id }, token, estaValidando: false, error: null, confirmarSesion: async () => {}, reintentar: () => {}, guardarPerfil: () => {}, cerrarSesion: () => { tokenActivo = ''; }, esSesionActual: (actual) => actual === tokenActivo }}><SimuladorEscenarios key={id} terrenoId="terreno-prueba" contexto={[3000, false]} /></ContextoSesion.Provider></QueryClientProvider>;
  const vista = render(contenido()); return { cerrar: () => { tokenActivo = ''; }, cambiar: () => { tokenActivo = 'token-b'; vista.rerender(contenido('usuario-b', 'token-b')); } };
}
function respuesta(entrada: URL | RequestInfo) {
  const url = new URL(String(entrada)); const escenario = { lluvia_pct: Number(url.searchParams.get('lluvia_pct')), temp_delta: Number(url.searchParams.get('temp_delta')) };
  const datos = crearEscenariosPrueba(escenario);
  return new Response(JSON.stringify(url.pathname.endsWith('/calendario') ? datos.calendario : datos.rotaciones));
}
async function abrir() { await userEvent.click(screen.getByRole('button', { name: 'Abrir simulador de escenarios' })); await screen.findByText('Escenario original seleccionado'); }
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; vi.unstubAllGlobals(); });
describe('Simulador visual, controles, peticiones y sesiones', () => {
  it('explica las barras original y simulada sin presentarlas como un pronóstico', async () => {
    vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => respuesta(entrada))); mostrar(); await abrir();
    const lectura = screen.getByText(/En cada fila, la barra gris es el original/);
    expect(lectura).toBeVisible();
    expect(lectura).toHaveTextContent(/amarilla rayada.*más larga.*mejora.*más corta, empeora/);
    expect(lectura).toHaveTextContent(/misma rotación: no es un pronóstico ni una cosecha garantizada/);
    expect(screen.getAllByText('¿Cómo interpretar esta gráfica?').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: /Indicadores comparados de Patrón actual/ })).toBeVisible();
  });
  it('abre a petición, compara límites de ambos controles, explica por teclado y restaura sin otra consulta', async () => {
    const solicitar = vi.fn(async (entrada: URL | RequestInfo) => respuesta(entrada)); vi.stubGlobal('fetch', solicitar); mostrar(); expect(solicitar).not.toHaveBeenCalled(); await abrir();
    expect(solicitar).toHaveBeenCalledTimes(2); const lluvia = screen.getByRole('slider', { name: 'Variación de lluvia' }); const temperatura = screen.getByRole('slider', { name: 'Variación de temperatura' });
    expect(lluvia).toHaveAttribute('min', '-30'); expect(lluvia).toHaveAttribute('max', '30'); expect(temperatura).toHaveAttribute('min', '-2'); expect(temperatura).toHaveAttribute('max', '2');
    fireEvent.change(lluvia, { target: { value: '-30' } }); fireEvent.change(temperatura, { target: { value: '-2' } });
    expect(screen.queryByText('Escenario original seleccionado')).not.toBeInTheDocument();
    await screen.findByText('Simulación: lluvia -30 %, temperatura -2 °C'); expect(screen.getByText('1 de 12 celdas cambian de estado respecto al original.')).toBeVisible();
    expect(solicitar).toHaveBeenCalledTimes(4); expect(String(solicitar.mock.calls.at(-1)?.[0])).toContain('lluvia_pct=-30&temp_delta=-2');
    const celda = screen.getByRole('button', { name: 'Papa, Enero. Original: Recomendado. Simulado: No recomendado' }); celda.focus(); await userEvent.keyboard('{Enter}');
    const dialogo = await screen.findByRole('dialog'); expect(within(dialogo).getByText(/Motivo original de prueba/)).toBeVisible(); expect(within(dialogo).getByText(/Motivo simulado de prueba/)).toBeVisible(); await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar comparación' }));
    fireEvent.change(lluvia, { target: { value: '30' } }); fireEvent.change(temperatura, { target: { value: '2' } }); await screen.findByText('Simulación: lluvia +30 %, temperatura +2 °C');
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar escenario original' })); await screen.findByText('Escenario original seleccionado'); expect(lluvia).toHaveValue('0'); expect(temperatura).toHaveValue('0'); expect(solicitar).toHaveBeenCalledTimes(6);
  }, 12000);
  it('agrupa cambios rápidos y no presenta la respuesta de un escenario anterior', async () => {
    const calendarioPendiente = Promise.withResolvers<Response>(); const rotacionesPendientes = Promise.withResolvers<Response>();
    const solicitar = vi.fn(async (entrada: URL | RequestInfo) => String(entrada).includes('lluvia_pct=-10') ? (String(entrada).includes('/calendario') ? calendarioPendiente.promise : rotacionesPendientes.promise) : respuesta(entrada)); vi.stubGlobal('fetch', solicitar); mostrar(); await abrir();
    const lluvia = screen.getByRole('slider', { name: 'Variación de lluvia' }); fireEvent.change(lluvia, { target: { value: '-10' } });
    await waitFor(() => expect(solicitar).toHaveBeenCalledTimes(4)); fireEvent.change(lluvia, { target: { value: '-20' } }); fireEvent.change(lluvia, { target: { value: '-30' } });
    await screen.findByText('Simulación: lluvia -30 %, temperatura 0 °C');
    await act(async () => { calendarioPendiente.resolve(respuesta(new URL('http://localhost/calendario?lluvia_pct=-10&temp_delta=0'))); rotacionesPendientes.resolve(respuesta(new URL('http://localhost/rotaciones?lluvia_pct=-10&temp_delta=0'))); });
    expect(screen.queryByText('Simulación: lluvia -10 %, temperatura 0 °C')).not.toBeInTheDocument(); expect(solicitar).toHaveBeenCalledTimes(6);
  });
  it('un error de API oculta los resultados anteriores y permite reintentar', async () => {
    let falla = true; vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => String(entrada).includes('lluvia_pct=-30') && falla ? new Response(JSON.stringify({ error: 'Clima temporalmente no disponible.' }), { status: 500 }) : respuesta(entrada)));
    mostrar(); await abrir(); fireEvent.change(screen.getByRole('slider', { name: 'Variación de lluvia' }), { target: { value: '-30' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la solicitud'); expect(screen.queryByRole('region', { name: 'Calendario comparado de escenarios' })).not.toBeInTheDocument();
    falla = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByText('Simulación: lluvia -30 %, temperatura 0 °C');
  });
  it('rechaza que el servidor devuelva otro escenario en lugar del solicitado', async () => {
    vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => { const datos = crearEscenariosPrueba(); return new Response(JSON.stringify(String(entrada).includes('/calendario') ? datos.calendario : datos.rotaciones)); })); mostrar(); await abrir();
    fireEvent.change(screen.getByRole('slider', { name: 'Variación de temperatura' }), { target: { value: '2' } }); expect(await screen.findByRole('alert')).toHaveTextContent('no corresponde al escenario');
  });
  it('no compara cuando la referencia climática cambia entre consultas', async () => {
    vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => { const url = new URL(String(entrada)); const datos = crearEscenariosPrueba({ lluvia_pct: Number(url.searchParams.get('lluvia_pct')), temp_delta: 0 });
      if (datos.calendario.escenario.lluvia_pct !== 0) datos.calendario.clima.actualizado_en = '2030-01-01T00:00:00Z';
      return new Response(JSON.stringify(url.pathname.endsWith('/calendario') ? datos.calendario : datos.rotaciones)); })); mostrar(); await abrir();
    fireEvent.change(screen.getByRole('slider', { name: 'Variación de lluvia' }), { target: { value: '-30' } }); expect(await screen.findByRole('alert')).toHaveTextContent('referencia cambiaron');
  });
  it('conserva estados no determinados y puntuaciones nulas ante datos insuficientes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => {
      const datos = crearEscenariosPrueba(); datos.calendario.terreno.altitud_m = null;
      datos.calendario.celdas = datos.calendario.celdas.map((celda) => ({ ...celda, estado: 'no_determinado' }));
      datos.rotaciones.clima = null; datos.rotaciones.advertencias = ['Climatología insuficiente: no se determina el ranking.'];
      datos.rotaciones.estrategias = datos.rotaciones.estrategias.map((valor, indice) => ({ ...valor, id: indice === 0 ? 'actual' : null, secuencia: [], planificacion: [], estado: 'no_determinado', puntajes: { agua: null, suelo: null, riesgo: null, ingresos: null, total: null } }));
      return new Response(JSON.stringify(String(entrada).includes('/calendario') ? datos.calendario : datos.rotaciones));
    })); mostrar(); await abrir();
    expect(screen.getByText('Climatología insuficiente: no se determina el ranking.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Papa, Enero. Original: No determinado. Simulado: No determinado' })).toBeVisible();
    expect(screen.queryByText('0/100')).not.toBeInTheDocument(); expect(screen.getAllByText('No comparable').length).toBeGreaterThan(0);
  });
  it('un error del original se muestra aunque los controles cambien antes de terminar la carga', async () => {
    const pendientes = [Promise.withResolvers<Response>(), Promise.withResolvers<Response>()]; let indice = 0;
    vi.stubGlobal('fetch', vi.fn(async () => pendientes[indice++]?.promise)); mostrar();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir simulador de escenarios' })); fireEvent.change(screen.getByRole('slider', { name: 'Variación de lluvia' }), { target: { value: '-30' } });
    await act(async () => { pendientes.forEach((pendiente) => pendiente.resolve(new Response('{}', { status: 500 }))); });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la solicitud');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it.each(['cerrar', 'cambiar'] as const)('descarta respuestas tardías al %s sesión y separa la caché', async (accion) => {
    const pendientes = [Promise.withResolvers<Response>(), Promise.withResolvers<Response>()]; let indice = 0;
    const solicitar = vi.fn(async (entrada: URL | RequestInfo) => { if (indice < 2) return pendientes[indice++]?.promise ?? respuesta(entrada); return respuesta(entrada); }); vi.stubGlobal('fetch', solicitar);
    const vista = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Abrir simulador de escenarios' })); vista[accion]();
    if (accion === 'cambiar') await abrir();
    await act(async () => { const datos = crearEscenariosPrueba(); pendientes[0]?.resolve(new Response(JSON.stringify(datos.calendario))); pendientes[1]?.resolve(new Response(JSON.stringify(datos.rotaciones))); });
    if (accion === 'cerrar') expect(screen.queryByRole('table')).not.toBeInTheDocument();
    else { expect(solicitar).toHaveBeenCalledTimes(4); expect(solicitar).toHaveBeenLastCalledWith(expect.any(URL), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-b' }) })); }
  });
});
