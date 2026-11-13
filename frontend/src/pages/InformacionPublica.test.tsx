import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacion } from '../Aplicacion';
import { ProveedorSesion } from '../components/ProveedorSesion';
import { ContextoSesion } from '../lib/useSesion';
import { Marco } from '../components/Marco';
const clientes: QueryClient[] = [];
function mostrar(ruta: string) { const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente); render(<QueryClientProvider client={cliente}><MemoryRouter initialEntries={[ruta]}><ProveedorSesion><Aplicacion /></ProveedorSesion></MemoryRouter></QueryClientProvider>); }
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; sessionStorage.clear(); });
describe('Información pública, comprensión y rutas', () => {
  it.each([['/glosario', 'Glosario agrícola y climático'], ['/fuentes', 'Fuentes de información'], ['/acerca-de', 'Fuentes de información']])('abre %s sin sesión ni llamadas privadas', async (ruta, titulo) => {
    const solicitar = vi.fn(); vi.stubGlobal('fetch', solicitar); mostrar(ruta); expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument(); expect(solicitar).not.toHaveBeenCalled(); expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro');
  });
  it('busca sin tildes, conserva ejemplos y permite recuperar una búsqueda vacía', async () => {
    mostrar('/glosario'); const campo = await screen.findByRole('searchbox', { name: 'Buscar una palabra' }); expect(screen.getAllByRole('term')).toHaveLength(15);
    await userEvent.type(campo, 'evapotranspiracion'); expect(screen.getAllByRole('term')).toHaveLength(1); expect(screen.getByRole('term')).toHaveTextContent('Evapotranspiración');
    await userEvent.clear(campo); await userEvent.type(campo, 'palabra inexistente zz'); expect(screen.getByRole('status')).toHaveTextContent('0 de 15'); await userEvent.click(screen.getByRole('button', { name: 'Mostrar todos los términos' })); expect(screen.getAllByRole('term')).toHaveLength(15); expect(campo).toHaveFocus();
  });
  it('distingue imágenes, modelado y reglas sin ocultar el GeoJSON pendiente', async () => {
    mostrar('/fuentes'); await screen.findByRole('heading', { level: 1 }); const contenido = screen.getByRole('main');
    for (const texto of ['GeoJSON analítico', 'pendiente', 'no son predicciones', 'OpenStreetMap contributors', 'no sustituye']) expect(contenido.textContent).toContain(texto);
    const creditos = within(contenido).getByRole('region', { name: 'Créditos de las fotografías' });
    // Las seis fuentes de datos conservan un enlace oficial cada una; los créditos fotográficos se comprueban aparte.
    const enlaces = within(contenido).getAllByRole('link').filter((enlace) => enlace.getAttribute('href')?.startsWith('https:') && !creditos.contains(enlace)); expect(enlaces.length).toBe(6); expect(enlaces.every((enlace) => !new URL(enlace.getAttribute('href') ?? '').username)).toBe(true);
    const enlacesCreditos = within(creditos).getAllByRole('link'); expect(enlacesCreditos).toHaveLength(10);
    expect(enlacesCreditos.every((enlace) => /^https:\/\/(commons\.wikimedia\.org|creativecommons\.org)\//.test(enlace.getAttribute('href') ?? '') && !new URL(enlace.getAttribute('href') ?? '').username)).toBe(true);
    for (const autor of ['David Ceballos', 'Arabsalam', 'Gideoraielgave']) expect(creditos.textContent).toContain(autor);
  });
  it('permite ir desde la landing al glosario y fuentes aunque falle el backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('red'))); mostrar('/'); await screen.findByRole('button', { name: 'Reintentar conexión' });
    await userEvent.click(screen.getByRole('link', { name: '¿Una palabra nueva? Abre el glosario' })); await screen.findByRole('heading', { name: 'Glosario agrícola y climático' }); await userEvent.click(screen.getByRole('link', { name: 'Fuentes' })); expect(await screen.findByRole('heading', { name: 'Fuentes de información' })).toBeInTheDocument();
  });
  it.each(['agricultor', 'tecnico'] as const)('mantiene navegación de lectura pública y permisos de %s', (rol) => {
    render(<MemoryRouter><ContextoSesion.Provider value={{ usuario: { id: 'fixture', nombre: 'Prueba', email: 'fixture@example.invalid', rol, parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null }, token: 'fixture', estaValidando: false, error: null, confirmarSesion: async () => {}, cerrarSesion: () => {}, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: () => true }}><Marco><h1>Prueba de navegación</h1></Marco></ContextoSesion.Provider></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Glosario' })).toBeInTheDocument(); expect(Boolean(screen.queryByRole('link', { name: 'Panel técnico' }))).toBe(rol === 'tecnico'); expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });
});
