import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerClima } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import { EstadoConsulta } from './EstadoConsulta';
import { CabeceraModulo } from './Iconos';

const Graficas = lazy(async () => ({ default: (await import('./GraficasClima')).GraficasClima }));
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ESTADOS = { nasa: 'Consulta reciente a NASA', cache: 'Caché verificada', desactualizado: 'Datos anteriores: NASA no disponible', respaldo: 'Respaldo verificado: datos NASA archivados de la misma celda de cuadrícula (NASA no respondió)' };
function mostrar(valor: number | null, unidad = '') { return valor === null ? 'Sin dato' : `${valor.toLocaleString('es-EC', { maximumFractionDigits: 3 })}${unidad}`; }

export function ClimaTerreno({ terrenoId, latitud, longitud, altitudM }: { terrenoId: string; latitud: number; longitud: number; altitudM: number | null }) {
  const [abierto, establecerAbierto] = useState(false);
  const sesion = useAgricultura();
  const consulta = useQuery({ queryKey: [...sesion.clave, 'clima', terrenoId, latitud, longitud, altitudM], enabled: abierto, retry: false,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerClima(token, terrenoId, signal), signal), staleTime: 60000 });
  const clima = consulta.data;
  return <section className="modulo modulo--cielo" aria-labelledby="titulo-clima">
    <CabeceraModulo icono="termometro" etiqueta="Conocer el clima de nuestra zona"><h2 id="titulo-clima" className="mt-1 break-words font-campo text-2xl sm:text-4xl">Climatología histórica</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Resumen de largo plazo de NASA POWER. Representa la zona y no es un pronóstico ni una medición exacta de tu terreno.</p>
    <button className="boton-secundario mt-5" type="button" aria-expanded={abierto} aria-controls="contenido-clima" onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar climatología' : 'Ver climatología histórica'}</button>
    {abierto && <div id="contenido-clima" className="mt-6">
      <EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} />
      {consulta.isError && <p className="mt-3 text-sm text-oliva">No se muestran valores inventados para sustituir datos ausentes.</p>}
      {consulta.isSuccess && clima && <>
        <div className="panel-fuente text-sm leading-relaxed">
          <p className="font-semibold">Fuente: <a href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer" className="underline">NASA POWER</a> · Periodo {clima.periodo.inicio}–{clima.periodo.fin}</p>
          <p className="mt-2">{ESTADOS[clima.estado_datos]}{clima.desactualizado ? ' · Desactualizado: más de 30 días desde la consulta.' : ''}</p>
          <p className="mt-1">Consulta del dato: <time dateTime={clima.actualizado_en}>{new Date(clima.actualizado_en).toLocaleDateString('es-EC', { dateStyle: 'long' })}</time>. Esta fecha no convierte la climatología en tiempo actual.</p>
          <p className="mt-2 text-oliva">{clima.resolucion}</p>
        </div>
        {clima.advertencias.length > 0 && <div className="panel-aviso mt-5 text-sm"><h3 className="font-semibold">Datos incompletos y limitaciones</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-oliva">{clima.advertencias.map((aviso, indice) => <li key={indice}>{aviso}</li>)}</ul></div>}
        <Suspense fallback={<p role="status" className="mt-6">Preparando gráficas…</p>}><Graficas mensual={clima.mensual} fuente={`Fuente: NASA POWER · promedio ${clima.periodo.inicio}–${clima.periodo.fin} · dato regional (aprox. 50 km)`} /></Suspense>
        <div className="tarjeta mt-6 p-5 text-sm leading-relaxed"><h3 className="font-semibold">Cómo interpretar estos datos</h3><p className="mt-2 text-oliva">{clima.metodologia}</p><p className="mt-2 text-oliva">Riesgo estimado: alto con mínima ≤ 2 °C, medio hasta 5 °C, bajo por encima de 5 °C. Desde 3400 m se eleva un nivel; no se cuentan días de helada. Confirma las decisiones con tu experiencia y un técnico agrícola.</p></div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-pino/15" role="region" aria-label="Tabla mensual de clima" tabIndex={0}>
          <table className="w-full min-w-[650px] border-collapse text-left text-sm"><caption className="bg-white px-5 py-4 text-left font-semibold">Valores mensuales y riesgo de helada estimado. Humedad: índice de zona de raíces 0–1.</caption><thead className="bg-arena"><tr>{['Mes', 'Mín. °C', 'Media °C', 'Máx. °C', 'Lluvia mm', 'Humedad 0–1', 'Riesgo estimado'].map((titulo) => <th scope="col" key={titulo} className="px-3 py-3">{titulo}</th>)}</tr></thead><tbody>{clima.mensual.map((mes) => <tr key={mes.mes} className="border-t border-pino/10 bg-white/70"><th scope="row" className="px-3 py-3">{MESES[mes.mes - 1]}</th><td className="px-3 py-3">{mostrar(mes.t_min)}</td><td className="px-3 py-3">{mostrar(mes.t_med)}</td><td className="px-3 py-3">{mostrar(mes.t_max)}</td><td className="px-3 py-3">{mostrar(mes.lluvia_mm)}</td><td className="px-3 py-3">{mostrar(mes.humedad_suelo)}</td><td className="px-3 py-3"><span className={`rounded-lg px-2 py-1 font-semibold ${mes.riesgo_helada === 'alto' ? 'bg-arcilla/15 text-arcilla' : mes.riesgo_helada === 'medio' ? 'bg-arena text-pino' : 'bg-pino/10 text-pino'}`}>{mes.riesgo_helada === null ? 'Sin dato' : mes.riesgo_helada === 'alto' ? 'Alto' : mes.riesgo_helada === 'medio' ? 'Medio' : 'Bajo'}</span></td></tr>)}</tbody></table>
        </div>
      </>}
    </div>}
  </section>;
}
