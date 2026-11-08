import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerPronostico } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import { EstadoConsulta } from './EstadoConsulta';

const mostrarNumero = (valor: number | null, unidad: string) => valor === null ? 'Sin dato' : `${valor.toLocaleString('es-EC')} ${unidad}`;
const mostrarFecha = (fecha: string) => new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }).format(new Date(`${fecha}T12:00:00-05:00`));

export function PronosticoTerreno({ terrenoId, latitud, longitud }: { terrenoId: string; latitud: number; longitud: number }) {
  const [abierto, establecerAbierto] = useState(false);
  const [ahora, establecerAhora] = useState(Date.now);
  const sesion = useAgricultura();
  useEffect(() => {
    if (!abierto) return;
    const intervalo = window.setInterval(() => establecerAhora(Date.now()), 10000);
    const actualizar = () => establecerAhora(Date.now());
    window.addEventListener('focus', actualizar);
    return () => { window.clearInterval(intervalo); window.removeEventListener('focus', actualizar); };
  }, [abierto]);
  const consulta = useQuery({ queryKey: [...sesion.clave, 'pronostico', terrenoId, latitud, longitud], enabled: abierto, retry: false, staleTime: 60000, refetchInterval: abierto ? 60000 : false,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerPronostico(token, terrenoId, signal), signal) });
  const datos = consulta.data;
  useEffect(() => {
    if (!abierto || !datos) return;
    const tiempo = window.setTimeout(() => establecerAhora(Date.now()), Math.max(0, Date.parse(datos.vigente_hasta) - Date.now()));
    return () => window.clearTimeout(tiempo);
  }, [abierto, datos]);
  const instante = Math.max(ahora, consulta.dataUpdatedAt);
  const fechaHoy = new Date(instante - 5 * 3600000).toISOString().slice(0, 10);
  const vigente = datos !== undefined && Date.parse(datos.actualizado_en) <= instante && instante < Date.parse(datos.vigente_hasta)
    && datos.dias[0]?.fecha === fechaHoy && datos.coordenadas.latitud === latitud && datos.coordenadas.longitud === longitud;
  const reintentar = () => { establecerAhora(Date.now()); void consulta.refetch(); };
  return <section className="mt-12 border-t border-pino/15 pt-9" aria-labelledby="titulo-pronostico">
    <p className="etiqueta-seccion">Prepararnos para los próximos días</p><h2 id="titulo-pronostico" className="mt-3 font-campo text-3xl sm:text-4xl">Pronóstico y posibles heladas</h2>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Siete días, incluido hoy, según Open-Meteo. Es un pronóstico meteorológico y se presenta separado de la climatología histórica de NASA.</p>
    <button type="button" className="boton-secundario mt-5" aria-expanded={abierto} aria-controls="contenido-pronostico" onClick={() => { establecerAhora(Date.now()); establecerAbierto(!abierto); }}>{abierto ? 'Ocultar pronóstico' : 'Ver pronóstico de siete días'}</button>
    {abierto && <div id="contenido-pronostico" className="mt-6">
      <EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={reintentar} />
      {consulta.isError && <p className="mt-3 text-sm text-oliva">No hay información vigente disponible. No se sustituyen datos ausentes por un pronóstico inventado.</p>}
      {consulta.isSuccess && !vigente && <div className="tarjeta p-5"><p role="alert">El pronóstico ya no está vigente o no corresponde a esta ubicación. Consulta de nuevo para obtener información actualizada.</p><button className="boton-secundario mt-4" onClick={reintentar}>Reintentar</button></div>}
      {consulta.isSuccess && vigente && datos && <>
        <div className="rounded-2xl border border-pino/20 bg-arena/50 p-5 text-sm leading-relaxed">
          <p className="font-semibold">Datos meteorológicos de <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
          <p className="mt-2">{datos.estado_datos === 'cache' ? 'Caché vigente, hasta 30 minutos' : 'Consulta reciente al proveedor'}. Fechas de Ecuador continental (UTC−5).</p>
          <p className="mt-2">Consultado: <time dateTime={datos.actualizado_en}>{new Date(datos.actualizado_en).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' })}</time>. Es la fecha de consulta, no la hora de emisión del modelo.</p>
          <p className="mt-2 text-oliva">Valores diarios del modelo; alertas calculadas por RotaAndes sin modificar las temperaturas. Umbral preventivo: mínima ≤ {datos.umbral_helada_c.toLocaleString('es-EC')} °C.</p>
          <button className="boton-secundario mt-4" disabled={consulta.isFetching} onClick={reintentar}>{consulta.isFetching ? 'Comprobando actualización…' : 'Comprobar actualización'}</button>
        </div>
        {consulta.isFetching && <p role="status" className="mt-3 text-sm">Comprobando el pronóstico…</p>}
        {datos.advertencias.length > 0 && <ul className="mt-5 list-disc space-y-2 rounded-xl border border-arcilla/30 bg-white p-5 pl-10 text-sm">{datos.advertencias.map((aviso) => <li key={aviso}>{aviso}</li>)}</ul>}
        <div className="mt-6 rounded-2xl border border-pino/20 bg-white p-5"><h3 className="font-semibold">Alertas preventivas de posibles heladas</h3>
          {datos.alertas.length > 0 ? <ul className="mt-4 space-y-3">{datos.alertas.map((alerta) => <li key={alerta.fecha} className="rounded-xl border border-arcilla/30 bg-arcilla/10 p-4 text-sm leading-relaxed"><p className="font-semibold"><span aria-hidden="true">❄ </span>Posible helada · <time dateTime={alerta.fecha}>{mostrarFecha(alerta.fecha)}</time></p><p className="mt-2">{alerta.mensaje}</p></li>)}</ul>
            : <p className="mt-3 text-sm text-oliva">{datos.dias.some((dia) => dia.t_min === null) ? 'No se detectaron alertas en los días evaluables. Hay días sin mínima válida: no se puede descartar riesgo en ellos.' : 'No se prevén mínimas dentro del umbral en estos siete días. Esto no garantiza ausencia de heladas locales.'}</p>}
        </div>
        <ol aria-label="Pronóstico diario" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{datos.dias.map((dia) => {
          const alerta = datos.alertas.some((valor) => valor.fecha === dia.fecha);
          return <li key={dia.fecha} className={`tarjeta p-5 ${alerta ? 'border-arcilla/50' : ''}`}><h3 className="font-semibold capitalize"><time dateTime={dia.fecha}>{mostrarFecha(dia.fecha)}</time></h3>
            <p className="mt-3 text-sm font-semibold">{dia.t_min === null ? 'Sin mínima: riesgo no evaluable' : alerta ? '❄ Posible helada' : 'Fuera del umbral preventivo'}</p>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-oliva">↓ Mínima prevista</dt><dd className="mt-1 text-xl font-semibold">{mostrarNumero(dia.t_min, '°C')}</dd></div><div><dt className="text-oliva">↑ Máxima prevista</dt><dd className="mt-1 font-semibold">{mostrarNumero(dia.t_max, '°C')}</dd></div><div><dt className="text-oliva">☂ Precipitación prevista</dt><dd className="mt-1 font-semibold">{mostrarNumero(dia.precipitacion_mm, 'mm')}</dd></div></dl>
          </li>;
        })}</ol>
        <p className="mt-6 rounded-2xl border border-pino/15 bg-arena/40 p-5 text-sm leading-relaxed text-oliva">{datos.aviso}</p>
      </>}
    </div>}
  </section>;
}
