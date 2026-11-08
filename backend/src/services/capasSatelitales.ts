import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { construirUrlCapa, TAMANIO_IMAGEN_CAPA } from '../data/catalogoCapas.js';
import type { ConsultaCapa } from '../data/catalogoCapas.js';

const MAXIMO_BYTES = 2 * 1024 * 1024;
export class ErrorCapaSatelital extends Error { constructor() { super('No se pudo obtener una visualización fiable de NASA GIBS. Reintenta la consulta.'); } }
export function validarImagenCapa(bytes: Buffer): boolean {
  try {
    if (bytes.length < 33 || bytes.length > MAXIMO_BYTES || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13 || bytes.readUInt32BE(16) !== TAMANIO_IMAGEN_CAPA.ancho || bytes.readUInt32BE(20) !== TAMANIO_IMAGEN_CAPA.alto || bytes[28] !== 0) throw new ErrorCapaSatelital();
    const imagen = PNG.sync.read(bytes, { checkCRC: true });
    for (let indice = 3; indice < imagen.data.length; indice += 4) if (imagen.data[indice] !== 0) return true;
    return false;
  } catch { throw new ErrorCapaSatelital(); }
}
export interface ImagenCapa { bytes: Buffer; visible: boolean; sha256: string; consultado_en: string; origen: 'gibs' | 'cache' }
export type ServicioCapas = (consulta: ConsultaCapa) => Promise<ImagenCapa>;
export function crearServicioCapas(solicitar: typeof fetch = fetch, reloj: () => number = Date.now): ServicioCapas {
  const cache = new Map<string, { valor: ImagenCapa; instante: number }>(); const pendientes = new Map<string, Promise<ImagenCapa>>();
  const fallos = new Map<string, number>(); let llamadas: number[] = []; let memoria = 0;
  return async (consulta) => {
    const clave = construirUrlCapa(consulta); const ahora = reloj(); const anterior = cache.get(clave);
    if (anterior && ahora - anterior.instante < 86400000) { cache.delete(clave); cache.set(clave, anterior); return { ...anterior.valor, origen: 'cache' }; }
    if (anterior) { memoria -= anterior.valor.bytes.length; cache.delete(clave); }
    const pendiente = pendientes.get(clave); if (pendiente) return pendiente;
    for (const [id, instante] of fallos) if (ahora - instante >= 30000) fallos.delete(id);
    llamadas = llamadas.filter((instante) => ahora - instante < 3600000);
    if (fallos.has(clave) || pendientes.size >= 2 || llamadas.length >= 120 || llamadas.filter((instante) => ahora - instante < 60000).length >= 20) throw new ErrorCapaSatelital();
    llamadas.push(ahora);
    const accion = Promise.resolve().then(async (): Promise<ImagenCapa> => {
      try {
        const respuesta = await solicitar(clave, { headers: { Accept: 'image/png' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
        if (!respuesta.ok || respuesta.headers.get('content-type')?.split(';')[0]?.trim() !== 'image/png' || Number(respuesta.headers.get('content-length') ?? 0) > MAXIMO_BYTES || !respuesta.body) throw new ErrorCapaSatelital();
        const lector = respuesta.body.getReader(); const partes: Uint8Array[] = []; let tamanio = 0;
        try { for (;;) { const parte = await lector.read(); if (parte.done) break; tamanio += parte.value.length; if (tamanio > MAXIMO_BYTES) { await lector.cancel(); throw new ErrorCapaSatelital(); } partes.push(parte.value); } }
        finally { lector.releaseLock(); }
        const bytes = Buffer.concat(partes); const visible = validarImagenCapa(bytes);
        const valor: ImagenCapa = { bytes, visible, sha256: createHash('sha256').update(bytes).digest('hex'), consultado_en: new Date(reloj()).toISOString(), origen: 'gibs' };
        cache.set(clave, { valor, instante: reloj() }); memoria += bytes.length;
        while (cache.size > 32 || memoria > 16 * 1024 * 1024) { const primera = cache.keys().next().value; if (!primera) break; memoria -= cache.get(primera)?.valor.bytes.length ?? 0; cache.delete(primera); }
        return valor;
      } catch { fallos.set(clave, reloj()); throw new ErrorCapaSatelital(); }
      finally { pendientes.delete(clave); }
    });
    pendientes.set(clave, accion); return accion;
  };
}
