import { useEffect, useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerCapaVisual } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { ConsultaCapaVisual, Terreno, TipoCapa } from '../types/api';
import { MapaDiferido } from './MapaDiferido';
import { EstadoConsulta } from './EstadoConsulta';
import type { CSSProperties } from 'react';
import { Icono } from './Iconos';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const LIMITES = [-79.45, -1.3, -78.3, -0.3] as const;
const mostrarFecha = (fecha: string) => new Date(`${fecha}T00:00:00Z`).toLocaleDateString('es-EC', { timeZone: 'UTC' });

function useImagenSatelital(blob: Blob | null | undefined): string | undefined {
  const [imagen, establecerImagen] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob); const espera = window.setTimeout(() => establecerImagen({ blob, url }), 0);
    return () => { window.clearTimeout(espera); URL.revokeObjectURL(url); establecerImagen((anterior) => anterior?.url === url ? null : anterior); };
  }, [blob]);
  return imagen && imagen.blob === blob ? imagen.url : undefined;
}

export function VisorCapas({ terrenos }: { terrenos: Terreno[] }) {
  const sesion = useAgricultura(); const id = useId();
  const [abierto, establecerAbierto] = useState(false); const [tipo, establecerTipo] = useState<TipoCapa | null>(null);
  const [seleccion, establecerSeleccion] = useState<ConsultaCapaVisual>({ anio: 2023, mes: 1 });
  const [mapaBase, establecerMapaBase] = useState(true);
  const consulta = useQuery({ queryKey: [...sesion.clave, 'capas-visuales', tipo, seleccion.anio, seleccion.mes, seleccion.fecha ?? 'predeterminada'], enabled: abierto && tipo !== null && Boolean(sesion.token),
    staleTime: 60000, gcTime: 60000, retry: false, refetchOnWindowFocus: false,
    queryFn: ({ signal }) => { if (tipo === null) throw new Error('Selecciona una capa.'); return sesion.ejecutar((token) => obtenerCapaVisual(token, tipo, seleccion, signal), signal); } });
  const datos = abierto && tipo !== null && consulta.isSuccess && !consulta.isFetching && sesion.sigueActiva() ? consulta.data : undefined;
  const url = useImagenSatelital(datos?.imagen);
  const imagenSatelital = useMemo(() => abierto && tipo ? { limites: LIMITES, nombre: tipo === 'ndvi' ? 'Vegetación NDVI' : 'Humedad superficial SMAP', ...(url ? { url } : {}) } : undefined, [abierto, tipo, url]);
  const metadatos = datos?.metadatos;
  return <section aria-labelledby={`${id}-titulo`} className="tarjeta tarjeta--acento min-w-0 p-5 sm:p-6" style={{ '--acento': '#1f6391' } as CSSProperties}>
    <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cielo-claro text-cielo"><Icono nombre="satelite" className="size-6" /></span><h2 id={`${id}-titulo`} className="font-campo text-2xl">Mapa y capas satelitales</h2></div>
    <p className="mt-3 text-sm leading-relaxed text-oliva">NDVI es un indicador de vegetación. SMAP muestra humedad superficial de una zona amplia, no la humedad exacta de tu parcela. Puedes consultar ambas imágenes con sus fechas y leyendas.</p>
    <button type="button" className="boton-secundario my-4" aria-expanded={abierto} aria-controls={`${id}-controles`} onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Cerrar controles satelitales' : 'Explorar capas NASA'}</button>
    {abierto && <div id={`${id}-controles`} className="panel-fuente mb-5 text-sm">
      <fieldset><legend className="font-semibold">Capa visible</legend><p className="mt-2 text-xs text-oliva">Una capa a la vez para no mezclar escalas. Puedes volver al mapa base.</p><div className="mt-3 grid gap-2">
        {([{ valor: null, nombre: 'Solo mapa base' }, { valor: 'ndvi', nombre: 'Vegetación NDVI (MODIS)' }, { valor: 'humedad_suelo', nombre: 'Humedad superficial (SMAP)' }] as const).map(({ valor, nombre }) => <label key={nombre} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-pino/15 bg-white px-3 py-2"><input type="radio" name={`${id}-tipo`} checked={tipo === valor} className="h-4 w-4 accent-pino" onChange={() => { establecerTipo(valor); establecerSeleccion((anterior) => ({ anio: anterior.anio, mes: anterior.mes })); }} />{nombre}</label>)}
      </div></fieldset>
      {tipo && <><div className="mt-4 grid grid-cols-2 gap-3"><label className="campo" htmlFor={`${id}-anio`}>Año<select id={`${id}-anio`} value={seleccion.anio} onChange={(evento) => establecerSeleccion({ anio: Number(evento.currentTarget.value), mes: seleccion.mes })}><option value={2023}>2023</option><option value={2024}>2024</option></select></label>
        <label className="campo" htmlFor={`${id}-mes`}>Mes<select id={`${id}-mes`} value={seleccion.mes} onChange={(evento) => establecerSeleccion({ anio: seleccion.anio, mes: Number(evento.currentTarget.value) })}>{MESES.map((mes, indice) => <option key={mes} value={indice + 1}>{mes}</option>)}</select></label></div>
        {metadatos && <label className="campo mt-3" htmlFor={`${id}-fecha`}>Fecha de la imagen<select id={`${id}-fecha`} value={metadatos.fecha} onChange={(evento) => establecerSeleccion({ ...seleccion, fecha: evento.currentTarget.value })}>{metadatos.fechas_disponibles.map((fecha) => <option key={fecha} value={fecha}>{mostrarFecha(fecha)}</option>)}</select></label>}
        <label className="mt-4 flex min-h-11 items-center gap-3"><input type="checkbox" checked={mapaBase} onChange={(evento) => establecerMapaBase(evento.currentTarget.checked)} className="h-4 w-4 accent-pino" />Mostrar cartografía debajo de la capa</label>
        <div className="mt-3" aria-live="polite"><EstadoConsulta cargando={consulta.isPending || consulta.isFetching} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} /></div>
      </>}
      <p className="mt-4 text-xs leading-relaxed text-oliva">Visualización oficial NASA GIBS. Las imágenes no son GeoJSON analítico ni promedios mensuales. No se calculan valores por parcela o conclusiones agrícolas a partir de sus colores.</p>
    </div>}
    <MapaDiferido terrenos={terrenos} mostrarMapaBase={tipo === null || !abierto || mapaBase} {...(imagenSatelital && { imagenSatelital })} />
    {metadatos && <div className="panel-fuente mt-4 text-sm leading-relaxed">
      <p className="font-semibold">{metadatos.nombre} · NASA GIBS</p><p className="mt-2">{metadatos.frecuencia}: {mostrarFecha(metadatos.fecha)}{metadatos.fin_composicion !== metadatos.fecha ? ` a ${mostrarFecha(metadatos.fin_composicion)}` : ''}. No es un promedio de {MESES[metadatos.mes - 1]?.toLowerCase()}.</p>
      <p className="mt-2">Producto <a className="underline" href={metadatos.fuente} target="_blank" rel="noreferrer">{metadatos.producto}</a>, versión del catálogo {metadatos.version_catalogo}. Resolución de referencia: {metadatos.resolucion_m.toLocaleString('es-EC')} m. Unidad de la leyenda: {metadatos.unidad}.</p>
      <p className="mt-2">Recorte rectangular: Cotopaxi y alrededores, no un límite provincial. Zoom adicional no mejora la resolución del satélite.</p>
      {metadatos.estado_imagen === 'sin_pixeles_visibles' ? <p role="status" className="mt-4 rounded-xl border border-stone-400 bg-stone-100 p-3 font-semibold">Sin píxeles visibles en esta fecha y recorte. Puede deberse a la adquisición, máscaras o paleta del proveedor. No significa humedad o vegetación igual a cero. Prueba otra fecha.</p> : <p className="mt-3 font-semibold">Imagen recibida y procedencia comprobada. Puede haber cobertura parcial y huecos sobre los terrenos registrados.</p>}
      <div className="mt-4"><h3 className="font-semibold">Referencias de la paleta oficial</h3><ul aria-label={`Leyenda ${metadatos.nombre}`} className="mt-3 grid grid-cols-3 gap-2">{metadatos.colores.map((color, indice) => <li key={color} className="rounded-lg border border-pino/20 bg-crema p-2 text-center text-xs"><span aria-hidden="true" className="mx-auto mb-2 block h-5 w-full rounded border border-black/20" style={{ backgroundColor: color }} />{metadatos.valores_leyenda[indice]?.toLocaleString('es-EC', { maximumFractionDigits: 4 })}</li>)}</ul><a className="mt-2 inline-block underline" href={metadatos.leyenda_url} target="_blank" rel="noreferrer">Consultar paleta completa de NASA</a></div>
      <p className="mt-4 font-semibold">{metadatos.limites_interpretacion}</p><p className="mt-3 text-xs text-oliva">{metadatos.calidad_original}</p><p className="mt-3 text-xs text-oliva">{metadatos.procesamiento}</p>
      <p className="mt-3 text-xs text-oliva">Imagen consultada: {new Date(metadatos.consultado_en).toLocaleString('es-EC')}. Origen: {metadatos.origen === 'cache' ? 'caché de imágenes de GIBS' : 'consulta GIBS'}. La fecha de consulta no es la fecha de adquisición.</p>
      <a href={metadatos.url_fuente} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs underline">Ver imagen original y parámetros de NASA</a>
      <button type="button" className="enlace-nav mt-3 underline" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>Reintentar o comprobar imagen</button>
    </div>}
  </section>;
}
