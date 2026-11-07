import { describe, expect, it, vi } from 'vitest';
import { obtenerEstadoServicio } from './api';

describe('Cliente de la API', () => {
  it('consulta el endpoint real del contrato usando VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    const solicitar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal('fetch', solicitar);
    await expect(obtenerEstadoServicio()).resolves.toEqual({ ok: true });
    expect(solicitar).toHaveBeenCalledWith(new URL('http://localhost:3000/api/health'), expect.objectContaining({
      method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' },
    }));
  });

  it.each([{ ok: false }, {}, null, 'disponible'])(
    'rechaza una respuesta fuera del contrato: %j', async (datos) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(datos))));
      await expect(obtenerEstadoServicio()).rejects.toThrow('No pudimos confirmar');
    },
  );

  it('maneja errores HTTP sin exponer el cuerpo interno', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('detalle privado', { status: 500 })));
    await expect(obtenerEstadoServicio()).rejects.toThrow('El servicio no está disponible');
  });

  it('maneja un servicio inaccesible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(obtenerEstadoServicio()).rejects.toThrow('No pudimos conectar');
  });

  it('maneja una respuesta que no es JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>')));
    await expect(obtenerEstadoServicio()).rejects.toThrow('No pudimos conectar');
  });

  it.each(['', 'no-es-url', 'file:///tmp/servicio', 'https://usuario:clave@ejemplo.com', 'http://localhost:3000/api'])(
    'rechaza una dirección base inválida: %s', async (direccion) => {
      vi.stubEnv('VITE_API_URL', direccion);
      const solicitar = vi.fn();
      vi.stubGlobal('fetch', solicitar);
      await expect(obtenerEstadoServicio()).rejects.toThrow('dirección del servicio');
      expect(solicitar).not.toHaveBeenCalled();
    },
  );
});
