import { z } from 'zod';

export const esquemaTipoCapa = z.enum(['ndvi', 'humedad_suelo']);
export type TipoCapa = z.infer<typeof esquemaTipoCapa>;
// Recorte rectangular regional; no representa un límite administrativo ni una parcela.
export const LIMITES_CAPAS = [-79.45, -1.3, -78.3, -0.3] as const;
export const TAMANIO_IMAGEN_CAPA = { ancho: 920, alto: 800 } as const;
export const PRODUCTOS_CAPAS = {
  ndvi: {
    nombre: 'Vegetación NDVI', producto: 'MOD13Q1', version_catalogo: '061', resolucion_m: 250,
    capa_gibs: 'MODIS_Terra_L3_NDVI_16Day', unidad: 'NDVI, adimensional', escala_original: 0.0001, relleno_original: -3000,
    proyeccion_original: 'MODIS Sinusoidal', frecuencia: 'Composición de 16 días',
    fuente: 'https://doi.org/10.5067/MODIS/MOD13Q1.061',
    leyenda_url: 'https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_L3_NDVI.xml',
    limites_interpretacion: 'NDVI indica vegetación; no mide rendimiento ni permite atribuir cambios a sequía, plagas o deterioro. No se extraen valores de los colores.',
    calidad_original: 'El análisis numérico requeriría factor de escala, relleno y QA de MOD13Q1. No se aplicó una nueva máscara de calidad local a esta imagen GIBS.',
    colores: ['#f1ecec', '#b09b8a', '#8fb716', '#3e8a01', '#086701', '#001801'], valores_leyenda: [0.0001, 0.2, 0.4, 0.6, 0.8, 1],
  },
  humedad_suelo: {
    nombre: 'Humedad superficial SMAP', producto: 'SPL3SMP_E', version_catalogo: '006', resolucion_m: 9000,
    capa_gibs: 'SMAP_L3_Passive_Enhanced_Day_Soil_Moisture', unidad: 'm³/m³', escala_original: 1, relleno_original: -9999,
    proyeccion_original: 'EASE-Grid 2.0 Global, EPSG:6933', frecuencia: 'Imagen diaria, capa diurna de GIBS',
    fuente: 'https://doi.org/10.5067/M20OXIZHY3RJ',
    leyenda_url: 'https://gibs.earthdata.nasa.gov/colormaps/v1.3/SMAP_Soil_Moisture.xml',
    limites_interpretacion: 'SMAP representa humedad superficial regional (aproximadamente 0–5 cm) en una malla de 9 km; el dominio de contribución es aproximadamente 33 km. No mide la humedad exacta de un terreno pequeño. No es RH2M ni los índices GWETTOP/GWETROOT de NASA POWER.',
    calidad_original: 'El análisis numérico requeriría QA y valores originales; el manual recomienda retrieval_qual_flag 0 u 8. Aquí solo se muestra la imagen coloreada de GIBS, sin una nueva máscara local.',
    colores: ['#ffb500', '#fffe00', '#068200', '#00ffff', '#000cff', '#00006f'], valores_leyenda: [0.02, 0.1, 0.2, 0.3, 0.4, 0.5],
  },
} as const;

const mes = z.string().regex(/^(?:[1-9]|1[0-2])$/).transform(Number);
const anio = z.string().regex(/^202[34]$/).transform(Number);
export const esquemaConsultaGeojson = z.strictObject({ mes });
const esquemaConsultaVisual = z.strictObject({ mes, anio, fecha: z.iso.date().optional() });
export interface ConsultaCapa { tipo: TipoCapa; mes: number; anio: number; fecha: string }

export function fechasDisponiblesCapa(tipo: TipoCapa, anio: number, mes: number): string[] {
  const inicio = Date.UTC(anio, mes - 1, 1); const fin = Date.UTC(anio, mes, 1); const fechas: string[] = [];
  if (tipo === 'ndvi') {
    for (let instante = Date.UTC(anio, 0, 1); instante < fin; instante += 16 * 86400000) if (instante >= inicio) fechas.push(new Date(instante).toISOString().slice(0, 10));
  } else for (let instante = inicio; instante < fin; instante += 86400000) fechas.push(new Date(instante).toISOString().slice(0, 10));
  return fechas;
}
export function validarConsultaCapa(tipo: unknown, consulta: unknown): ConsultaCapa {
  const tipoValido = esquemaTipoCapa.parse(tipo); const parametros = esquemaConsultaVisual.parse(consulta);
  const fechas = fechasDisponiblesCapa(tipoValido, parametros.anio, parametros.mes);
  const fecha = parametros.fecha ?? (tipoValido === 'humedad_suelo' ? fechas[16] : fechas[0]);
  if (!fecha || !fechas.includes(fecha)) throw new Error('Fecha no disponible en el mes y producto seleccionados.');
  return { tipo: tipoValido, anio: parametros.anio, mes: parametros.mes, fecha };
}
export function construirUrlCapa(consulta: ConsultaCapa): string {
  const [oeste, sur, este, norte] = LIMITES_CAPAS; const radio = 6378137;
  const proyectarX = (longitud: number) => radio * longitud * Math.PI / 180;
  const proyectarY = (latitud: number) => radio * Math.log(Math.tan(Math.PI / 4 + latitud * Math.PI / 360));
  const url = new URL('https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi');
  url.search = new URLSearchParams({ SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', LAYERS: PRODUCTOS_CAPAS[consulta.tipo].capa_gibs,
    STYLES: '', FORMAT: 'image/png', TRANSPARENT: 'TRUE', CRS: 'EPSG:3857', BBOX: [proyectarX(oeste), proyectarY(sur), proyectarX(este), proyectarY(norte)].join(','),
    WIDTH: String(TAMANIO_IMAGEN_CAPA.ancho), HEIGHT: String(TAMANIO_IMAGEN_CAPA.alto), TIME: consulta.fecha }).toString();
  return url.toString();
}
export function metadatosCapa(consulta: ConsultaCapa) {
  const producto = PRODUCTOS_CAPAS[consulta.tipo];
  const finAnio = Date.UTC(consulta.anio + 1, 0, 1) - 86400000;
  const fin = consulta.tipo === 'ndvi' ? new Date(Math.min(Date.parse(`${consulta.fecha}T00:00:00Z`) + 15 * 86400000, finAnio)).toISOString().slice(0, 10) : consulta.fecha;
  return { ...producto, tipo: consulta.tipo, formato: 'WMS_PNG' as const, fuente_visual: 'NASA GIBS' as const, anio: consulta.anio, mes: consulta.mes,
    fecha: consulta.fecha, fin_composicion: fin, fechas_disponibles: fechasDisponiblesCapa(consulta.tipo, consulta.anio, consulta.mes), limites: LIMITES_CAPAS,
    tamano_imagen: TAMANIO_IMAGEN_CAPA, proyeccion_imagen: 'EPSG:3857' as const, url_fuente: construirUrlCapa(consulta),
    procesamiento: 'Visualización raster oficial GIBS. Sin agregación mensual, GeoJSON analítico, interpolación local ni lectura numérica por parcela. La versión indicada pertenece al catálogo de referencia; la imagen utiliza el alias best de GIBS.',
    aviso: 'El mes selecciona composiciones o días disponibles, no un promedio mensual. Las fechas del catálogo no garantizan píxeles visibles en todo el recorte. Los espacios transparentes no significan cero.',
  };
}
