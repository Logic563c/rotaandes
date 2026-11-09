import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import { tendenciaPrueba } from '../tests/tendenciaPruebas';
import { TendenciaTerreno } from './TendenciaTerreno';

vi.mock('./GraficasTendencia', () => ({ GraficasTendencia: () => <div>Gráficas comprobadas en navegador</div> }));
const clientes: QueryClient[] = [];
function mostrar() {
  let activa = true; let usuarioActual = 'usuario-prueba'; const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const vista = () => <QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { id: usuarioActual, email: 'fixture@example.invalid', nombre: 'Prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null }, token: `token-${usuarioActual}`, estaValidando: false, error: null, confirmarSesion: async () => {}, cerrarSesion: () => { activa = false; }, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: (token) => activa && token === `token-${usuarioActual}` }}><TendenciaTerreno terrenoId="terreno-prueba" latitud={-0.93} longitud={-78.62} /></ContextoSesion.Provider></QueryClientProvider>;
  const resultado = render(vista());
  return { cerrar: () => { activa = false; }, cambiar: () => { usuarioActual = 'otro-usuario'; resultado.rerender(vista()); } };
}
afterEach(() => { clientes.forEach((c) => c.clear()); clientes.length = 0; });
describe('Tendencias accesibles, fuentes y sesión', () => {
  it('abre bajo demanda, muestra carga y veinte años con tabla complementaria', async () => {
    const pendiente = Promise.withResolvers<Response>(); const solicitar = vi.fn().mockReturnValue(pendiente.promise); vi.stubGlobal('fetch', solicitar); mostrar(); expect(solicitar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Ver tendencias 2005–2024' })); expect(screen.getByRole('status')).toBeInTheDocument(); pendiente.resolve(Response.json(tendenciaPrueba()));
    const tabla = await screen.findByRole('table'); expect(within(tabla).getAllByRole('row')).toHaveLength(21); expect(screen.getByText(/Datos sintéticos/)).toBeInTheDocument(); expect(screen.getAllByText(/Caché verificada/)).toHaveLength(2);
  });
  it('no presenta datos falsos durante un fallo y permite reintentar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('red')).mockResolvedValueOnce(Response.json(tendenciaPrueba()))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver tendencias 2005–2024' }));
    await screen.findByRole('alert'); expect(screen.queryByRole('table')).not.toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByRole('table')).toBeInTheDocument();
  });
  it('sin diario conserva No disponible y dirección no determinada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(tendenciaPrueba(true)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver tendencias 2005–2024' }));
    const tabla = await screen.findByRole('table'); expect(within(tabla).getByRole('row', { name: /^2005 / })).toHaveTextContent('No disponible'); expect(screen.getByText(/No determinada: menos de 15 años completos/)).toBeInTheDocument();
  });
  it('identifica antigüedad y no cambia la fecha original', async () => {
    const datos = tendenciaPrueba(); datos.fuentes.mensual.estado_datos = 'desactualizado'; datos.fuentes.mensual.desactualizado = true;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(datos))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver tendencias 2005–2024' })); await screen.findByRole('table'); expect(screen.getByText(/Desactualizada/)).toBeInTheDocument();
  });
  it('descarta respuestas tardías después de cerrar la sesión', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise)); const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver tendencias 2005–2024' })); sesion.cerrar();
    await act(async () => { pendiente.resolve(Response.json(tendenciaPrueba())); }); expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('una respuesta del usuario anterior no reemplaza los resultados de una nueva sesión', async () => {
    const pendiente = Promise.withResolvers<Response>(); const nuevos = tendenciaPrueba(); nuevos.anual.forEach((a) => { a.lluvia_mm = 2000; });
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pendiente.promise).mockResolvedValue(Response.json(nuevos)));
    const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver tendencias 2005–2024' })); sesion.cambiar();
    const tabla = await screen.findByRole('table'); const fila = within(tabla).getByRole('row', { name: /^2005 / }); expect(within(fila).getAllByRole('cell')[0]).toHaveTextContent('2.000');
    await act(async () => { pendiente.resolve(Response.json(tendenciaPrueba())); }); expect(within(fila).getAllByRole('cell')[0]).toHaveTextContent('2.000');
  });
});
