import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Aplicacion } from './Aplicacion';
import { ProveedorSesion } from './components/ProveedorSesion';
import './estilos.css';

const elementoRaiz = document.getElementById('root');
if (!elementoRaiz) throw new Error('No se encontró el elemento raíz de la aplicación.');

const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

createRoot(elementoRaiz).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <BrowserRouter><ProveedorSesion><Aplicacion /></ProveedorSesion></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
