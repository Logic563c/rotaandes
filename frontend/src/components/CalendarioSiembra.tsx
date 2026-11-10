import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerCalendario } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { CeldaCalendario, EstadoCalendario, RespuestaCalendario } from '../types/api';
import { EstadoConsulta } from './EstadoConsulta';
import { ResumenCalendario } from './ResumenCalendario';
import { CabeceraModulo } from './Iconos';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ESTADOS: Record<EstadoCalendario, { etiqueta: string; simbolo: string; estilo: string }> = {
  recomendado: { etiqueta: 'Recomendado', simbolo: '✓', estilo: 'border-cultivo/50 bg-cultivo-claro text-[#1f5a2f]' },
  posible_con_cuidado: { etiqueta: 'Posible con cuidado', simbolo: '!', estilo: 'border-maiz bg-maiz-claro text-maiz-oscuro' },
  no_recomendado: { etiqueta: 'No recomendado', simbolo: '×', estilo: 'border-arcilla/40 bg-arcilla-claro text-[#85391f]' },
  no_determinado: { etiqueta: 'No determinado', simbolo: '?', estilo: 'border-stone-400 bg-stone-100 text-stone-700' },
};
function ExplicacionCelda({ celda, cultivo, clima, alCerrar }: { celda: CeldaCalendario; cultivo: string; clima: RespuestaCalendario['clima']; alCerrar: () => void }) {
  const referencia = useRef<HTMLDialogElement>(null); const encabezado = useRef<HTMLHeadingElement>(null); const titulo = useId();
  useEffect(() => { const dialogo = referencia.current; dialogo?.showModal(); encabezado.current?.focus(); if (dialogo) dialogo.scrollTop = 0; return () => dialogo?.close(); }, []);
  return <dialog ref={referencia} aria-labelledby={titulo} className="dialogo-confirmacion w-full" onCancel={(evento) => { evento.preventDefault(); alCerrar(); }}>
    <p className="etiqueta-seccion">Criterios de la recomendación</p><h3 ref={encabezado} tabIndex={-1} id={titulo} className="mt-3 font-campo text-2xl">{cultivo} · {MESES[celda.mes - 1]}</h3>
    <p className={`mt-4 rounded-lg border p-3 font-semibold ${ESTADOS[celda.estado].estilo}`}>{ESTADOS[celda.estado].simbolo} {ESTADOS[celda.estado].etiqueta}</p>
    <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-oliva">{celda.motivo}</p>
    <p className="mt-4 text-sm text-oliva">Fuente climática: <a className="underline" href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer">NASA POWER</a>, periodo {clima.periodo.inicio}–{clima.periodo.fin}. Consulta: {new Date(clima.actualizado_en).toLocaleDateString('es-EC')}.{clima.desactualizado ? ' Dato desactualizado.' : ''} Catálogo agronómico referencial pendiente de validación local.</p>
    <button autoFocus className="boton-secundario mt-6" type="button" onClick={alCerrar}>Cerrar explicación</button>
  </dialog>;
}

export function CalendarioSiembra({ terrenoId, latitud, longitud, altitudM, tieneRiego, areaHa }: { terrenoId: string; latitud: number; longitud: number; altitudM: number | null; tieneRiego: boolean | null; areaHa: number | null }) {
  const [abierto, establecerAbierto] = useState(false); const [seleccion, establecerSeleccion] = useState<{ cultivoId: string; mes: number } | null>(null);
  const sesion = useAgricultura(); const escenario = { lluvia_pct: 0, temp_delta: 0 };
  const consulta = useQuery({ queryKey: [...sesion.clave, 'calendario', terrenoId, latitud, longitud, altitudM, tieneRiego, areaHa, escenario], enabled: abierto, retry: false, staleTime: 60000,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerCalendario(token, terrenoId, escenario, signal), signal) });
  const datos = consulta.data;
  const altitudEvaluada = datos?.terreno.altitud_m ?? null;
  const cultivos = datos?.cultivos.filter((cultivo) => altitudEvaluada === null || (altitudEvaluada >= cultivo.altitud_min && altitudEvaluada <= cultivo.altitud_max)) ?? [];
  const excluidos = datos?.cultivos.filter((cultivo) => !cultivos.some((visible) => visible.id === cultivo.id)) ?? [];
  const celdaSeleccionada = datos?.celdas.find((celda) => celda.cultivo_id === seleccion?.cultivoId && celda.mes === seleccion.mes);
  return <section className="modulo" aria-labelledby="titulo-calendario">
    <CabeceraModulo icono="calendario" etiqueta="Planificar con información de nuestra zona"><h2 id="titulo-calendario" className="mt-1 break-words font-campo text-2xl sm:text-4xl">Calendario de siembra</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Meses orientativos según el catálogo referencial y la climatología NASA POWER. Selecciona una celda para conocer sus motivos. No es un pronóstico.</p>
    <button className="boton-secundario mt-5" type="button" aria-expanded={abierto} aria-controls="contenido-calendario" onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar calendario' : 'Ver calendario de siembra'}</button>
    {abierto && <div id="contenido-calendario" className="mt-6 min-w-0">
      <EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} />
      {consulta.isError && <p className="mt-3 text-sm text-oliva">No pudimos calcular el calendario con información fiable. Reintenta la consulta; no se han inventado recomendaciones.</p>}
      {consulta.isSuccess && datos && <>
        <ResumenCalendario datos={datos} />
        <div className="panel-fuente text-sm leading-relaxed"><p className="font-semibold">Clima: <a className="underline" href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer">NASA POWER</a> · {datos.clima.periodo.inicio}–{datos.clima.periodo.fin}</p>
          <p className="mt-2">Consulta del dato: <time dateTime={datos.clima.actualizado_en}>{new Date(datos.clima.actualizado_en).toLocaleDateString('es-EC')}</time>. Origen: {datos.clima.estado_datos === 'nasa' ? 'NASA reciente' : datos.clima.estado_datos === 'cache' ? 'caché' : datos.clima.estado_datos === 'respaldo' ? 'respaldo verificado' : 'dato anterior'}{datos.clima.desactualizado ? ' · Desactualizado: consultar con precaución.' : ''}</p>
          <p className="mt-2 text-oliva">{datos.clima.resolucion}</p><p className="mt-2 font-semibold">Umbrales y ventanas del catálogo: referenciales, pendientes de validación agronómica local.</p>
          <p className="mt-2">Altitud estimada: {datos.terreno.altitud_m === null ? 'desconocida' : `${datos.terreno.altitud_m} m`}. Área declarada: {datos.terreno.area_ha === null ? 'desconocida' : `${datos.terreno.area_ha} ha`}. Riego: {datos.terreno.tiene_riego === null ? 'desconocido' : datos.terreno.tiene_riego ? 'sí' : 'no'}.</p>
          <p className="mt-2">Escenario base: lluvia {datos.escenario.lluvia_pct} %; temperatura {datos.escenario.temp_delta} °C de variación.</p>
        </div>
        {datos.clima.advertencias.length > 0 && <ul className="panel-aviso mt-5 list-disc space-y-2 pl-10 text-sm">{datos.clima.advertencias.map((aviso, indice) => <li key={indice}>{aviso}</li>)}</ul>}
        {altitudEvaluada === null && <p role="status" className="mt-5 rounded-xl border border-stone-400 bg-stone-100 p-4 text-sm">Altitud desconocida: no se confirma compatibilidad y no se generan recomendaciones verdes.</p>}
        <ul aria-label="Leyenda del calendario" className="mt-6 flex flex-wrap gap-3 text-xs">{Object.entries(ESTADOS).map(([estado, detalle]) => <li key={estado} className={`rounded-lg border px-3 py-2 font-semibold ${detalle.estilo}`}>{detalle.simbolo} {detalle.etiqueta}</li>)}</ul>
        <p className="mt-4 text-sm text-oliva">Desliza la matriz para ver los doce meses. Con teclado, usa Tab para seleccionar una celda y Enter para abrir su explicación.</p>
        {cultivos.length === 0 ? <p role="status" className="tarjeta mt-5 p-5">No hay cultivos del catálogo aptos o evaluables con la altitud disponible.</p> : <div className="mt-5 max-h-[34rem] max-w-full overflow-auto rounded-2xl border border-pino/20" role="region" aria-label="Matriz mensual de siembra" tabIndex={0}>
          <table className="w-full min-w-[1150px] table-fixed sm:min-w-[1280px] border-collapse text-left text-xs"><caption className="sr-only">Calendario orientativo por cultivo y mes. Cada celda abre la explicación de sus criterios.</caption><thead><tr><th scope="col" className="sticky left-0 top-0 z-20 w-28 border-b border-pino/15 bg-arena p-2 sm:w-44 sm:p-3">Cultivo referencial</th>{MESES.map((mes) => <th scope="col" key={mes} className="sticky top-0 z-10 border-b border-pino/15 bg-arena px-2 py-3">{mes}</th>)}</tr></thead>
            <tbody>{cultivos.map((cultivo) => <tr key={cultivo.id}><th scope="row" className="sticky left-0 z-10 break-words border-b border-pino/15 bg-crema p-2 text-xs sm:p-3 sm:text-sm">{cultivo.nombre}</th>{MESES.map((mes, indice) => {
              const celda = datos.celdas.find((valor) => valor.cultivo_id === cultivo.id && valor.mes === indice + 1);
              return <td key={mes} className="border-b border-pino/10 bg-white/70 p-1.5">{celda && <button className={`min-h-14 w-full rounded-lg border px-1 py-2 text-xs font-semibold ${ESTADOS[celda.estado].estilo}`} aria-label={`${cultivo.nombre}, ${mes}: ${ESTADOS[celda.estado].etiqueta}`} type="button" onClick={() => establecerSeleccion({ cultivoId: cultivo.id, mes: celda.mes })}><span aria-hidden="true" className="block text-lg">{ESTADOS[celda.estado].simbolo}</span>{ESTADOS[celda.estado].etiqueta}</button>}</td>;
            })}</tr>)}</tbody>
          </table>
        </div>}
        {excluidos.length > 0 && <p className="mt-5 text-sm text-oliva">Fuera del rango de altitud referencial: {excluidos.map((cultivo) => `${cultivo.nombre} (${cultivo.altitud_min}–${cultivo.altitud_max} m)`).join('; ')}. No se recomiendan automáticamente para este terreno.</p>}
        <p className="panel-aviso mt-6 text-sm leading-relaxed text-oliva">{datos.aviso}</p>
        {celdaSeleccionada && <ExplicacionCelda celda={celdaSeleccionada} cultivo={datos.cultivos.find((cultivo) => cultivo.id === celdaSeleccionada.cultivo_id)?.nombre ?? celdaSeleccionada.cultivo_id} clima={datos.clima} alCerrar={() => establecerSeleccion(null)} />}
      </>}
    </div>}
  </section>;
}
