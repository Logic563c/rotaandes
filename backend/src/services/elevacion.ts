import { z } from 'zod';

export type ObtenerAltitud = (latitud: number, longitud: number) => Promise<number | null>;
const esquemaElevacion = z.object({ elevation: z.tuple([z.number().finite().min(-12000).max(9000)]) });

export function crearServicioElevacion(solicitar: typeof fetch = fetch, reloj: () => number = Date.now): ObtenerAltitud {
  const cache = new Map<string, { altitud: number | null; vence: number }>();
  const pendientes = new Map<string, Promise<number | null>>();
  let ventana = reloj();
  let solicitudes = 0;
  let activas = 0;

  async function consultar(latitud: number, longitud: number): Promise<number | null> {
    const ahora = reloj();
    if (ahora - ventana >= 60000) { ventana = ahora; solicitudes = 0; }
    if (solicitudes >= 20 || activas >= 2) return null;
    solicitudes++; activas++;
    try {
      const url = new URL('https://api.open-meteo.com/v1/elevation');
      url.searchParams.set('latitude', String(latitud));
      url.searchParams.set('longitude', String(longitud));
      const respuesta = await solicitar(url, { signal: AbortSignal.timeout(5000), redirect: 'error', headers: { Accept: 'application/json' } });
      if (!respuesta.ok) { await respuesta.body?.cancel(); return null; }
      if (!respuesta.body) return null;
      const lector = respuesta.body.getReader();
      const partes: Uint8Array[] = [];
      let longitudTotal = 0;
      try {
        while (true) {
          const parte = await lector.read();
          if (parte.done) break;
          longitudTotal += parte.value.byteLength;
          if (longitudTotal > 4096) { await lector.cancel(); return null; }
          partes.push(parte.value);
        }
      } finally { lector.releaseLock(); }
      const datos: unknown = JSON.parse(Buffer.concat(partes).toString('utf8'));
      const resultado = esquemaElevacion.safeParse(datos);
      return resultado.success ? Math.round(resultado.data.elevation[0]) : null;
    } catch {
      return null;
    } finally { activas--; }
  }

  return async (latitud, longitud) => {
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return null;
    const clave = `${latitud}:${longitud}`;
    const existente = cache.get(clave);
    if (existente && existente.vence > reloj()) return existente.altitud;
    const pendiente = pendientes.get(clave);
    if (pendiente) return pendiente;
    const consulta = consultar(latitud, longitud).then((altitud) => {
      if (cache.size >= 500) { const primera = cache.keys().next().value; if (primera !== undefined) cache.delete(primera); }
      cache.set(clave, { altitud, vence: reloj() + (altitud === null ? 30000 : 86400000) });
      return altitud;
    }).finally(() => { pendientes.delete(clave); });
    pendientes.set(clave, consulta);
    return consulta;
  };
}
