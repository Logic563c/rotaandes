import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacion } from './Aplicacion';
import { ProveedorSesion } from './components/ProveedorSesion';

const usuario = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid', nombre: 'Persona de prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
function tokenPrueba(exp = Math.floor(Date.now() / 1000) + 900) { return `fixture.${btoa(JSON.stringify({ exp }))}.sin-firma-real`; }
const clientes: QueryClient[] = [];
function mostrar(ruta: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clientes.push(cliente);
  render(<QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><Aplicacion /></ProveedorSesion></MemoryRouter></QueryClientProvider>);
  return cliente;
}
function respuesta(datos: unknown, status = 200) { return new Response(JSON.stringify(datos), { status }); }
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; sessionStorage.clear(); });

describe('Sesión y pantallas', () => {
  it('redirige una visita privada sin token al acceso', async () => {
    mostrar('/perfil');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
  it('espera a /yo antes de mostrar información privada', async () => {
    sessionStorage.setItem('rotaandes.sesion', tokenPrueba());
    const pendiente = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise));
    mostrar('/inicio');
    expect(screen.getByRole('status')).toHaveTextContent('Validando tu sesión');
    expect(screen.queryByText(/Bienvenido/)).not.toBeInTheDocument();
    pendiente.resolve(respuesta(usuario));
    expect(await screen.findByRole('heading', { name: /Bienvenido/ })).toBeInTheDocument();
  });
  it('elimina sesión y caché al cerrar y protege nuevamente el perfil', async () => {
    sessionStorage.setItem('rotaandes.sesion', tokenPrueba());
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(respuesta(usuario))));
    const cliente = mostrar('/inicio');
    await screen.findByRole('heading', { name: /Bienvenido/ });
    cliente.setQueryData(['datoPrivado'], { privado: true });
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(sessionStorage.getItem('rotaandes.sesion')).toBeNull();
    expect(cliente.getQueryData(['datoPrivado'])).toBeUndefined();
  });
  it('un 401 elimina el token y no muestra el perfil', async () => {
    sessionStorage.setItem('rotaandes.sesion', tokenPrueba());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ error: 'Sesión vencida.' }, 401)));
    mostrar('/perfil');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(sessionStorage.getItem('rotaandes.sesion')).toBeNull();
  });
  it('una actualización tardía no repuebla la caché después de cerrar sesión', async () => {
    sessionStorage.setItem('rotaandes.sesion', tokenPrueba());
    const pendiente = Promise.withResolvers<Response>();
    const solicitar = vi.fn().mockImplementation((url: URL) => url.pathname.endsWith('/perfil') ? pendiente.promise : Promise.resolve(respuesta(usuario)));
    vi.stubGlobal('fetch', solicitar);
    const cliente = mostrar('/perfil');
    await screen.findByRole('heading', { name: 'Tus datos, tus prioridades.' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(solicitar.mock.calls.some(([url]) => url.pathname.endsWith('/perfil'))).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await act(async () => { pendiente.resolve(respuesta({ ...usuario, nombre: 'Respuesta tardía' })); });
    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    expect(cliente.getQueryData(['sesion', 'usuario'])).toBeUndefined();
    expect(sessionStorage.getItem('rotaandes.sesion')).toBeNull();
  });
  it('un 401 de la sesión anterior no cierra una cuenta recién autenticada', async () => {
    const tokenAnterior = tokenPrueba();
    const tokenNuevo = tokenPrueba(Math.floor(Date.now() / 1000) + 800);
    sessionStorage.setItem('rotaandes.sesion', tokenAnterior);
    const pendiente = Promise.withResolvers<Response>();
    const nuevaPersona = { ...usuario, nombre: 'Otra persona', id: '00000000-0000-4000-8000-000000000002' };
    let nuevoIngreso = false;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: URL) => {
      if (url.pathname.endsWith('/perfil')) return pendiente.promise;
      if (url.pathname.endsWith('/login')) { nuevoIngreso = true; return Promise.resolve(respuesta({ token: tokenNuevo, usuario: nuevaPersona })); }
      return Promise.resolve(respuesta(nuevoIngreso ? nuevaPersona : usuario));
    }));
    const cliente = mostrar('/perfil');
    await screen.findByRole('heading', { name: 'Tus datos, tus prioridades.' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByRole('button', { name: 'Guardando cambios…' });
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await userEvent.type(screen.getByLabelText('Correo electrónico *'), usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña *'), 'clave-solo-fixture');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi cuenta' }));
    await screen.findByRole('heading', { name: 'Bienvenido, Otra persona.' });
    await act(async () => { pendiente.resolve(respuesta({ error: 'Sesión anterior vencida.' }, 401)); });
    expect(screen.getByRole('heading', { name: 'Bienvenido, Otra persona.' })).toBeInTheDocument();
    expect(cliente.getQueryData(['sesion', 'usuario'])).toEqual(nuevaPersona);
    expect(sessionStorage.getItem('rotaandes.sesion') === tokenNuevo).toBe(true);
  });
  it('un fallo de red bloquea la vista y permite reintentar', async () => {
    sessionStorage.setItem('rotaandes.sesion', tokenPrueba());
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('red')).mockImplementationOnce(() => Promise.resolve(respuesta(usuario))));
    mostrar('/inicio');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
    expect(screen.queryByText(/Bienvenido/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: /Bienvenido/ })).toBeInTheDocument();
  });
  it('registro valida contraseña y permite mostrarla u ocultarla', async () => {
    const fetchPrueba = vi.fn(); vi.stubGlobal('fetch', fetchPrueba);
    mostrar('/registro');
    await userEvent.type(screen.getByLabelText('Nombre completo *'), 'Nombre de prueba');
    await userEvent.type(screen.getByLabelText('Correo electrónico *'), usuario.email);
    const password = screen.getByLabelText('Contraseña *');
    await userEvent.type(password, 'corta');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Registrarme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('15 caracteres');
    expect(fetchPrueba).not.toHaveBeenCalled();
  });
  it('muestra espera y errores de login sin crear sesión', async () => {
    const pendiente = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise));
    mostrar('/login');
    await userEvent.type(screen.getByLabelText('Correo electrónico *'), usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña *'), 'clave-solo-fixture');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi cuenta' }));
    expect(screen.getByRole('button', { name: 'Confirmando tu acceso…' })).toBeDisabled();
    pendiente.resolve(respuesta({ error: 'Correo o contraseña incorrectos.' }, 401));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(sessionStorage.getItem('rotaandes.sesion')).toBeNull();
  });
  it('un login recibido no abre la sesión si /yo lo rechaza', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuesta({ token: tokenPrueba(), usuario })).mockResolvedValueOnce(respuesta({ error: 'Sesión rechazada.' }, 401)));
    mostrar('/login');
    await userEvent.type(screen.getByLabelText('Correo electrónico *'), usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña *'), 'clave-solo-fixture');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi cuenta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sesión rechazada.');
    expect(sessionStorage.getItem('rotaandes.sesion')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Bienvenido/ })).not.toBeInTheDocument();
  });
  it('presenta errores de guardado sin afirmar que persistió el perfil', async () => {
    sessionStorage.setItem('rotaandes.sesion', tokenPrueba());
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: URL) => Promise.resolve(url.pathname.endsWith('/perfil') ? respuesta({ error: 'Revisa el teléfono.' }, 400) : respuesta(usuario))));
    mostrar('/perfil');
    await screen.findByRole('heading', { name: 'Tus datos, tus prioridades.' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa el teléfono.');
    expect(screen.queryByText('Tu perfil se guardó correctamente.')).not.toBeInTheDocument();
  });
  it('confirma login mediante /yo, guarda sesión y permite editar prioridades', async () => {
    const solicitar = vi.fn().mockImplementation((url: URL) => {
      if (url.pathname.endsWith('/login')) return Promise.resolve(respuesta({ token: tokenPrueba(), usuario }));
      if (url.pathname.endsWith('/perfil')) return Promise.resolve(respuesta({ ...usuario, prioridad_agua: 5 }));
      return Promise.resolve(respuesta(usuario));
    });
    vi.stubGlobal('fetch', solicitar);
    mostrar('/login');
    await userEvent.type(screen.getByLabelText('Correo electrónico *'), usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña *'), 'clave-solo-fixture');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi cuenta' }));
    await screen.findByRole('heading', { name: /Bienvenido/ });
    expect(sessionStorage.getItem('rotaandes.sesion')).toBeTruthy();
    await userEvent.click(screen.getByRole('link', { name: 'Mi perfil' }));
    const agua = screen.getByRole('slider', { name: /Cuidar el agua/ });
    fireEvent.change(agua, { target: { value: '5' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(solicitar.mock.calls.some(([url]) => url.pathname.endsWith('/perfil'))).toBe(true));
    expect(await screen.findByRole('status')).toHaveTextContent('se guardó');
  });
});
