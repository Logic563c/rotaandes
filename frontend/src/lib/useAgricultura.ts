import { ErrorApi } from './api';
import { useSesion } from './useSesion';

export function useAgricultura() {
  const sesion = useSesion();
  const token = sesion.token;
  async function ejecutar<T>(accion: (token: string) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!token) throw new ErrorApi('Inicia sesión para continuar.', 401);
    try {
      const resultado = await accion(token);
      if (!sesion.esSesionActual(token) || signal?.aborted) throw new DOMException('La sesión cambió.', 'AbortError');
      return resultado;
    } catch (error: unknown) {
      if (!signal?.aborted && error instanceof ErrorApi && error.codigoHttp === 401) sesion.cerrarSesion(token);
      throw error;
    }
  }
  return { usuario: sesion.usuario, token, ejecutar, sigueActiva: () => Boolean(token && sesion.esSesionActual(token)), clave: ['agricultura', sesion.usuario?.id ?? ''] as const };
}
