import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { describe, expect, it, vi } from 'vitest';
import { construirUrlCapa, fechasDisponiblesCapa, LIMITES_CAPAS, metadatosCapa, PRODUCTOS_CAPAS, validarConsultaCapa } from '../src/data/catalogoCapas.js';
import { crearServicioCapas, ErrorCapaSatelital, validarImagenCapa } from '../src/services/capasSatelitales.js';
import procedencia from './fixtures/satelites/procedencia.json' with { type: 'json' };

const consulta = validarConsultaCapa('ndvi', { anio: '2023', mes: '1' });
const imagen = readFileSync(new URL('./fixtures/satelites/ndvi-2023-01-01.png', import.meta.url));
const responder = () => new Response(new Uint8Array(imagen), { headers: { 'Content-Type': 'image/png' } });
describe('Capas: catálogo, fechas, geometría del recorte y fuentes reales archivadas', () => {
  it('conserva productos/resoluciones/unidades y distingue imagen de análisis mensual', () => {
    expect(PRODUCTOS_CAPAS.ndvi).toMatchObject({ producto: 'MOD13Q1', version_catalogo: '061', resolucion_m: 250, escala_original: 0.0001, relleno_original: -3000 });
    expect(PRODUCTOS_CAPAS.humedad_suelo).toMatchObject({ producto: 'SPL3SMP_E', version_catalogo: '006', resolucion_m: 9000, unidad: 'm³/m³', relleno_original: -9999 });
    expect(metadatosCapa(consulta)).toMatchObject({ formato: 'WMS_PNG', fecha: '2023-01-01', fin_composicion: '2023-01-16' });
    expect(metadatosCapa(consulta).procesamiento).toContain('Sin agregación mensual');
  });
  it('calcula meses, bisiestos y composiciones de fin de año sin desplazar fechas', () => {
    expect(fechasDisponiblesCapa('ndvi', 2023, 3)).toEqual(['2023-03-06', '2023-03-22']);
    expect(fechasDisponiblesCapa('ndvi', 2024, 3)).toEqual(['2024-03-05', '2024-03-21']);
    expect(fechasDisponiblesCapa('humedad_suelo', 2024, 2)).toHaveLength(29);
    expect(fechasDisponiblesCapa('humedad_suelo', 2023, 2)).toHaveLength(28);
    expect(metadatosCapa(validarConsultaCapa('ndvi', { anio: '2024', mes: '12', fecha: '2024-12-18' })).fin_composicion).toBe('2024-12-31');
  });
  it.each([
    ['tipo', 'otro', { anio: '2023', mes: '1' }], ['año', 'ndvi', { anio: '2025', mes: '1' }], ['mes cero', 'ndvi', { anio: '2023', mes: '0' }], ['mes alto', 'ndvi', { anio: '2023', mes: '13' }],
    ['vacío', 'ndvi', { anio: '2023', mes: '' }], ['duplicado', 'ndvi', { anio: '2023', mes: ['1', '2'] }], ['URL ajena', 'ndvi', { anio: '2023', mes: '1', url: 'https://example.invalid' }],
    ['fecha inexistente', 'humedad_suelo', { anio: '2023', mes: '2', fecha: '2023-02-29' }], ['otro mes', 'ndvi', { anio: '2023', mes: '1', fecha: '2023-02-02' }], ['fuera de composición', 'ndvi', { anio: '2023', mes: '1', fecha: '2023-01-02' }],
  ])('rechaza %s', (_caso, tipo, parametros) => { expect(() => validarConsultaCapa(tipo, parametros)).toThrow(); });
  it('el recorte EPSG:3857 corresponde a los límites WGS84 y nunca acepta una URL del navegador', () => {
    const url = new URL(construirUrlCapa(consulta)); expect(url.hostname).toBe('gibs.earthdata.nasa.gov'); expect(url.searchParams.get('CRS')).toBe('EPSG:3857');
    const bbox = url.searchParams.get('BBOX')?.split(',').map(Number); if (!bbox || bbox.length !== 4) throw new Error();
    expect(bbox[0]).toBeCloseTo(-8844333.5435, 3); expect(bbox[1]).toBeCloseTo(-144727.7563, 3); expect(bbox[2]).toBeCloseTo(-8716316.1291, 3); expect(bbox[3]).toBeCloseTo(-33395.9998, 3);
    expect(LIMITES_CAPAS).toEqual([-79.45, -1.3, -78.3, -0.3]);
  });
  it('las dos imágenes reales tienen procedencia, SHA y píxeles visibles, sin deducir valores de colores', () => {
    expect(procedencia).toHaveLength(2);
    for (const fuente of procedencia) {
      const bytes = readFileSync(new URL(`./fixtures/satelites/${fuente.archivo}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(fuente.sha256); expect(validarImagenCapa(bytes)).toBe(true);
      expect(construirUrlCapa(validarConsultaCapa(fuente.tipo, { anio: '2023', mes: '1', fecha: fuente.fecha }))).toBe(fuente.url);
    }
  });
  it.each(['ndvi', 'humedad_suelo'] as const)('los colores de referencia de %s coinciden con la paleta oficial archivada', (tipo) => {
    const xml = readFileSync(new URL(`./fixtures/satelites/paleta-${tipo}.xml`, import.meta.url), 'utf8');
    const entradas = [...xml.matchAll(/<ColorMapEntry\s+([^>]+)\/>/g)].map((coincidencia): Record<string, string> => Object.fromEntries<string>([...(coincidencia[1] ?? '').matchAll(/(\w+)="([^"]*)"/g)].map((valor) => [valor[1] ?? '', valor[2] ?? ''])));
    PRODUCTOS_CAPAS[tipo].valores_leyenda.forEach((objetivo, indice) => {
      const entrada = entradas.find((valor) => { const rango = /^\[([^,]+),([^\]]+)\)/.exec(valor.value ?? ''); return rango && valor.transparent === 'false' && objetivo >= Number(rango[1]) && objetivo < Number(rango[2]); });
      expect(entrada?.rgb?.split(',').map((valor) => Number(valor).toString(16).padStart(2, '0')).join('')).toBe(PRODUCTOS_CAPAS[tipo].colores[indice]?.slice(1));
    });
  });
});

describe('GIBS: PNG, caché acotada, deduplicación y errores controlados', () => {
  it('PNG transparente no se confunde con una medición cero', () => {
    const vacia = PNG.sync.write(new PNG({ width: 920, height: 800 })); expect(validarImagenCapa(vacia)).toBe(false);
    expect(validarImagenCapa(imagen)).toBe(true);
  });
  it.each(['firma', 'tamaño', 'CRC', 'interlazada', 'excesiva'])('rechaza imagen %s', (caso) => {
    let bytes = Buffer.from(imagen);
    if (caso === 'firma') bytes[0] = 0;
    if (caso === 'tamaño') bytes.writeUInt32BE(99999, 16);
    if (caso === 'CRC') bytes[32] = (bytes[32] ?? 0) ^ 1;
    if (caso === 'interlazada') bytes[28] = 1;
    if (caso === 'excesiva') bytes = Buffer.alloc(2097153);
    expect(() => validarImagenCapa(bytes)).toThrow(ErrorCapaSatelital);
  });
  it('deduplica y reutiliza solo la misma fecha/recorte durante 24 horas', async () => {
    let ahora = Date.parse('2030-01-01T00:00:00Z'); const solicitar = vi.fn(async () => responder()); const servicio = crearServicioCapas(solicitar, () => ahora);
    const [primera, segunda] = await Promise.all([servicio(consulta), servicio(consulta)]); expect(segunda.sha256).toBe(primera.sha256); expect(solicitar).toHaveBeenCalledOnce();
    expect((await servicio(consulta)).origen).toBe('cache'); ahora += 86400000; expect((await servicio(consulta)).origen).toBe('gibs'); expect(solicitar).toHaveBeenCalledTimes(2);
    await servicio({ ...consulta, fecha: '2023-01-17' }); expect(solicitar).toHaveBeenCalledTimes(3);
    expect(solicitar).toHaveBeenCalledWith(expect.stringContaining('gibs.earthdata.nasa.gov'), expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal), headers: { Accept: 'image/png' } }));
  });
  it.each(['http', 'red', 'timeout', 'xml', 'grande', 'stream'])('controla fallo %s sin fabricar imágenes', async (caso) => {
    const solicitar = vi.fn(async () => {
      if (caso === 'red') throw new TypeError('detalle privado'); if (caso === 'timeout') throw new DOMException('timeout', 'TimeoutError');
      if (caso === 'http') return new Response('fallo', { status: 503 }); if (caso === 'xml') return new Response('<Error/>', { headers: { 'Content-Type': 'text/xml' } });
      if (caso === 'grande') return new Response('x', { headers: { 'Content-Type': 'image/png', 'Content-Length': '999999999' } });
      return new Response(new Uint8Array(2097153), { headers: { 'Content-Type': 'image/png' } });
    });
    await expect(crearServicioCapas(solicitar)(consulta)).rejects.toThrow('No se pudo obtener una visualización fiable');
  });
  it('un fallo síncrono se recupera después de la espera y no deja una promesa bloqueada', async () => {
    let ahora = 0; const solicitar = vi.fn().mockImplementationOnce(() => { throw new Error('interno'); }).mockImplementation(async () => responder()); const servicio = crearServicioCapas(solicitar, () => ahora);
    await expect(servicio(consulta)).rejects.toThrow(ErrorCapaSatelital); await expect(servicio(consulta)).rejects.toThrow(ErrorCapaSatelital); expect(solicitar).toHaveBeenCalledOnce();
    ahora = 30001; expect((await servicio(consulta)).visible).toBe(true); expect(solicitar).toHaveBeenCalledTimes(2);
  });
  it('limita la concurrencia sin impedir reutilizar una consulta idéntica', async () => {
    const pendientes = [Promise.withResolvers<Response>(), Promise.withResolvers<Response>()]; let indice = 0;
    const servicio = crearServicioCapas(vi.fn(async () => pendientes[indice++]?.promise ?? responder()));
    const primera = servicio(consulta); const segunda = servicio({ ...consulta, fecha: '2023-01-17' });
    await expect(servicio({ ...consulta, fecha: '2023-02-02' })).rejects.toThrow(ErrorCapaSatelital);
    pendientes[0]?.resolve(responder()); pendientes[1]?.resolve(responder()); await Promise.all([primera, segunda]);
  });
});
