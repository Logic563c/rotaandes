import { describe, expect, it, vi } from 'vitest';
import { crearServicioElevacion } from '../src/services/elevacion.js';

describe('Elevación Open-Meteo', () => {
  it('rechaza coordenadas inválidas antes de consultar el proveedor', async () => {
    const solicitar = vi.fn<typeof fetch>();
    const obtener = crearServicioElevacion(solicitar);
    expect(await obtener(91, 0)).toBeNull();
    expect(await obtener(0, Number.NaN)).toBeNull();
    expect(solicitar).not.toHaveBeenCalled();
  });
  it('consulta el proveedor fijo, redondea y reutiliza la caché', async () => {
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ elevation: [2775.4] })));
    const obtener = crearServicioElevacion(solicitar);
    expect(await obtener(-0.93, -78.62)).toBe(2775);
    expect(await obtener(-0.93, -78.62)).toBe(2775);
    expect(solicitar).toHaveBeenCalledTimes(1);
    expect(solicitar).toHaveBeenCalledWith(new URL('https://api.open-meteo.com/v1/elevation?latitude=-0.93&longitude=-78.62'), expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }));
  });
  it.each([{}, null, { elevation: [] }, { elevation: [null] }, { elevation: ['2775'] }, { elevation: [1, 2] }, { elevation: [10000] }, { elevation: [-13000] }])('no inventa altitud ante una respuesta incompleta o inválida (%#)', async (datos) => {
    expect(await crearServicioElevacion(async () => new Response(JSON.stringify(datos)))(0, 0)).toBeNull();
  });
  it.each([400, 429, 500, 503])('tolera HTTP %i', async (status) => {
    expect(await crearServicioElevacion(async () => new Response('{}', { status }))(0, 0)).toBeNull();
  });
  it('tolera error de red, JSON inválido y una respuesta excesiva', async () => {
    expect(await crearServicioElevacion(async () => { throw new TypeError('red'); })(0, 0)).toBeNull();
    expect(await crearServicioElevacion(async () => new Response('<html>'))(0, 0)).toBeNull();
    expect(await crearServicioElevacion(async () => new Response('x'.repeat(4097)))(0, 0)).toBeNull();
  });
  it('interrumpe de verdad una solicitud que supera cinco segundos', async () => {
    const solicitar: typeof fetch = async (_entrada, opciones) => new Promise((_resolver, rechazar) => {
      opciones?.signal?.addEventListener('abort', () => rechazar(new DOMException('Tiempo agotado', 'AbortError')), { once: true });
    });
    expect(await crearServicioElevacion(solicitar)(0, 0)).toBeNull();
  }, 8000);
  it('limita solicitudes y reabre el cupo al terminar el minuto', async () => {
    let ahora = 0;
    const solicitar = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{"elevation":[1]}'));
    const obtener = crearServicioElevacion(solicitar, () => ahora);
    for (let indice = 0; indice < 20; indice++) expect(await obtener(indice, 0)).toBe(1);
    expect(await obtener(21, 0)).toBeNull();
    expect(solicitar).toHaveBeenCalledTimes(20);
    ahora = 61000;
    expect(await obtener(21, 0)).toBe(1);
  });
  it('deduplica peticiones simultáneas y limita concurrencia', async () => {
    const pendientes = [Promise.withResolvers<Response>(), Promise.withResolvers<Response>()];
    let indice = 0;
    const solicitar = vi.fn<typeof fetch>().mockImplementation(() => pendientes[indice++]?.promise ?? Promise.resolve(new Response('{}')));
    const obtener = crearServicioElevacion(solicitar);
    const primera = obtener(1, 0);
    const duplicada = obtener(1, 0);
    const segunda = obtener(2, 0);
    expect(await obtener(3, 0)).toBeNull();
    pendientes.forEach((pendiente) => pendiente.resolve(new Response('{"elevation":[100]}')));
    expect(await Promise.all([primera, duplicada, segunda])).toEqual([100, 100, 100]);
    expect(solicitar).toHaveBeenCalledTimes(2);
  });
});
