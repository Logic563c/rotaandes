import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacion } from './Aplicacion';
import { ProveedorSesion } from './components/ProveedorSesion';
import type { MapaTerrenosProps } from './components/MapaTerrenos';
import type { Siembra } from './types/api';

vi.mock('./components/MapaDiferido', () => ({ MapaDiferido: ({ alSeleccionar }: MapaTerrenosProps) => <div aria-label="Mapa de prueba">{alSeleccionar && <button type="button" onClick={() => alSeleccionar({ latitud: -0.93, longitud: -78.62 })}>Seleccionar punto de prueba</button>}</div> }));
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });

const idUsuario = '00000000-0000-4000-8000-000000000001';
const idTerreno = '00000000-0000-4000-8000-000000000002';
const idSiembra = '00000000-0000-4000-8000-000000000003';
const usuario = { id: idUsuario, email: 'fixture@example.invalid', nombre: 'Persona de prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
const terreno = { id: idTerreno, usuario_id: idUsuario, nombre: 'Parcela de prueba', latitud: -0.93, longitud: -78.62, altitud_m: null, area_ha: 1.25, tiene_riego: false, tipo_suelo: 'franco', creado_en: null };
const cultivo = { id: 'papa', nombre: 'Papa', familia: 'Solanaceae', altitud_min: 2700, altitud_max: 3800, ciclo_meses: 6, meses_siembra: [10, 11, 12, 1], lluvia_min_mensual_mm: 60, demanda_agua: 4, tolerancia_helada: 2, tolerancia_sequia: 2, fija_nitrogeno: false, aporte_materia_organica: 2, proteccion_erosion: 2, valor_forraje: 1, valor_mercado: 5, descripcion: null };
const siembra: Siembra = { id: idSiembra, terreno_id: idTerreno, cultivo_id: 'papa', fecha_siembra: '2024-02-29', fecha_cosecha: null, notas: null, creado_en: null };
const token = `fixture.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 }))}.sin-firma-real`;
const clientes: QueryClient[] = [];
function respuesta(datos: unknown, status = 200) { return new Response(status === 204 ? null : JSON.stringify(datos), { status }); }
function mostrar(ruta: string, tipoUsuario = usuario) {
  sessionStorage.setItem('rotaandes.sesion', token);
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  render(<QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><Aplicacion /></ProveedorSesion></MemoryRouter></QueryClientProvider>);
  return { cliente, tipoUsuario };
}
function simular(accion?: (url: URL, opciones: RequestInit) => Response | Promise<Response> | undefined, tipoUsuario = usuario) {
  const solicitar = vi.fn().mockImplementation((url: URL, opciones: RequestInit) => {
    const personalizada = accion?.(url, opciones);
    if (personalizada) return Promise.resolve(personalizada);
    if (url.pathname.endsWith('/auth/yo')) return Promise.resolve(respuesta(tipoUsuario));
    if (url.pathname.endsWith('/cultivos')) return Promise.resolve(respuesta([cultivo]));
    if (url.pathname.endsWith('/siembras')) return Promise.resolve(respuesta([]));
    if (url.pathname.endsWith(`/terrenos/${idTerreno}`)) return Promise.resolve(respuesta(terreno));
    return Promise.resolve(respuesta([]));
  });
  vi.stubGlobal('fetch', solicitar); return solicitar;
}
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; sessionStorage.clear(); });

describe('Interfaz de terrenos y siembras', () => {
  it('muestra espera y estado vacío de terrenos', async () => {
    const pendiente = Promise.withResolvers<Response>();
    simular((url) => url.pathname === '/api/terrenos' ? pendiente.promise : undefined);
    mostrar('/terrenos');
    await screen.findByRole('heading', { name: 'Mis terrenos' });
    expect(screen.getByText('Cargando información…')).toBeInTheDocument();
    pendiente.resolve(respuesta([]));
    expect(await screen.findByRole('heading', { name: 'Tu primera parcela empieza aquí' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Añadir terreno/ })).toBeInTheDocument();
  });
  it('muestra error de listado y permite recuperarse', async () => {
    let fallo = true;
    simular((url) => url.pathname === '/api/terrenos' ? (fallo ? respuesta({ error: 'Servicio temporalmente no disponible.' }, 503) : respuesta([terreno])) : undefined);
    mostrar('/terrenos');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar');
    fallo = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: terreno.nombre })).toBeInTheDocument();
  });
  it('selecciona punto, conserva datos ante error y guarda sin campos de servidor', async () => {
    let fallo = true;
    const solicitar = simular((url, opciones) => url.pathname === '/api/terrenos' && opciones.method === 'POST' ? (fallo ? respuesta({ error: 'Revisa los datos.' }, 400) : respuesta(terreno, 201)) : undefined);
    mostrar('/terrenos/nuevo');
    await screen.findByRole('heading', { name: 'Ubica tu terreno' });
    await userEvent.type(screen.getByLabelText('Nombre del terreno *'), 'Parcela de prueba');
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar punto de prueba' }));
    expect(screen.getByLabelText('Latitud *')).toHaveValue(-0.93);
    expect(screen.getByLabelText('Longitud *')).toHaveValue(-78.62);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar terreno' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los datos.');
    expect(screen.getByLabelText('Nombre del terreno *')).toHaveValue('Parcela de prueba');
    fallo = false; await userEvent.click(screen.getByRole('button', { name: 'Guardar terreno' }));
    await screen.findByRole('heading', { name: 'Parcela de prueba', level: 1 });
    expect(screen.getByText(/No se pudo obtener la altitud estimada/)).toBeInTheDocument();
    const escritura = solicitar.mock.calls.find(([, opciones]) => opciones.method === 'POST');
    expect(JSON.parse(escritura?.[1].body ?? '{}')).toEqual({ nombre: 'Parcela de prueba', latitud: -0.93, longitud: -78.62, area_ha: null, tipo_suelo: 'no_se', tiene_riego: false });
  });
  it('admite coordenadas manuales y carga la edición existente', async () => {
    const solicitar = simular((url, opciones) => opciones.method === 'PUT' && url.pathname.endsWith(idTerreno) ? respuesta({ ...terreno, latitud: -1, tiene_riego: true }) : undefined);
    mostrar(`/terrenos/${idTerreno}/editar`);
    await screen.findByLabelText('Nombre del terreno *');
    fireEvent.change(screen.getByLabelText('Latitud *'), { target: { value: '-1' } });
    await userEvent.click(screen.getByLabelText('Mi terreno tiene riego'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar terreno' }));
    await waitFor(() => expect(solicitar.mock.calls.some(([, opciones]) => opciones.method === 'PUT')).toBe(true));
    const escritura = solicitar.mock.calls.find(([, opciones]) => opciones.method === 'PUT');
    expect(JSON.parse(escritura?.[1].body ?? '{}')).toMatchObject({ latitud: -1, longitud: -78.62, tiene_riego: true });
  });
  it('cancela una eliminación y exige confirmación antes de DELETE', async () => {
    let borrado = false;
    const solicitar = simular((url, opciones) => {
      if (opciones.method === 'DELETE') { borrado = true; return respuesta(null, 204); }
      return url.pathname === '/api/terrenos' ? respuesta(borrado ? [] : [terreno]) : undefined;
    });
    mostrar('/terrenos');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Parcela de prueba' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('También se eliminarán todas sus siembras');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(solicitar.mock.calls.some(([, opciones]) => opciones.method === 'DELETE')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Parcela de prueba' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText('El terreno y sus siembras se eliminaron correctamente.')).toBeInTheDocument();
  });
  it('valida orden de fechas y conserva el formulario si el servidor rechaza la siembra', async () => {
    const solicitar = simular((url, opciones) => url.pathname.endsWith('/siembras') && opciones.method === 'POST' ? respuesta({ error: 'El cultivo ya no está disponible.' }, 400) : undefined);
    mostrar(`/terrenos/${idTerreno}`);
    await screen.findByRole('button', { name: 'Guardar siembra' });
    await userEvent.selectOptions(screen.getByLabelText('Cultivo *'), 'papa');
    fireEvent.change(screen.getByLabelText('Fecha de siembra *'), { target: { value: '2024-02-29' } });
    fireEvent.change(screen.getByLabelText('Fecha de cosecha (opcional)'), { target: { value: '2024-02-28' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no puede ser anterior');
    expect(solicitar.mock.calls.some(([, opciones]) => opciones.method === 'POST')).toBe(false);
    fireEvent.change(screen.getByLabelText('Fecha de cosecha (opcional)'), { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El cultivo ya no está disponible.');
    expect(screen.getByLabelText('Fecha de siembra *')).toHaveValue('2024-02-29');
  });
  it('registra una siembra sin cosecha y muestra historial con fechas civiles', async () => {
    let filas: typeof siembra[] = [];
    const solicitar = simular((url, opciones) => {
      if (!url.pathname.endsWith('/siembras')) return;
      if (opciones.method === 'POST') { filas = [siembra]; return respuesta(siembra, 201); }
      return respuesta(filas);
    });
    mostrar(`/terrenos/${idTerreno}`);
    await screen.findByRole('button', { name: 'Guardar siembra' });
    await userEvent.selectOptions(screen.getByLabelText('Cultivo *'), 'papa');
    fireEvent.change(screen.getByLabelText('Fecha de siembra *'), { target: { value: '2024-02-29' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }));
    expect(await screen.findByText('La siembra se guardó correctamente.')).toBeInTheDocument();
    expect(await screen.findByText('29/02/2024')).toBeInTheDocument();
    expect(screen.getByText('Sin registrar')).toBeInTheDocument();
    const escritura = solicitar.mock.calls.find(([, opciones]) => opciones.method === 'POST');
    expect(JSON.parse(escritura?.[1].body ?? '{}')).toEqual({ cultivo_id: 'papa', fecha_siembra: '2024-02-29', fecha_cosecha: null, notas: null });
  });
  it('edita y elimina una siembra existente', async () => {
    let filas = [siembra];
    simular((url, opciones) => {
      if (url.pathname.endsWith(`/siembras/${idSiembra}`) && opciones.method === 'PUT') { filas = [{ ...siembra, notas: 'Actualizada' }]; return respuesta(filas[0]); }
      if (url.pathname.endsWith(`/siembras/${idSiembra}`) && opciones.method === 'DELETE') { filas = []; return respuesta(null, 204); }
      return url.pathname.endsWith('/siembras') ? respuesta(filas) : undefined;
    });
    mostrar(`/terrenos/${idTerreno}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar siembra de Papa' }));
    await userEvent.type(screen.getByLabelText('Notas (opcional)'), 'Actualizada');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar siembra' }));
    expect(await screen.findByText('Actualizada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar siembra de Papa' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText('La siembra se eliminó correctamente.')).toBeInTheDocument();
  });
  it('el técnico ve datos e historial sin controles de escritura', async () => {
    simular(undefined, { ...usuario, rol: 'tecnico' });
    mostrar(`/terrenos/${idTerreno}`);
    await screen.findByRole('heading', { name: terreno.nombre, level: 1 });
    expect(screen.queryByRole('link', { name: 'Editar terreno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar terreno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar siembra' })).not.toBeInTheDocument();
  });
  it('una respuesta de terrenos de la sesión anterior no aparece en otra cuenta', async () => {
    const pendiente = Promise.withResolvers<Response>();
    const tokenNuevo = `fixture.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 800 }))}.nueva-sesion`;
    const otraPersona = { ...usuario, id: '00000000-0000-4000-8000-000000000004', nombre: 'Otra persona' };
    simular((url, opciones) => {
      const esNueva = new Headers(opciones.headers).get('Authorization') === `Bearer ${tokenNuevo}`;
      if (url.pathname.endsWith('/login')) return respuesta({ token: tokenNuevo, usuario: otraPersona });
      if (url.pathname.endsWith('/yo')) return respuesta(esNueva ? otraPersona : usuario);
      return url.pathname === '/api/terrenos' ? esNueva ? respuesta([]) : pendiente.promise : undefined;
    });
    const { cliente } = mostrar('/terrenos');
    await screen.findByRole('heading', { name: 'Mis terrenos' });
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await userEvent.type(screen.getByLabelText('Correo electrónico *'), usuario.email);
    await userEvent.type(screen.getByLabelText('Contraseña *'), 'clave-solo-fixture');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi cuenta' }));
    await screen.findByRole('heading', { name: 'Bienvenido, Otra persona.' });
    await userEvent.click(screen.getByRole('link', { name: 'Mis terrenos' }));
    await screen.findByRole('heading', { name: 'Tu primera parcela empieza aquí' });
    await act(async () => { pendiente.resolve(respuesta([terreno])); });
    expect(screen.queryByRole('heading', { name: terreno.nombre })).not.toBeInTheDocument();
    expect(cliente.getQueryData(['agricultura', idUsuario, 'terrenos'])).toBeUndefined();
  });
});
