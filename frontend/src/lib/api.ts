import type { RespuestaSalud } from '../types/api';

class ErrorApi extends Error {}

function obtenerUrlSalud(): URL {
  let urlBase: URL;
  try {
    urlBase = new URL(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');
  } catch (error: unknown) {
    throw new ErrorApi('La dirección del servicio no está configurada correctamente.', { cause: error });
  }
  if (!['http:', 'https:'].includes(urlBase.protocol) || urlBase.username || urlBase.password
    || urlBase.search || urlBase.hash || urlBase.pathname !== '/') {
    throw new ErrorApi('La dirección del servicio no está configurada correctamente.');
  }
  return new URL('/api/health', urlBase);
}

export async function obtenerEstadoServicio(senalExterna?: AbortSignal): Promise<RespuestaSalud> {
  try {
    const url = obtenerUrlSalud();
    const senalTiempo = AbortSignal.timeout(8000);
    const senal = senalExterna ? AbortSignal.any([senalExterna, senalTiempo]) : senalTiempo;
    const respuesta = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: senal,
    });

    if (!respuesta.ok) {
      throw new ErrorApi('El servicio no está disponible en este momento. Vuelve a intentarlo.');
    }

    const datos: unknown = await respuesta.json();
    if (typeof datos !== 'object' || datos === null || !('ok' in datos) || datos.ok !== true) {
      throw new ErrorApi('No pudimos confirmar el estado del servicio. Vuelve a intentarlo.');
    }
    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof ErrorApi) throw error;
    throw new Error('No pudimos conectar con RotaAndes. Comprueba tu conexión y vuelve a intentarlo.', { cause: error });
  }
}
