import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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
});
