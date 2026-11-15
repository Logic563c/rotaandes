import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerCalendario } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { CeldaCalendario, CultivoCalendario, EstadoCalendario, RespuestaCalendario } from '../types/api';
import { EstadoConsulta } from './EstadoConsulta';
import { ResumenCalendario } from './ResumenCalendario';
import { CabeceraModulo } from './Iconos';
import { AyudaGrafica } from './AyudaGrafica';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ESTADOS: Record<EstadoCalendario, { etiqueta: string; simbolo: string; estilo: string; definicion: string }> = {
  recomendado: { etiqueta: 'Recomendado', simbolo: '✓', estilo: 'border-cultivo/50 bg-cultivo-claro text-[#1f5a2f]',
    definicion: 'Los datos disponibles y las reglas con fuente favorecen la siembra en todo el ciclo del cultivo.' },
  posible_con_cuidado: { etiqueta: 'Posible con precaución', simbolo: '!', estilo: 'border-maiz bg-maiz-claro text-maiz-oscuro',
    definicion: 'Se identifica un riesgo concreto que debes manejar, como frío durante el ciclo o lluvia insuficiente para cubrir toda la necesidad de agua.' },
  no_recomendado: { etiqueta: 'No recomendado', simbolo: '×', estilo: 'border-arcilla/40 bg-arcilla-claro text-[#85391f]',
    definicion: 'Hay una incompatibilidad justificada: demasiado frío, heladas en un cultivo sensible o falta de agua sin riego.' },
  no_determinado: { etiqueta: 'No determinado', simbolo: '?', estilo: 'border-stone-400 bg-stone-100 text-stone-700',
    definicion: 'Faltan datos o fuentes para evaluar. No significa que sea malo sembrar: significa que no hay información suficiente.' },
};
const MANEJO = { siembra_directa: 'Siembra directa', trasplante: 'Trasplante', no_documentado: null } as const;
const SIN_CATEGORIA = 'Otros cultivos';

function describirCiclo(cultivo: CultivoCalendario): string | null {
  if (cultivo.ciclo_dias_min === null || cultivo.ciclo_dias_max === null) return null;
  return cultivo.ciclo_dias_min === cultivo.ciclo_dias_max ? `Ciclo aprox. ${cultivo.ciclo_dias_max} días` : `Ciclo aprox. ${cultivo.ciclo_dias_min}-${cultivo.ciclo_dias_max} días`;
}

function condicionesAnuales(datos: RespuestaCalendario, cultivos: CultivoCalendario[]) {
  return cultivos.flatMap((cultivo) => {
    const celdas = datos.celdas.filter((celda) => celda.cultivo_id === cultivo.id);
    const primera = celdas[0];
    if (celdas.length !== 12 || !primera || primera.estado === 'recomendado') return [];
    const razones = (resumen: string | null | undefined) => (resumen?.split(': ').slice(1).join(': ').replace(/\.$/, '') ?? '').split('; ').filter(Boolean);
    if (!celdas.every((celda) => celda.estado === primera.estado)) return [];
    const comunes = razones(primera.resumen).filter((razon) => celdas.every((celda) => razones(celda.resumen).includes(razon)));
    if (!comunes.length) return [];
    return [{ id: cultivo.id, nombre: cultivo.nombre, estado: primera.estado, motivo: comunes.join('; ') }];
  });
}

function ExplicacionCelda({ celda, cultivo, clima, alCerrar }: { celda: CeldaCalendario; cultivo: CultivoCalendario | undefined; clima: RespuestaCalendario['clima']; alCerrar: () => void }) {
  const referencia = useRef<HTMLDialogElement>(null); const encabezado = useRef<HTMLHeadingElement>(null); const titulo = useId();
  useEffect(() => { const dialogo = referencia.current; dialogo?.showModal(); encabezado.current?.focus(); if (dialogo) dialogo.scrollTop = 0; return () => dialogo?.close(); }, []);
  const lineas = celda.motivo.split('\n');
  const resumen = celda.resumen ?? (lineas.length > 1 ? lineas[0] : null);
  const accion = lineas.find((linea) => linea.startsWith('• Qué puedes hacer: '))?.slice('• Qué puedes hacer: '.length) ?? null;
  const criterios = lineas.filter((linea) => linea.startsWith('• ') && !linea.startsWith('• Qué puedes hacer: '));
  const otras = lineas.filter((linea) => !linea.startsWith('• ') && linea !== resumen);
  const nombre = cultivo?.nombre ?? celda.cultivo_id; const ciclo = cultivo ? describirCiclo(cultivo) : null;
  return <dialog ref={referencia} aria-labelledby={titulo} className="dialogo-confirmacion w-full" onCancel={(evento) => { evento.preventDefault(); alCerrar(); }}>
    <p className="etiqueta-seccion">¿Por qué este resultado?</p><h3 ref={encabezado} tabIndex={-1} id={titulo} className="mt-3 font-campo text-2xl">{nombre} · {MESES[celda.mes - 1]}</h3>
    {cultivo?.nombre_cientifico && <p className="mt-1 text-sm italic text-oliva">{cultivo.nombre_cientifico}</p>}
    <p className={`mt-4 rounded-lg border p-3 font-semibold ${ESTADOS[celda.estado].estilo}`}>{ESTADOS[celda.estado].simbolo} {ESTADOS[celda.estado].etiqueta}</p>
    {resumen && <p className="mt-4 text-base font-semibold leading-relaxed">{resumen}</p>}
    {accion && <p className="mt-4 rounded-lg border-2 border-cultivo/50 bg-cultivo-claro/60 p-3 text-sm leading-relaxed"><span className="font-semibold text-pino">Qué puedes hacer:</span> {accion}</p>}
    {criterios.length > 0 && <h4 className="mt-5 font-semibold">Detalle de cada criterio</h4>}
    {criterios.length > 0 ? <ul className="mt-4 space-y-3 text-sm leading-relaxed text-oliva">{criterios.map((linea) => {
      const [criterio, ...resto] = linea.slice(2).split(': ');
      return <li key={linea} className="rounded-lg border border-pino/10 bg-white/80 p-3"><span className="font-semibold text-pino">{criterio}:</span> {resto.join(': ')}</li>;
    })}</ul> : <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-oliva">{celda.motivo}</p>}
    {criterios.length > 0 && otras.length > 0 && <p className="mt-4 text-sm leading-relaxed text-oliva">{otras.join(' ')}</p>}
    {cultivo && (ciclo || cultivo.cosecha || cultivo.nota_denominacion) && <div className="mt-5 rounded-lg border border-pino/15 bg-crema/70 p-3 text-sm leading-relaxed">
      {ciclo && <p><span className="font-semibold">{ciclo}.</span>{cultivo.establecimiento && MANEJO[cultivo.establecimiento] ? ` ${MANEJO[cultivo.establecimiento]}.` : ''} El ciclo real depende de la variedad, el clima y el manejo.</p>}
      {cultivo.cosecha && <p className="mt-2">Cosecha: {cultivo.cosecha}</p>}
      {cultivo.nota_denominacion && <p className="mt-2">Nombre: {cultivo.nota_denominacion}</p>}
    </div>}
    {cultivo && cultivo.consideraciones_rotacion.length > 0 && <><h4 className="mt-5 font-semibold">Para la rotación</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-oliva">{cultivo.consideraciones_rotacion.map((texto) => <li key={texto}>{texto}</li>)}</ul></>}
    {cultivo && cultivo.pendientes.length > 0 && <><h4 className="mt-5 font-semibold">Pendiente de validar</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-oliva">{cultivo.pendientes.map((texto) => <li key={texto}>{texto}</li>)}</ul></>}
    {cultivo && cultivo.fuentes.length > 0 && <><h4 className="mt-5 font-semibold">Fuentes agronómicas</h4><ul className="mt-2 space-y-1 text-sm text-oliva">{cultivo.fuentes.map((fuente) => <li key={fuente.cita}>{fuente.url.startsWith('https://') ? <a className="underline" href={fuente.url} target="_blank" rel="noreferrer">{fuente.cita}</a> : fuente.cita}: {fuente.referencia}</li>)}</ul></>}
    <p className="mt-4 text-sm text-oliva">Clima: <a className="underline" href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer">NASA POWER</a>, periodo {clima.periodo.inicio}–{clima.periodo.fin}, dato regional. Consulta: {new Date(clima.actualizado_en).toLocaleDateString('es-EC')}.{clima.desactualizado ? ' Dato desactualizado.' : ''} NASA aporta el clima; la recomendación es una regla de RotaAndes pendiente de validación local.</p>
    <button autoFocus className="boton-secundario mt-6" type="button" onClick={alCerrar}>Cerrar explicación</button>
  </dialog>;
}

export function CalendarioSiembra({ terrenoId, latitud, longitud, altitudM, tieneRiego, areaHa }: { terrenoId: string; latitud: number; longitud: number; altitudM: number | null; tieneRiego: boolean | null; areaHa: number | null }) {
  const [abierto, establecerAbierto] = useState(false); const [seleccion, establecerSeleccion] = useState<{ cultivoId: string; mes: number } | null>(null);
  const [busqueda, establecerBusqueda] = useState(''); const [categoria, establecerCategoria] = useState(''); const [soloHortalizas, establecerSoloHortalizas] = useState(false); const [soloCortos, establecerSoloCortos] = useState(false);
  const idBusqueda = useId(); const idCategoria = useId();
  const sesion = useAgricultura(); const escenario = { lluvia_pct: 0, temp_delta: 0 };
  const consulta = useQuery({ queryKey: [...sesion.clave, 'calendario', terrenoId, latitud, longitud, altitudM, tieneRiego, areaHa, escenario], enabled: abierto, retry: false, staleTime: 60000, refetchOnWindowFocus: true,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerCalendario(token, terrenoId, escenario, signal), signal) });
  const datos = consulta.data;
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const orden = new Map((datos?.categorias ?? []).map((valor) => [valor.nombre, valor.orden]));
  const cultivos = (datos?.cultivos ?? []).filter((cultivo) => (!busqueda.trim() || normalizar(`${cultivo.nombre} ${cultivo.nombre_cientifico ?? ''}`).includes(normalizar(busqueda.trim())))
    && (!categoria || (cultivo.categoria_nombre ?? SIN_CATEGORIA) === categoria) && (!soloHortalizas || cultivo.es_hortaliza === true) && (!soloCortos || cultivo.ciclo_corto === true))
    .sort((a, b) => (orden.get(a.categoria_nombre ?? SIN_CATEGORIA) ?? 99) - (orden.get(b.categoria_nombre ?? SIN_CATEGORIA) ?? 99) || a.nombre.localeCompare(b.nombre, 'es'));
  const grupos = cultivos.reduce<{ nombre: string; cultivos: CultivoCalendario[] }[]>((lista, cultivo) => {
    const nombre = cultivo.categoria_nombre ?? SIN_CATEGORIA; const grupo = lista.find((valor) => valor.nombre === nombre);
    if (grupo) grupo.cultivos.push(cultivo); else lista.push({ nombre, cultivos: [cultivo] }); return lista;
  }, []);
  const categorias = [...new Set((datos?.cultivos ?? []).map((cultivo) => cultivo.categoria_nombre ?? SIN_CATEGORIA))].sort((a, b) => (orden.get(a) ?? 99) - (orden.get(b) ?? 99));
  const celdaSeleccionada = datos?.celdas.find((celda) => celda.cultivo_id === seleccion?.cultivoId && celda.mes === seleccion.mes);
  const hortalizasSinDato = datos && datos.terreno.tiene_riego !== true ? datos.celdas.filter((celda) => celda.estado === 'no_determinado' && (celda.resumen ?? celda.motivo).includes('no se sabe cuánta agua necesita') && datos.cultivos.find((cultivo) => cultivo.id === celda.cultivo_id)?.es_hortaliza).length : 0;
  const hayFiltros = busqueda !== '' || categoria !== '' || soloHortalizas || soloCortos;
  const condiciones = datos ? condicionesAnuales(datos, cultivos) : [];
  return <section className="modulo" aria-labelledby="titulo-calendario">
    <CabeceraModulo icono="calendario" etiqueta="Planificar con información de nuestra zona"><h2 id="titulo-calendario" className="mt-1 break-words font-campo text-2xl sm:text-4xl">Calendario de siembra</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Meses orientativos para sembrar o trasplantar cada cultivo. Se evalúa el ciclo completo con la climatología NASA POWER y parámetros de INIAP y FAO. Selecciona una casilla para conocer sus motivos. No es un pronóstico.</p>
    <button className="boton-secundario mt-5" type="button" aria-expanded={abierto} aria-controls="contenido-calendario" onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar calendario' : 'Ver calendario de siembra'}</button>
    {abierto && <div id="contenido-calendario" className="aparecer mt-6 min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" className="boton-secundario" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>{consulta.isFetching ? 'Actualizando calendario…' : 'Actualizar calendario'}</button>
        {consulta.isFetching && !consulta.isPending && <p role="status" className="text-sm text-oliva">Consultando de nuevo el resumen, la matriz y los detalles…</p>}
        {consulta.isSuccess && !consulta.isFetching && <p className="text-sm text-oliva">Consulta realizada: <time dateTime={new Date(consulta.dataUpdatedAt).toISOString()}>{new Date(consulta.dataUpdatedAt).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</time>.</p>}
      </div>
      <EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} />
      {consulta.isError && <p className="mt-3 text-sm text-oliva">No pudimos calcular el calendario con información fiable. Reintenta la consulta; no se han inventado recomendaciones.</p>}
      {consulta.isSuccess && datos && <>
        <ResumenCalendario datos={datos} alSeleccionar={(celda) => establecerSeleccion({ cultivoId: celda.cultivo_id, mes: celda.mes })} />
        <div className="panel-fuente text-sm leading-relaxed"><p className="font-semibold">Clima: <a className="underline" href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer">NASA POWER</a> · {datos.clima.periodo.inicio}–{datos.clima.periodo.fin}</p>
          <p className="mt-2">Consulta del dato: <time dateTime={datos.clima.actualizado_en}>{new Date(datos.clima.actualizado_en).toLocaleDateString('es-EC')}</time>. Origen: {datos.clima.estado_datos === 'nasa' ? 'NASA reciente' : datos.clima.estado_datos === 'cache' ? 'caché' : datos.clima.estado_datos === 'respaldo' ? 'respaldo verificado' : 'dato anterior'}{datos.clima.desactualizado ? ' · Desactualizado: consultar con precaución.' : ''}</p>
          <p className="mt-2 text-oliva">{datos.clima.resolucion}</p><p className="mt-2 font-semibold">NASA aporta el clima de la zona. Las reglas de cultivo son de RotaAndes, con fuentes citadas en cada casilla, y están pendientes de validación agronómica local.</p>
          <p className="mt-2">Altitud estimada: {datos.terreno.altitud_m === null ? 'desconocida' : `${datos.terreno.altitud_m} m`}. Área declarada: {datos.terreno.area_ha === null ? 'desconocida' : `${datos.terreno.area_ha} ha`}. Riego: {datos.terreno.tiene_riego === null ? 'desconocido' : datos.terreno.tiene_riego ? 'sí' : 'no'}.</p>
          <p className="mt-2">Escenario base: lluvia {datos.escenario.lluvia_pct} %; temperatura {datos.escenario.temp_delta} °C de variación.</p>
          <p className="mt-2">El frío del calendario se estima para la altitud del terreno. El indicador regional de la sección Clima puede ser distinto; consulta el pronóstico antes de sembrar.</p>
        </div>
        {datos.clima.advertencias.length > 0 && <ul className="panel-aviso mt-5 list-disc space-y-2 pl-10 text-sm">{datos.clima.advertencias.map((aviso, indice) => <li key={indice}>{aviso}</li>)}</ul>}
        {datos.terreno.altitud_m === null && <p role="status" className="mt-5 rounded-xl border border-stone-400 bg-stone-100 p-4 text-sm">Altitud desconocida: no se puede estimar la temperatura del terreno y no se generan recomendaciones.</p>}
        {hortalizasSinDato > 0 && <p role="note" className="mt-5 rounded-xl border border-maiz bg-maiz-claro/60 p-4 text-sm leading-relaxed">Muchas hortalizas aparecen como «No determinado» porque {datos.terreno.tiene_riego === false ? 'tu terreno no tiene riego' : 'no sabemos si tu terreno tiene riego'} y las fuentes consultadas no indican cuánta agua necesitan; INIAP recomienda regarlas durante todo el cultivo. Si tienes riego, indícalo al editar el terreno para evaluarlas.</p>}
        <h3 className="mt-6 font-campo text-xl">¿Qué significa cada color?</h3>
        <ul aria-label="Leyenda del calendario" className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{(Object.entries(ESTADOS) as [EstadoCalendario, typeof ESTADOS[EstadoCalendario]][]).map(([estado, detalle]) => <li key={estado} className={`rounded-lg border px-3 py-2 ${detalle.estilo}`}><span className="block font-semibold">{detalle.simbolo} {detalle.etiqueta}</span><span className="mt-1 block leading-relaxed">{detalle.definicion}</span></li>)}</ul>
        <AyudaGrafica queMuestra="Una tabla de colores agrupada por tipo de cultivo: cada fila es un cultivo y cada columna el mes en que se siembra (o se trasplanta). El color y el símbolo indican el resultado de evaluar todo el ciclo del cultivo desde ese mes."
          ejeHorizontal="Columnas: mes de siembra o de trasplante, de enero a diciembre." ejeVertical="Filas: cultivos agrupados por tipo (hortalizas de hoja, de raíz, tubérculos, etc.), con su ciclo aproximado."
          colores={[{ color: '#2f7d43', texto: '✓ Verde: recomendado', trazo: 'barra' }, { color: '#e6b33c', texto: '! Amarillo: posible con precaución', trazo: 'barra' }, { color: '#a3492a', texto: '× Rojo: no recomendado por una incompatibilidad', trazo: 'barra' }, { color: '#a8a29e', texto: '? Gris: no determinado por falta de datos', trazo: 'barra' }]}
          lectura="Busca las casillas verdes o amarillas de un cultivo: son los meses en que podrías sembrarlo. Ábrelas para ver qué hay que vigilar: heladas, agua, época o temperatura durante todo el ciclo."
          precauciones={['Se basa en promedios históricos de una zona de unos 50 km, no en el pronóstico de este año ni en el microclima de tu lote.', 'Los ciclos y umbrales vienen de INIAP y FAO y cambian con la variedad; deben validarse localmente.', 'El color nunca se usa solo: cada casilla lleva símbolo y texto.']}
          ejemplo="Toca una casilla para leer, por ejemplo, cuánta lluvia promedio tiene el ciclo frente a la que necesita el cultivo, o en qué meses del ciclo hay riesgo de helada." />
        <fieldset className="mt-6 grid gap-4 rounded-2xl border border-pino/15 bg-white/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="px-2 text-sm font-semibold">Filtrar cultivos</legend>
          <div className="campo"><label htmlFor={idBusqueda}>Buscar cultivo</label><input id={idBusqueda} type="search" value={busqueda} placeholder="Ej.: lechuga" onChange={(evento) => establecerBusqueda(evento.target.value)} /></div>
          <div className="campo"><label htmlFor={idCategoria}>Tipo de cultivo</label><select id={idCategoria} value={categoria} onChange={(evento) => establecerCategoria(evento.target.value)}><option value="">Todos los tipos</option>{categorias.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}</select></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={soloHortalizas} onChange={(evento) => establecerSoloHortalizas(evento.target.checked)} />Solo hortalizas</label>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={soloCortos} onChange={(evento) => establecerSoloCortos(evento.target.checked)} />Solo ciclos de hasta 4 meses</label>
        </fieldset>
        <p className="mt-3 text-sm text-oliva" role="status">Mostrando {cultivos.length} de {datos.cultivos.length} cultivos.{hayFiltros && <> <button type="button" className="underline" onClick={() => { establecerBusqueda(''); establecerCategoria(''); establecerSoloHortalizas(false); establecerSoloCortos(false); }}>Quitar filtros</button></>}</p>
        {condiciones.length > 0 && <details className="panel-aviso mt-4 p-4 text-sm"><summary className="cursor-pointer font-semibold">Condiciones que se repiten durante el año</summary>
          <p className="mt-3 leading-relaxed">Estos cultivos tienen el mismo resultado y motivo los doce meses. Una condición permanente o un ciclo que alcanza los meses fríos puede explicar esa uniformidad. El gris indica información faltante; no un riesgo demostrado. Abre una casilla para revisar el ciclo y qué puedes hacer.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">{condiciones.map((cultivo) => <li key={cultivo.id}><span className="font-semibold">{cultivo.nombre} · {ESTADOS[cultivo.estado].etiqueta}:</span> {cultivo.motivo}.</li>)}</ul>
        </details>}
        <p className="mt-2 text-sm text-oliva">Desliza la matriz para ver los doce meses. Con teclado, usa Tab para seleccionar una casilla y Enter para abrir su explicación.</p>
        {cultivos.length === 0 ? <p role="status" className="tarjeta mt-5 p-5">Ningún cultivo coincide con los filtros elegidos.</p> : <div className="mt-4 max-h-[40rem] max-w-full overflow-auto rounded-2xl border border-pino/20" role="region" aria-label="Matriz mensual de siembra" tabIndex={0}>
          <table className="w-full min-w-[1150px] table-fixed border-collapse text-left text-xs sm:min-w-[1280px]"><caption className="sr-only">Calendario orientativo por tipo de cultivo, cultivo y mes. Cada casilla abre la explicación de sus criterios.</caption><thead><tr><th scope="col" className="sticky left-0 top-0 z-20 w-32 border-b border-pino/15 bg-arena p-2 sm:w-48 sm:p-3">Cultivo</th>{MESES.map((mes) => <th scope="col" key={mes} className="sticky top-0 z-10 border-b border-pino/15 bg-arena px-2 py-3">{mes}</th>)}</tr></thead>
            {grupos.map((grupo) => <tbody key={grupo.nombre}><tr><td colSpan={13} className="border-b border-pino/15 bg-pino/10 px-3 py-2 text-left text-sm font-semibold text-pino"><span className="sticky left-3">{grupo.nombre} ({grupo.cultivos.length})</span></td></tr>
              {grupo.cultivos.map((cultivo) => { const ciclo = describirCiclo(cultivo); const manejo = cultivo.establecimiento ? MANEJO[cultivo.establecimiento] : null;
                return <tr key={cultivo.id}><th scope="row" className="sticky left-0 z-10 break-words border-b border-pino/15 bg-crema p-2 align-top text-xs sm:p-3 sm:text-sm"><span className="block font-semibold">{cultivo.nombre}</span>
                  {(ciclo || manejo) && <span className="mt-1 block text-[0.7rem] font-normal leading-snug text-oliva sm:text-xs">{[ciclo, manejo].filter(Boolean).join(' · ')}</span>}
                  {cultivo.ciclo_corto && <span className="mt-1 inline-block rounded bg-cultivo-claro px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#1f5a2f]">Ciclo corto</span>}</th>
                  {MESES.map((mes, indice) => {
                    const celda = datos.celdas.find((valor) => valor.cultivo_id === cultivo.id && valor.mes === indice + 1);
                    return <td key={mes} className="border-b border-pino/10 bg-white/70 p-1.5">{celda && <button className={`min-h-14 w-full rounded-lg border px-1 py-2 text-xs font-semibold ${ESTADOS[celda.estado].estilo}`} aria-label={`${cultivo.nombre}, ${mes}: ${ESTADOS[celda.estado].etiqueta}`} type="button" onClick={() => establecerSeleccion({ cultivoId: cultivo.id, mes: celda.mes })}><span aria-hidden="true" className="block text-lg">{ESTADOS[celda.estado].simbolo}</span>{ESTADOS[celda.estado].etiqueta}</button>}</td>;
                  })}</tr>; })}
            </tbody>)}
          </table>
        </div>}
        <p className="panel-aviso mt-6 text-sm leading-relaxed text-oliva">{datos.aviso}</p>
        {celdaSeleccionada && <ExplicacionCelda celda={celdaSeleccionada} cultivo={datos.cultivos.find((cultivo) => cultivo.id === celdaSeleccionada.cultivo_id)} clima={datos.clima} alCerrar={() => establecerSeleccion(null)} />}
      </>}
    </div>}
  </section>;
}
