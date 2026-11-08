import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorApi, obtenerUsuario } from '../lib/api';
import { ContextoSesion } from '../lib/useSesion';

const CLAVE_SESION = 'rotaandes.sesion';
function leerToken(): string | null { try { return sessionStorage.getItem(CLAVE_SESION); } catch { return null; } }
function obtenerVencimiento(token: string): number {
  try {
    const parte = token.split('.')[1];
    if (!parte) return 0;
    const datos: unknown = JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof datos === 'object' && datos !== null && 'exp' in datos && typeof datos.exp === 'number' ? datos.exp * 1000 : 0;
  } catch { return 0; }
}
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const cliente = useQueryClient();
  const [token, establecerToken] = useState(leerToken);
  const tokenActual = useRef(token);
  const [confirmando, establecerConfirmando] = useState(false);
  const generacion = useRef(0);
  const cerrarSesion = useCallback((tokenEsperado?: string) => {
    if (tokenEsperado !== undefined && tokenActual.current !== tokenEsperado) return;
    generacion.current++;
    tokenActual.current = null;
    try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* También se elimina la sesión en memoria. */ }
    establecerToken(null); establecerConfirmando(false);
    void cliente.cancelQueries(); cliente.clear();
  }, [cliente]);
  const consulta = useQuery({ queryKey: ['sesion', 'usuario'], enabled: Boolean(token), retry: false, staleTime: 0, refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      if (!token) throw new ErrorApi('Inicia sesión.');
      try { return await obtenerUsuario(token, signal); }
      catch (error: unknown) { if (error instanceof ErrorApi && error.codigoHttp === 401 && !signal.aborted) cerrarSesion(token); throw error; }
    } });
  useEffect(() => {
    if (!token) return;
    const temporizador = window.setTimeout(cerrarSesion, Math.max(0, Math.min(obtenerVencimiento(token) - Date.now(), 900_000)));
    return () => window.clearTimeout(temporizador);
  }, [token, cerrarSesion]);
  async function confirmarSesion(nuevoToken: string): Promise<void> {
    const actual = ++generacion.current;
    establecerConfirmando(true);
    try {
      await cliente.cancelQueries(); cliente.clear();
      const usuario = await obtenerUsuario(nuevoToken);
      if (actual !== generacion.current) throw new ErrorApi('La sesión fue cancelada.');
      if (obtenerVencimiento(nuevoToken) <= Date.now()) throw new ErrorApi('La sesión ha vencido.');
      try { sessionStorage.setItem(CLAVE_SESION, nuevoToken); } catch { throw new ErrorApi('Permite el almacenamiento de sesión en este navegador para continuar.'); }
      tokenActual.current = nuevoToken;
      cliente.setQueryData(['sesion', 'usuario'], usuario); establecerToken(nuevoToken);
    } finally { if (actual === generacion.current) establecerConfirmando(false); }
  }
  return <ContextoSesion.Provider value={{ token, usuario: token && !consulta.isError ? consulta.data : undefined,
    estaValidando: confirmando || Boolean(token && consulta.isPending), error: token && consulta.isError ? consulta.error.message : null,
    confirmarSesion, cerrarSesion, guardarPerfil: (usuario, tokenSolicitud) => {
      if (tokenActual.current === tokenSolicitud) cliente.setQueryData(['sesion', 'usuario'], usuario);
    }, reintentar: () => { void consulta.refetch(); } }}>{children}</ContextoSesion.Provider>;
}
