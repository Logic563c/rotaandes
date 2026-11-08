import { createContext, useContext } from 'react';
import type { UsuarioPublico } from '../types/api';

export interface Sesion {
  usuario: UsuarioPublico | undefined;
  token: string | null;
  estaValidando: boolean;
  error: string | null;
  confirmarSesion: (token: string) => Promise<void>;
  cerrarSesion: (tokenEsperado?: string) => void;
  reintentar: () => void;
  guardarPerfil: (usuario: UsuarioPublico, tokenSolicitud: string) => void;
  esSesionActual: (tokenSolicitud: string) => boolean;
}

export const ContextoSesion = createContext<Sesion | null>(null);

export function useSesion(): Sesion {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error('Falta el proveedor de sesión.');
  return contexto;
}
