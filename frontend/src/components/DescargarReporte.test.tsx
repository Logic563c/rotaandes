import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import { DescargarReporte } from './DescargarReporte';

const id = '00000000-0000-4000-8000-000000000001';
const respuesta = () => new Response('%PDF-1.7\nfixture exclusivamente de transporte\n%%EOF', { headers: { 'content-type': 'application/pdf' } });
function mostrar() {
  let activa = true;
  const vista = render(<ContextoSesion.Provider value={{ usuario: { id: 'usuario-prueba', email: 'fixture@example.invalid', nombre: 'Prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null }, token: 'token-prueba', estaValidando: false, error: null, confirmarSesion: async () => {}, cerrarSesion: () => { activa = false; }, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: () => activa }}><DescargarReporte terrenoId={id} /></ContextoSesion.Provider>);
  return { ...vista, cerrar: () => { activa = false; } };
}
describe('Descarga: carga, errores, sesión y URLs temporales', () => {
  it('muestra espera, descarga y revoca el enlace al desmontarse', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise));
    const crear = vi.fn().mockReturnValue('blob:prueba'); const revocar = vi.fn(); vi.stubGlobal('URL', class extends URL { static createObjectURL = crear; static revokeObjectURL = revocar; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); const vista = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Descargar informe PDF' })); expect(screen.getByRole('button', { name: 'Preparando informe…' })).toBeDisabled();
    await act(async () => { pendiente.resolve(respuesta()); }); await screen.findByText(/descarga del informe PDF está preparada/); expect(click).toHaveBeenCalledOnce(); expect(crear).toHaveBeenCalledOnce(); vista.unmount(); expect(revocar).toHaveBeenCalledWith('blob:prueba');
  });
  it('explica errores y permite reintentar sin crear un enlace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('red'))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Descargar informe PDF' })); await screen.findByRole('alert'); expect(screen.getByRole('button', { name: 'Descargar informe PDF' })).toBeEnabled();
  });
  it('una respuesta tardía no dispara descarga después del cierre de sesión', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise)); const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Descargar informe PDF' })); sesion.cerrar(); await act(async () => { pendiente.resolve(respuesta()); }); await waitFor(() => expect(click).not.toHaveBeenCalled());
  });
  it('desmontar cancela una solicitud pendiente', async () => {
    const solicitar = vi.fn().mockReturnValue(new Promise<Response>(() => {})); vi.stubGlobal('fetch', solicitar); const vista = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Descargar informe PDF' })); vista.unmount();
    const opciones = solicitar.mock.calls[0]?.[1]; expect(opciones?.signal.aborted).toBe(true);
  });
});
