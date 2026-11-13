import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Inicio } from './Inicio';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorSesion } from '../components/ProveedorSesion';

const clientes: QueryClient[] = [];

function mostrarInicio() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clientes.push(cliente);
  render(<QueryClientProvider client={cliente}><MemoryRouter><ProveedorSesion><Inicio /></ProveedorSesion></MemoryRouter></QueryClientProvider>);
}

afterEach(() => {
  for (const cliente of clientes) cliente.clear();
  clientes.length = 0;
});

describe('Página inicial', () => {
  it('muestra carga y después confirma la conexión', async () => {
    const solicitudPendiente = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(solicitudPendiente.promise));
    mostrarInicio();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Conoce tu terreno, comprende el clima');
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando conexión');
    expect(screen.getByRole('button', { name: 'Comprobando…' })).toBeDisabled();
    solicitudPendiente.resolve(new Response(JSON.stringify({ ok: true })));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Conexión disponible'));
    expect(screen.getByRole('button', { name: 'Volver a comprobar' })).toBeEnabled();
  });

  it('permite recuperarse de un fallo de red con el botón de reintento', async () => {
    const solicitar = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal('fetch', solicitar);
    mostrarInicio();
    const boton = await screen.findByRole('button', { name: 'Reintentar conexión' });
    expect(screen.getByRole('status')).toHaveTextContent('No pudimos conectar');
    await userEvent.click(boton);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Conexión disponible'));
    expect(solicitar).toHaveBeenCalledTimes(2);
  });
  it('muestra fotografías agrícolas con descripción, crédito y licencia, cargadas de forma diferida', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
    mostrarInicio();
    // Las dos fotos de la sección «Cada lote es distinto» conservan su descripción, carga diferida y versiones.
    const seccion = screen.getByRole('region', { name: 'Cada lote es distinto' });
    const fotos = within(seccion).getAllByRole('img').filter((imagen) => imagen.getAttribute('src')?.startsWith('/imagenes/'));
    expect(fotos).toHaveLength(2);
    for (const foto of fotos) { expect(foto.getAttribute('alt')?.length).toBeGreaterThan(30); expect(foto).toHaveAttribute('loading', 'lazy'); expect(foto.getAttribute('srcset')).toContain('1280w'); }
    expect(within(seccion).getAllByRole('link', { name: 'CC BY-SA 4.0' })).toHaveLength(2);
    expect(within(seccion).getByText(/Foto: Gideoraielgave/)).toBeInTheDocument(); expect(within(seccion).getByText(/Foto: Arabsalam/)).toBeInTheDocument();
    // Portada: composición con foto real descrita y fondo fotográfico decorativo (oculto a lectores de pantalla), ambos acreditados.
    const composicion = screen.getByRole('img', { name: /Campos verdes e invernaderos/ });
    expect(composicion.getAttribute('srcset')).toContain('1200w');
    const fondo = document.querySelector('.portada-foto img');
    expect(fondo).toHaveAttribute('alt', ''); expect(fondo?.closest('[aria-hidden="true"]')).not.toBeNull(); expect(fondo?.getAttribute('srcset')).toContain('1600w');
    expect(screen.getByRole('link', { name: 'CC BY 2.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/2.0/deed.es');
    expect(screen.getByText(/Foto: David Ceballos/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'CC BY-SA 4.0' })).toHaveLength(3);
  });
  it('conserva las fotografías y acciones con una portada estática, sin control de pausa ni depender de preferencias anteriores', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
    window.localStorage.setItem('rotaandes:movimiento-portada', 'pausado');
    mostrarInicio();
    expect(document.querySelector('.portada-fotografica')).toBeInTheDocument();
    expect(document.querySelector('.portada-fotografica')).not.toHaveAttribute('data-movimiento');
    expect(screen.queryByRole('button', { name: /movimiento del fondo/ })).not.toBeInTheDocument();
    expect(document.querySelector('.portada-foto img')).toHaveAttribute('alt', '');
    expect(screen.getByRole('img', { name: /Campos verdes e invernaderos/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear mi cuenta' })).toHaveAttribute('href', '/registro');
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(window.localStorage.getItem('rotaandes:movimiento-portada')).toBe('pausado');
    window.localStorage.removeItem('rotaandes:movimiento-portada');
  });
});
