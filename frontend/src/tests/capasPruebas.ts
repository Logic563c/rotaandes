import type { MetadatosCapaVisual, TipoCapa } from '../types/api';

// Bytes/metadata controlados para la interfaz; no son una imagen de NASA ni mediciones.
export const bytesCapaPrueba = new TextEncoder().encode('imagen_controlada_solo_para_pruebas');
export function crearCapaPrueba(tipo: TipoCapa = 'ndvi', anio = 2023, mes = 1, fecha?: string): MetadatosCapaVisual {
  const seleccionada = fecha ?? `${anio}-${String(mes).padStart(2, '0')}-${tipo === 'ndvi' ? '01' : '17'}`;
  return { tipo, nombre: tipo === 'ndvi' ? 'Vegetación NDVI' : 'Humedad superficial SMAP', producto: tipo === 'ndvi' ? 'MOD13Q1' : 'SPL3SMP_E', version_catalogo: tipo === 'ndvi' ? '061' : '006',
    resolucion_m: tipo === 'ndvi' ? 250 : 9000, unidad: tipo === 'ndvi' ? 'NDVI, adimensional' : 'm³/m³', frecuencia: tipo === 'ndvi' ? 'Composición de 16 días' : 'Imagen diaria, capa diurna de GIBS',
    fuente: 'https://doi.org/10.5067/MODIS/MOD13Q1.061', leyenda_url: 'https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_L3_NDVI.xml', colores: ['#001100', '#002200', '#003300', '#004400', '#005500', '#006600'], valores_leyenda: [0, 0.2, 0.4, 0.6, 0.8, 1],
    limites_interpretacion: 'Fixture de interfaz: no representa medición de parcela ni rendimiento.', calidad_original: 'QA no aplicada localmente a la imagen de prueba.', procesamiento: 'Imagen controlada, sin GeoJSON ni agregación mensual.', aviso: 'Solo para pruebas.',
    formato: 'WMS_PNG', fuente_visual: 'NASA GIBS', proyeccion_imagen: 'EPSG:3857', anio, mes, fecha: seleccionada, fin_composicion: seleccionada, fechas_disponibles: [seleccionada], limites: [-79.45, -1.3, -78.3, -0.3],
    tamano_imagen: { ancho: 920, alto: 800 }, url_fuente: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi', estado_imagen: 'visible', sha256: 'b'.repeat(64), consultado_en: '2026-11-08T21:20:00Z', origen: 'gibs' };
}
