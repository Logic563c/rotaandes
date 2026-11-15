import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import type { UsuarioPublico } from '../types/api';
import { crearRotacionesPrueba } from '../tests/rotacionesPruebas';
import { ComparadorRotaciones } from './ComparadorRotaciones';

const clientes: QueryClient[] = [];
function mostrar() {
  let tokenActivo = 'token-a';
  const usuario: UsuarioPublico = { id: 'usuario-a', nombre: 'Prueba', email: 'fixture@example.invalid', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const contenido = (id = 'usuario-a', token = 'token-a') => <QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { ...usuario, id }, token, estaValidando: false, error: null, confirmarSesion: async () => {}, reintentar: () => {}, guardarPerfil: () => {}, cerrarSesion: () => { tokenActivo = ''; }, esSesionActual: (actual) => actual === tokenActivo }}><ComparadorRotaciones key={id} terrenoId="terreno-prueba" contexto={[3000, false]} /></ContextoSesion.Provider></QueryClientProvider>;
  const vista = render(contenido()); return { cerrar: () => { tokenActivo = ''; }, cambiar: () => { tokenActivo = 'token-b'; vista.rerender(contenido('usuario-b', 'token-b')); } };
}
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; vi.unstubAllGlobals(); });
describe('Comparador: tres tarjetas, límites, errores y sesiones', () => {
  it('explica la longitud de las barras sin equiparar los puntajes con cosechas o dinero', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(crearRotacionesPrueba()))));
    mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' }));
    const tarjeta = await screen.findByRole('article', { name: 'Patrón actual de prueba' });
    const lectura = within(tarjeta).getByText('Para leerla:').parentElement;
    expect(lectura).toBeVisible();
    expect(lectura).toHaveTextContent(/misma fila.*más larga es más favorable.*compatibilidad climática; más corta, menos/);
    expect(lectura).toHaveTextContent(/no cosechas ni dinero.*faltan datos/);
    expect(tarjeta.querySelector('dl')).toHaveAccessibleDescription(/Compara la misma fila/);
    expect(within(tarjeta).getByText('Evidencia, ventajas y límites')).toBeVisible();
    expect(within(tarjeta).getByText('55/100')).toBeVisible();
  });
  it('consulta a petición, muestra tres alternativas con valores/textos y explicaciones por teclado', async () => {
    const pendiente = Promise.withResolvers<Response>(); const solicitar = vi.fn().mockReturnValue(pendiente.promise); vi.stubGlobal('fetch', solicitar);
    mostrar(); expect(solicitar).not.toHaveBeenCalled(); const abrir = screen.getByRole('button', { name: 'Comparar rotaciones' }); abrir.focus(); await userEvent.keyboard('{Enter}'); expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    pendiente.resolve(new Response(JSON.stringify(crearRotacionesPrueba()))); await screen.findByRole('heading', { name: 'Patrón actual de prueba' });
    expect(screen.getAllByRole('article')).toHaveLength(3); expect(screen.getAllByText('55/100')).toHaveLength(3);
    await userEvent.click(within(screen.getByRole('article', { name: 'Patrón actual de prueba' })).getByText('Evidencia, ventajas y límites')); expect(screen.getAllByText('No hay análisis de suelo.')[0]).toBeVisible();
    expect(String(solicitar.mock.calls[0]?.[0])).toContain('/rotaciones?lluvia_pct=0&temp_delta=0');
    expect(solicitar).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-a' }) }));
  });
  it('un fallo no muestra puntuaciones falsas y permite reintentar', async () => {
    const solicitar = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 500 })).mockImplementation(async () => new Response(JSON.stringify(crearRotacionesPrueba()))); vi.stubGlobal('fetch', solicitar);
    mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' })); await screen.findByRole('alert'); expect(screen.queryAllByRole('article')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ })); expect(await screen.findByRole('heading', { name: 'Primera alternativa de prueba' })).toBeVisible();
  });
  it('sin información fiable conserva indicadores nulos y posiciones no determinadas', async () => {
    const datos = crearRotacionesPrueba(); datos.clima = null;
    datos.estrategias = datos.estrategias.map((valor, indice) => ({ ...valor, id: indice === 0 ? 'actual' : null, secuencia: [], planificacion: [], estado: 'no_determinado', puntajes: { agua: null, suelo: null, riesgo: null, ingresos: null, total: null } }));
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(datos)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' }));
    expect(await screen.findByText('Climatología no disponible: no se determina el ranking.')).toBeVisible(); expect(screen.getAllByText('No determinado')).toHaveLength(15); expect(screen.queryByText('0/100')).not.toBeInTheDocument();
  });
  it.each(['puntaje', 'duplicada', 'falta', 'fecha'])('rechaza una respuesta %s incorrecta', async (caso) => {
    const datos = crearRotacionesPrueba();
    if (caso === 'puntaje' && datos.estrategias[0]) datos.estrategias[0].puntajes.total = 101;
    if (caso === 'duplicada' && datos.estrategias[1]) datos.estrategias[1].id = 'actual';
    if (caso === 'falta') datos.estrategias.pop();
    if (caso === 'fecha' && datos.estrategias[0]?.planificacion[0]) datos.estrategias[0].planificacion[0].inicio_estimado = '2030-02-30';
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(datos)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' })); await screen.findByRole('alert'); expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
  it('una respuesta tardía después de cerrar no presenta una comparación', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise)); const vista = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' })); vista.cerrar();
    await act(async () => { pendiente.resolve(new Response(JSON.stringify(crearRotacionesPrueba()))); }); expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
  it('cambiar de usuario conserva solo la nueva respuesta y su caché', async () => {
    const pendiente = Promise.withResolvers<Response>(); const nuevos = crearRotacionesPrueba(); if (nuevos.estrategias[0]) nuevos.estrategias[0].nombre = 'Cuenta nueva';
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pendiente.promise).mockImplementation(async () => new Response(JSON.stringify(nuevos)))); const vista = mostrar();
    await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' })); vista.cambiar(); await userEvent.click(screen.getByRole('button', { name: 'Comparar rotaciones' }));
    await screen.findByRole('heading', { name: 'Cuenta nueva' }); await act(async () => { pendiente.resolve(new Response(JSON.stringify(crearRotacionesPrueba()))); });
    expect(screen.queryByRole('heading', { name: 'Patrón actual de prueba' })).not.toBeInTheDocument(); expect(screen.getByRole('heading', { name: 'Cuenta nueva' })).toBeVisible();
  });
});
