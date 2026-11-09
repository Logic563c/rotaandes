import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import { PanelTecnico } from './PanelTecnico';
import { panelTecnicoPrueba } from '../tests/panelTecnicoPruebas';

vi.mock('../components/MapaDiferido', () => ({ MapaDiferido: () => <div aria-label="Mapa controlado">Mapa comprobado en E2E</div> }));
const clientes: QueryClient[] = [];
function mostrar(rol: 'agricultor' | 'tecnico' = 'tecnico') {
  let usuarioActual = 'tecnico-prueba'; let activa = true; const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const vista = () => <QueryClientProvider client={cliente}><MemoryRouter><ContextoSesion.Provider value={{ usuario: { id: usuarioActual, email: 'fixture@example.invalid', nombre: 'Persona de prueba', rol, parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null }, token: `token-${usuarioActual}`, estaValidando: false, error: null, confirmarSesion: async () => {}, cerrarSesion: () => { activa = false; }, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: (token) => activa && token === `token-${usuarioActual}` }}><PanelTecnico /></ContextoSesion.Provider></MemoryRouter></QueryClientProvider>;
  const resultado = render(vista()); return { cambiar: () => { usuarioActual = 'segunda-cuenta'; resultado.rerender(vista()); }, cerrar: () => { activa = false; } };
}
function simular(accion: (url: URL) => Response | Promise<Response> = () => Response.json(panelTecnicoPrueba())) {
  const solicitar = vi.fn().mockImplementation((url: URL) => url.pathname.endsWith('/cultivos') ? Promise.resolve(Response.json([])) : Promise.resolve(accion(url))); vi.stubGlobal('fetch', solicitar); return solicitar;
}
afterEach(() => { clientes.forEach((c) => c.clear()); clientes.length = 0; vi.useRealTimers(); });
describe('Panel técnico: acceso, filtros y estados honestos', () => {
  it('agricultor no consulta API ni encuentra navegación técnica', () => {
    const solicitar = simular(); mostrar('agricultor'); expect(screen.getByRole('alert')).toHaveTextContent('exclusivamente'); expect(solicitar).not.toHaveBeenCalled(); expect(screen.queryByRole('link', { name: 'Panel técnico' })).not.toBeInTheDocument();
  });
  it('muestra resumen, mapa, siembra y alerta con enlace de solo lectura', async () => {
    simular(); mostrar(); expect(await screen.findByRole('heading', { name: '1. Parcela técnica controlada' })).toBeInTheDocument(); expect(screen.getByLabelText('Mapa controlado')).toBeInTheDocument();
    expect(screen.getByText(/Última siembra: Papa/)).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Consultar Parcela técnica controlada' })).toHaveAttribute('href', '/terrenos/00000000-0000-4000-8000-000000000001'); expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  });
  it('filtra parroquia, comunica vacío y permite limpiar filtros', async () => {
    const solicitar = simular((url) => { const datos = panelTecnicoPrueba(); if (url.searchParams.has('parroquia')) { datos.terrenos = []; datos.paginacion = { pagina: 1, tamano: 50, total: 0, paginas: 0 }; } return Response.json(datos); }); mostrar();
    await screen.findByRole('heading', { name: '1. Parcela técnica controlada' }); await userEvent.selectOptions(screen.getByLabelText('Parroquia del perfil'), 'Latacunga'); await screen.findByText(/No hay terrenos para estos filtros/);
    expect(solicitar.mock.calls.some(([url]) => url instanceof URL && url.searchParams.get('parroquia') === 'Latacunga')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' })); await screen.findByRole('heading', { name: '1. Parcela técnica controlada' });
  });
  it('maneja error y reintento sin conservar datos anteriores como actuales', async () => {
    let falla = true; simular(() => falla ? Response.json({ error: 'Prueba controlada' }, { status: 500 }) : Response.json(panelTecnicoPrueba())); mostrar(); await screen.findByRole('alert'); expect(screen.queryByRole('link', { name: /Consultar Parcela/ })).not.toBeInTheDocument();
    falla = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByRole('heading', { name: '1. Parcela técnica controlada' });
  });
  it('al vencer un pronóstico deja de presentar la alerta sin cambiar los datos guardados', async () => {
    const instante = Date.now(); simular(() => { const datos = panelTecnicoPrueba(); const t = datos.terrenos[0]; if (!t) throw new Error(); t.helada.vigente_hasta = new Date(instante + 1500).toISOString(); return Response.json(datos); }); mostrar();
    await screen.findByRole('heading', { name: '1. Parcela técnica controlada' }); await waitFor(() => expect(screen.getByText('? Estado desconocido')).toBeInTheDocument(), { timeout: 3000 }); expect(screen.queryByText('Alerta controlada de prueba: posible helada, no confirmación.')).not.toBeInTheDocument();
  });
  it('descarta una respuesta que llega después del cierre de sesión', async () => {
    const pendiente = Promise.withResolvers<Response>(); simular(() => pendiente.promise); const sesion = mostrar(); sesion.cerrar(); await act(async () => { pendiente.resolve(Response.json(panelTecnicoPrueba())); }); expect(screen.queryByRole('heading', { name: '1. Parcela técnica controlada' })).not.toBeInTheDocument();
  });
  it('cambiar de cuenta no permite que la respuesta anterior reemplace el panel nuevo', async () => {
    const pendiente = Promise.withResolvers<Response>(); let primera = true; simular(() => { if (primera) { primera = false; return pendiente.promise; } const datos = panelTecnicoPrueba(); const t = datos.terrenos[0]; if (t) t.nombre = 'Solo segunda cuenta'; return Response.json(datos); }); const sesion = mostrar(); sesion.cambiar();
    await screen.findByRole('heading', { name: '1. Solo segunda cuenta' }); await act(async () => { pendiente.resolve(Response.json(panelTecnicoPrueba())); }); expect(screen.queryByRole('heading', { name: '1. Parcela técnica controlada' })).not.toBeInTheDocument();
  });
});
