import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerResultadosEscenario } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import { compararEscenarios, compararPuntajes, ESTADOS_ESCENARIO, MESES_ESCENARIO, mostrarVariacion } from '../lib/compararEscenarios';
import type { ResultadosEscenario } from '../lib/compararEscenarios';
import type { CeldaCalendario, EscenarioCalendario } from '../types/api';
import { EstadoConsulta } from './EstadoConsulta';
import { TarjetaEstrategia } from './ComparadorRotaciones';
import { CabeceraModulo } from './Iconos';
import { AyudaGrafica, LeyendaGrafica, TipoDato } from './AyudaGrafica';
import { COLORES_VARIABLE } from '../lib/graficas';

const ESCENARIO_ORIGINAL: EscenarioCalendario = { lluvia_pct: 0, temp_delta: 0 };

function ExplicacionEscenario({ original, modificado, cultivo, alCerrar }: { original: CeldaCalendario; modificado: CeldaCalendario; cultivo: string; alCerrar: () => void }) {
  const referencia = useRef<HTMLDialogElement>(null); const encabezado = useRef<HTMLHeadingElement>(null); const titulo = useId();
  useEffect(() => { const dialogo = referencia.current; dialogo?.showModal(); encabezado.current?.focus(); if (dialogo) dialogo.scrollTop = 0; return () => dialogo?.close(); }, []);
  return <dialog ref={referencia} aria-labelledby={titulo} className="dialogo-confirmacion w-full" onCancel={(evento) => { evento.preventDefault(); alCerrar(); }}>
    <h3 id={titulo} ref={encabezado} tabIndex={-1} className="font-campo text-2xl">{cultivo} · {MESES_ESCENARIO[original.mes - 1]}: comparación</h3>
    {[{ nombre: 'Original', celda: original }, { nombre: 'Simulado', celda: modificado }].map(({ nombre, celda }) => <div key={nombre} className="mt-5">
      <h4 className="font-semibold">{nombre}: {ESTADOS_ESCENARIO[celda.estado].texto}</h4><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-oliva">{celda.motivo}</p>
    </div>)}
    <p className="mt-5 text-sm font-semibold">Simulación hipotética sobre climatología NASA POWER y catálogo referencial. No predice el tiempo ni sustituye el criterio del agricultor o técnico.</p>
    <button type="button" className="boton-secundario mt-5" onClick={alCerrar}>Cerrar comparación</button>
  </dialog>;
}

function MatrizEscenarios({ original, modificado }: { original: ResultadosEscenario; modificado: ResultadosEscenario }) {
  const [seleccion, establecerSeleccion] = useState<{ cultivo: string; mes: number } | null>(null);
  const bases = new Map(original.calendario.celdas.map((celda) => [`${celda.cultivo_id}:${celda.mes}`, celda]));
  const nuevas = new Map(modificado.calendario.celdas.map((celda) => [`${celda.cultivo_id}:${celda.mes}`, celda]));
  const clave = seleccion ? `${seleccion.cultivo}:${seleccion.mes}` : '';
  const base = bases.get(clave); const nueva = nuevas.get(clave);
  return <>
    <div className="mt-8 flex flex-wrap items-center gap-3"><h3 className="font-campo text-2xl">Calendario: original frente a simulado</h3><TipoDato tipo="hipotetico" /></div>
    <ul aria-label="Leyenda del simulador" className="mt-4 flex flex-wrap gap-3 text-xs">{Object.values(ESTADOS_ESCENARIO).map((estado) => <li key={estado.texto} className={`rounded-lg border px-3 py-2 font-semibold ${estado.estilo}`}>{estado.simbolo} {estado.texto}</li>)}</ul>
    <p className="mt-4 text-sm text-oliva">Cada celda muestra ambos estados; selecciona una para leer los dos motivos. Se incluyen todos los cultivos evaluados, también los incompatibles. Desliza la tabla para ver diciembre; con teclado usa Tab y Enter.</p>
    <div role="region" aria-label="Calendario comparado de escenarios" tabIndex={0} className="mt-5 max-h-[34rem] max-w-full overflow-auto rounded-2xl border border-pino/20">
      <table className="w-full min-w-[1900px] table-fixed border-collapse text-left text-xs"><caption className="sr-only">Doce meses y cultivos referenciales: estado original y simulado, con explicaciones.</caption>
        <thead><tr><th scope="col" className="sticky left-0 top-0 z-20 w-36 border-b border-pino/15 bg-arena p-3">Cultivo</th>{MESES_ESCENARIO.map((mes) => <th key={mes} scope="col" className="sticky top-0 z-10 border-b border-pino/15 bg-arena p-3">{mes}</th>)}</tr></thead>
        <tbody>{modificado.calendario.cultivos.map((cultivo) => <tr key={cultivo.id}><th scope="row" className="sticky left-0 z-10 border-b border-pino/15 bg-crema p-3 text-sm">{cultivo.nombre}</th>{MESES_ESCENARIO.map((mes, indice) => {
          const anterior = bases.get(`${cultivo.id}:${indice + 1}`); const actual = nuevas.get(`${cultivo.id}:${indice + 1}`);
          return <td key={mes} className="border-b border-pino/10 bg-white/70 p-1.5">{anterior && actual && <button type="button" className="min-h-28 w-full rounded-lg p-1 text-left focus-visible:outline-offset-2" aria-label={`${cultivo.nombre}, ${mes}. Original: ${ESTADOS_ESCENARIO[anterior.estado].texto}. Simulado: ${ESTADOS_ESCENARIO[actual.estado].texto}`} onClick={() => establecerSeleccion({ cultivo: cultivo.id, mes: actual.mes })}>
            <span className="block rounded border border-stone-300 bg-white p-2">Original: {ESTADOS_ESCENARIO[anterior.estado].simbolo} {ESTADOS_ESCENARIO[anterior.estado].texto}</span>
            <span className={`mt-1 block rounded border p-2 font-semibold ${ESTADOS_ESCENARIO[actual.estado].estilo}`}>Simulado: {ESTADOS_ESCENARIO[actual.estado].simbolo} {ESTADOS_ESCENARIO[actual.estado].texto}</span>
            {anterior.estado !== actual.estado && <span className="mt-1 block text-center font-semibold text-arcilla">Cambio de estado</span>}
          </button>}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
    {base && nueva && <ExplicacionEscenario original={base} modificado={nueva} cultivo={modificado.calendario.cultivos.find((cultivo) => cultivo.id === base.cultivo_id)?.nombre ?? base.cultivo_id} alCerrar={() => establecerSeleccion(null)} />}
  </>;
}

function ComparacionRotaciones({ original, modificado }: { original: ResultadosEscenario; modificado: ResultadosEscenario }) {
  const comparacion = compararPuntajes(original.rotaciones.estrategias, modificado.rotaciones.estrategias);
  return <>
    <div className="mt-9 flex flex-wrap items-center gap-3"><h3 className="font-campo text-2xl">Variación de las puntuaciones</h3><TipoDato tipo="hipotetico" /></div>
    <LeyendaGrafica elementos={[{ color: COLORES_VARIABLE.original, texto: 'Original: clima histórico sin cambios', trazo: 'barra' }, { color: COLORES_VARIABLE.simulado, texto: 'Simulado: escenario hipotético', trazo: 'barra' }]} />
    <p className="mt-3 text-sm leading-relaxed text-oliva">Se compara la misma estrategia por su identificador, aunque cambie de posición. Si entra o sale del grupo de tres, sus indicadores completos del otro escenario no están disponibles: no se resta el puntaje de otra rotación. Los cambios se expresan en puntos del índice, no en porcentajes ni dinero.</p>
    <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">{comparacion.map((estrategia) => <div key={estrategia.id} className="tarjeta min-w-0 p-4 sm:p-5">
      <h4 className="break-words font-semibold">{estrategia.nombre}</h4>
      {(!estrategia.original || !estrategia.modificado) && <p className="mt-3 text-sm text-oliva">{estrategia.original ? 'Sale del grupo de tres en la simulación.' : 'Entra al grupo de tres en la simulación.'} Sin comparación completa para la misma estrategia.</p>}
      <div aria-hidden="true" className="mt-4 space-y-2">{estrategia.indicadores.map((indicador) => <div key={indicador.clave} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-[11px]"><span className="break-words font-semibold leading-tight">{indicador.nombre}</span><div className="space-y-1">
        {([['original', COLORES_VARIABLE.original], ['modificado', COLORES_VARIABLE.simulado]] as const).map(([clave, color]) => { const valor = indicador[clave]; return <div key={clave} className={`h-2.5 overflow-hidden rounded-full ${valor === null ? 'border border-dashed border-stone-400' : 'bg-arena'}`}>{valor !== null && <div className="h-full rounded-full" style={{ width: `${valor}%`, background: clave === 'modificado' ? `repeating-linear-gradient(135deg, ${color} 0 6px, #c99a2e 6px 9px)` : color }} />}</div>; })}
      </div></div>)}<div className="grid grid-cols-[6.5rem_1fr] gap-2 text-[11px] text-oliva"><span /><span className="flex justify-between"><span>0</span><span>50</span><span>100</span></span></div></div>
      <table className="mt-4 w-full table-fixed text-left text-xs"><caption className="sr-only">Indicadores comparados de {estrategia.nombre}, escala de 0 a 100</caption><thead><tr><th scope="col" className="w-[34%] pb-3">Índice</th><th scope="col" className="pb-3">Original</th><th scope="col" className="pb-3">Simulado</th><th scope="col" className="pb-3">Cambio</th></tr></thead>
        <tbody>{estrategia.indicadores.map((indicador) => <tr key={indicador.clave} className="border-t border-pino/10"><th scope="row" className="break-words py-3 pr-2 font-medium">{indicador.nombre}</th><td>{indicador.original === null ? 'No determinado' : indicador.original.toLocaleString('es-EC')}</td><td>{indicador.modificado === null ? 'No determinado' : indicador.modificado.toLocaleString('es-EC')}</td><td className="font-semibold">{indicador.diferencia === null ? 'No comparable' : mostrarVariacion(indicador.diferencia, ' pt')}</td></tr>)}</tbody>
      </table>
    </div>)}</div>
    <AyudaGrafica queMuestra="Para cada rotación, dos barras por índice: la gris es el resultado con el clima histórico original y la amarilla rayada el resultado con las condiciones hipotéticas que elegiste en los deslizadores. La tabla debajo de las barras muestra los valores exactos."
      ejeHorizontal="Longitud de la barra: índice de 0 (izquierda) a 100 (derecha)."
      ejeVertical="No hay eje vertical: cada par de barras es un índice (agua, suelo, compatibilidad climática, valor de mercado y total)."
      colores={[{ color: COLORES_VARIABLE.original, texto: 'Original (clima histórico)', trazo: 'barra' }, { color: COLORES_VARIABLE.simulado, texto: 'Simulado (hipotético)', trazo: 'barra' }]}
      lectura="Si la barra amarilla es más corta que la gris, ese índice empeora en el escenario simulado; si es más larga, mejora. La columna «Cambio» de la tabla indica la diferencia exacta en puntos."
      precauciones={['Es una simulación: aplica el porcentaje de lluvia y los grados elegidos a la climatología; no es un pronóstico.', 'Los cambios se expresan en puntos del índice, no en porcentaje, kilos ni dinero.', 'Si una rotación entra o sale del grupo de tres, no hay comparación completa y la barra aparece vacía con borde punteado (no determinado).']}
      ejemplo="Con «−20 % de lluvia», una barra de Agua amarilla más corta que la gris indica que, en el modelo, esa rotación queda más expuesta a la falta de lluvia." />
    <p className="mt-5 text-sm text-oliva">La lluvia y la temperatura pueden alterar ventanas elegibles, esperas, cobertura de agua, riesgo y ranking. Suelo o valor de mercado pueden variar si cambia la secuencia elegida; no son mejoras medidas en el terreno. Revisa la planificación y los motivos de cada propuesta.</p>
    <details className="mt-5 rounded-2xl border border-pino/20 bg-white/70 p-4"><summary className="cursor-pointer py-2 font-semibold">Ver las tres estrategias originales y sus motivos</summary>
      <div className="mt-4 grid min-w-0 items-start gap-5 xl:grid-cols-3">{original.rotaciones.estrategias.map((estrategia, indice) => <TarjetaEstrategia key={estrategia.id ?? indice} estrategia={estrategia} posicion={indice} />)}</div>
    </details>
    <h3 className="mt-8 font-campo text-2xl">Tres estrategias en el escenario seleccionado</h3>
    <div aria-label="Rotaciones del escenario seleccionado" className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-3">{modificado.rotaciones.estrategias.map((estrategia, indice) => <TarjetaEstrategia key={estrategia.id ?? indice} estrategia={estrategia} posicion={indice} />)}</div>
  </>;
}

export function SimuladorEscenarios({ terrenoId, contexto }: { terrenoId: string; contexto: readonly unknown[] }) {
  const sesion = useAgricultura(); const contenido = useId(); const lluviaId = useId(); const temperaturaId = useId();
  const [abierto, establecerAbierto] = useState(false);
  const [seleccionado, establecerSeleccionado] = useState(ESCENARIO_ORIGINAL);
  const [aplicado, establecerAplicado] = useState(ESCENARIO_ORIGINAL);
  useEffect(() => { const espera = window.setTimeout(() => establecerAplicado(seleccionado), 600); return () => window.clearTimeout(espera); }, [seleccionado]);
  const esOriginal = seleccionado.lluvia_pct === 0 && seleccionado.temp_delta === 0;
  const esperando = seleccionado.lluvia_pct !== aplicado.lluvia_pct || seleccionado.temp_delta !== aplicado.temp_delta;
  const clave = [...sesion.clave, 'escenarios', terrenoId, ...contexto, sesion.usuario?.prioridad_agua, sesion.usuario?.prioridad_suelo, sesion.usuario?.prioridad_ingresos];
  const opciones = { staleTime: 60000, retry: false, refetchOnWindowFocus: false } as const;
  const original = useQuery({ ...opciones, queryKey: [...clave, 0, 0], enabled: abierto && Boolean(sesion.token), queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerResultadosEscenario(token, terrenoId, ESCENARIO_ORIGINAL, signal), signal) });
  const simulado = useQuery({ ...opciones, queryKey: [...clave, aplicado.lluvia_pct, aplicado.temp_delta], enabled: abierto && original.isSuccess && !esOriginal && !esperando,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerResultadosEscenario(token, terrenoId, aplicado, signal), signal) });
  const nuevo = esOriginal ? original : simulado;
  const cargando = esperando || original.isPending || original.isFetching || (original.isSuccess && (nuevo.isPending || nuevo.isFetching));
  const error = original.error ?? nuevo.error;
  let errorComparacion: Error | null = null;
  let cambios: ReturnType<typeof compararEscenarios> = [];
  if (!cargando && !error && original.data && nuevo.data) {
    try { cambios = compararEscenarios(original.data, nuevo.data); } catch (problema: unknown) { errorComparacion = problema instanceof Error ? problema : new Error('No se pudieron comparar las referencias.'); }
  }
  function actualizar() { void original.refetch(); if (!esOriginal && !esperando) void simulado.refetch(); }
  const listo = !cargando && !error && !errorComparacion && original.data && nuevo.data && sesion.sigueActiva();
  function cambiar(campo: keyof EscenarioCalendario, valor: number) {
    if (!Number.isFinite(valor) || (campo === 'lluvia_pct' ? valor < -30 || valor > 30 : valor < -2 || valor > 2)) return;
    establecerSeleccionado((anterior) => ({ ...anterior, [campo]: valor }));
  }
  return <section aria-labelledby="titulo-escenarios" className="modulo modulo--maiz">
    <CabeceraModulo icono="deslizador" etiqueta="Explorar sin modificar tu parcela"><h2 id="titulo-escenarios" className="mt-1 break-words font-campo text-2xl sm:text-4xl">Simulador de escenarios climáticos</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">¿Qué cambiaría con más o menos lluvia y otra temperatura? Compara el calendario y las tres rotaciones con las mismas condiciones de referencia. Es una simulación hipotética, no una predicción verificada.</p>
    <button type="button" className="boton-secundario mt-5" aria-expanded={abierto} aria-controls={contenido} onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar simulador' : 'Abrir simulador de escenarios'}</button>
    {abierto && <div id={contenido} className="aparecer mt-6 min-w-0">
      <fieldset className="rounded-2xl border border-pino/20 bg-arena/60 p-5 sm:p-7"><legend className="px-2 font-semibold">Condiciones hipotéticas</legend>
        <div className="grid gap-7 sm:grid-cols-2"><div><label htmlFor={lluviaId} className="block font-semibold">Variación de lluvia</label><output htmlFor={lluviaId} className="mt-2 block font-campo text-3xl">{mostrarVariacion(seleccionado.lluvia_pct, ' %')}</output><input id={lluviaId} type="range" min={-30} max={30} step={1} value={seleccionado.lluvia_pct} aria-valuetext={`${mostrarVariacion(seleccionado.lluvia_pct)} por ciento respecto al original`} className="mt-4 min-h-11 w-full accent-pino" onChange={(evento) => cambiar('lluvia_pct', evento.currentTarget.valueAsNumber)} /><p className="text-xs text-oliva">−30 % menos lluvia · 0 % original · +30 % más lluvia</p></div>
          <div><label htmlFor={temperaturaId} className="block font-semibold">Variación de temperatura</label><output htmlFor={temperaturaId} className="mt-2 block font-campo text-3xl">{mostrarVariacion(seleccionado.temp_delta, ' °C')}</output><input id={temperaturaId} type="range" min={-2} max={2} step={0.5} value={seleccionado.temp_delta} aria-valuetext={`${mostrarVariacion(seleccionado.temp_delta)} grados Celsius respecto al original`} className="mt-4 min-h-11 w-full accent-pino" onChange={(evento) => cambiar('temp_delta', evento.currentTarget.valueAsNumber)} /><p className="text-xs text-oliva">−2 °C más frío · 0 °C original · +2 °C más cálido</p></div></div>
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" className="boton-secundario" disabled={esOriginal} onClick={() => { establecerSeleccionado(ESCENARIO_ORIGINAL); establecerAplicado(ESCENARIO_ORIGINAL); }}>Restaurar escenario original</button><button type="button" className="enlace-nav underline" disabled={cargando} onClick={actualizar}>Actualizar ambos escenarios</button></div>
        <p className="mt-4 text-sm leading-relaxed text-oliva">Original: lluvia 0 % y temperatura 0 °C de variación. Se aplica lluvia × (1 + porcentaje / 100) y se suma la variación a las temperaturas. Los datos históricos, el pronóstico y las siembras guardadas no se modifican.</p>
      </fieldset>
      <div className="mt-5" aria-live="polite" aria-busy={cargando}><EstadoConsulta cargando={cargando} error={error ?? errorComparacion} alReintentar={actualizar} />{cargando && <p className="mt-3 text-sm text-oliva">Actualizando el escenario seleccionado. Los resultados anteriores se ocultan para evitar confusiones.</p>}</div>
      {!cargando && error && <p className="mt-3 text-sm text-oliva">No hay una comparación fiable disponible. Reintenta; no se han fabricado recomendaciones.</p>}
      {listo && original.data && nuevo.data && <div>
        <div role="status" className="mt-6 rounded-2xl border border-pino/20 bg-white p-5"><p className="font-semibold">{esOriginal ? 'Escenario original seleccionado' : `Simulación: lluvia ${mostrarVariacion(seleccionado.lluvia_pct, ' %')}, temperatura ${mostrarVariacion(seleccionado.temp_delta, ' °C')}`}</p>
          <p className="mt-2">{cambios.length} de {nuevo.data.calendario.celdas.length} celdas cambian de estado respecto al original.</p><p className="mt-2 text-sm text-oliva">{cambios.length === 0 ? 'Sin cambios de clasificación con estos parámetros; los motivos y los índices pueden variar.' : 'Consulta las celdas marcadas y sus motivos antes de tomar una decisión.'}</p>
          <p className="mt-3 text-sm">Fuente base: NASA POWER, {original.data.calendario.clima.periodo.inicio}–{original.data.calendario.clima.periodo.fin}. Consulta: {new Date(original.data.calendario.clima.actualizado_en).toLocaleDateString('es-EC')}. Origen: {original.data.calendario.clima.estado_datos}. {original.data.calendario.clima.resolucion}</p>
          {(original.data.calendario.clima.desactualizado || nuevo.data.calendario.clima.desactualizado) && <p className="mt-3 font-semibold">Dato climático desactualizado: interpretar con precaución.</p>}
          <p className="mt-3 text-sm">Inicio común de rotaciones: {original.data.rotaciones.inicio_comun}. Indicadores 0–100 de la heurística referencial; no son mediciones ni ingresos monetarios.</p>
        </div>
        {[...new Set([...original.data.calendario.clima.advertencias, ...nuevo.data.calendario.clima.advertencias, ...original.data.rotaciones.advertencias, ...nuevo.data.rotaciones.advertencias])].map((aviso) => <p key={aviso} className="panel-aviso mt-4 text-sm">{aviso}</p>)}
        <MatrizEscenarios key={`${seleccionado.lluvia_pct}:${seleccionado.temp_delta}`} original={original.data} modificado={nuevo.data} />
        <ComparacionRotaciones original={original.data} modificado={nuevo.data} />
        <p className="panel-fuente mt-7 text-sm leading-relaxed">Se conservan las restricciones y los resultados no determinados cuando falta información. El clima es regional; el catálogo y las fórmulas requieren validación agronómica local. La simulación no reemplaza la experiencia del agricultor ni el criterio del técnico y no garantiza cosechas, ahorro de agua o ingresos.</p>
      </div>}
    </div>}
  </section>;
}
