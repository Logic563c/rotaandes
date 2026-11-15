import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerRotaciones } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { EstadoCalendario, EstrategiaRotacion } from '../types/api';
import { EstadoConsulta } from './EstadoConsulta';
import { CabeceraModulo, Icono } from './Iconos';
import { AyudaGrafica, LecturaRapidaGrafica, TipoDato } from './AyudaGrafica';
import type { NombreIcono } from './Iconos';

const ESTADOS: Record<EstadoCalendario, string> = { recomendado: '✓ Compatible según la regla referencial', posible_con_cuidado: '! Posible con cuidado', no_recomendado: '× Restricción comprobada', no_determinado: '? Información insuficiente' };
const INDICADORES: readonly { clave: 'agua' | 'suelo' | 'riesgo' | 'ingresos' | 'total'; nombre: string; icono: NombreIcono; color: string }[] = [
  { clave: 'agua', nombre: 'Agua', icono: 'gota', color: '#1f6391' }, { clave: 'suelo', nombre: 'Suelo', icono: 'hoja', color: '#2f7d43' },
  { clave: 'riesgo', nombre: 'Compatibilidad climática', icono: 'copo', color: '#c8921f' }, { clave: 'ingresos', nombre: 'Valor de mercado referencial', icono: 'moneda', color: '#a3492a' },
  { clave: 'total', nombre: 'Total ponderado', icono: 'rotacion', color: '#1d4636' }];
const ESTILO_ESTADO: Record<EstadoCalendario, string> = { recomendado: 'chip--cultivo', posible_con_cuidado: 'chip--maiz', no_recomendado: 'chip--arcilla', no_determinado: 'chip--gris' };
const ACENTOS = ['#1d4636', '#2f7d43', '#1f6391'];
const mostrarFecha = (fecha: string) => new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${fecha}T00:00:00Z`));
function ListaFactores({ titulo, valores }: { titulo: string; valores: string[] }) {
  return valores.length > 0 ? <div className="mt-5"><h4 className="font-semibold">{titulo}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-oliva">{valores.map((valor, indice) => <li key={indice}>{valor}</li>)}</ul></div> : null;
}
export function TarjetaEstrategia({ estrategia, posicion }: { estrategia: EstrategiaRotacion; posicion: number }) {
  const titulo = useId(); const lecturaId = useId();
  return <article aria-labelledby={titulo} className="tarjeta tarjeta--acento min-w-0 p-5 sm:p-6" style={{ '--acento': ACENTOS[posicion] ?? '#1d4636' } as CSSProperties}>
    <p className="etiqueta-seccion">{estrategia.es_actual ? 'Referencia del historial' : `Alternativa ${posicion}`}</p>
    <h3 id={titulo} className="mt-3 break-words font-campo text-2xl">{estrategia.nombre}</h3>
    <p className={`chip mt-4 px-4 py-2 text-sm ${ESTILO_ESTADO[estrategia.estado]}`}>{ESTADOS[estrategia.estado]}</p>
    {estrategia.secuencia.length > 0 ? <ol aria-label={`Secuencia de ${estrategia.nombre}`} className="mt-5 space-y-3">{estrategia.planificacion.map((paso, indice) => <li key={indice} className="rounded-2xl border border-pino/15 bg-crema/70 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pino text-xs text-white">{indice + 1}<span className="sr-only">.</span></span> {paso.nombre}</p>
      <p className="mt-1 text-oliva">{paso.inicio_estimado && paso.fin_estimado ? `${mostrarFecha(paso.inicio_estimado)} → ${mostrarFecha(paso.fin_estimado)}` : 'Fechas no determinadas'}</p>
      <p className="mt-1 text-xs text-oliva">Ciclo referencial: {paso.ciclo_meses ?? 'sin dato'} meses. {paso.espera_meses === null ? 'Espera no determinada.' : `Espera previa: ${paso.espera_meses} meses.`}</p>
      <details className="mt-2"><summary className="cursor-pointer py-2 font-semibold">Ver criterio del calendario</summary><p className="mt-2 leading-relaxed text-oliva">{paso.motivo}</p></details>
    </li>)}</ol> : <p className="mt-5 text-sm text-oliva">No hay una secuencia verificable para esta posición. No se ha completado con cultivos inventados.</p>}
    <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-oliva"><TipoDato tipo="indice" /><span>Escala de 0 a 100: barra más larga = más favorable dentro del modelo.</span></div>
    <LecturaRapidaGrafica id={lecturaId} texto="Compara la misma fila entre opciones: una barra más larga es más favorable en el modelo, también en compatibilidad climática; más corta, menos. Son puntajes, no cosechas ni dinero. «No determinado» significa que faltan datos." />
    <dl aria-describedby={lecturaId} className="mt-3 space-y-4 rounded-2xl bg-crema/70 p-4">{INDICADORES.map(({ clave, nombre, icono, color }) => {
      const valor = estrategia.puntajes[clave];
      return <div key={clave} className={clave === 'total' ? 'border-t border-pino/15 pt-4' : ''}><div className="flex flex-wrap justify-between gap-2 text-sm"><dt className="flex items-center gap-2 font-semibold"><Icono nombre={icono} className="size-4 shrink-0" />{nombre}</dt><dd className={clave === 'total' ? 'font-bold' : ''}>{valor === null ? 'No determinado' : `${valor.toLocaleString('es-EC', { maximumFractionDigits: 2 })}/100`}</dd></div>
        {valor !== null ? <div aria-hidden="true" className={`relative mt-2 overflow-hidden rounded-full bg-arena ${clave === 'total' ? 'h-3' : 'h-2'}`}><div className="h-full rounded-full" style={{ width: `${valor}%`, background: color }} /><span className="absolute inset-y-0 left-1/2 w-px bg-white" /></div>
          : <div aria-hidden="true" className="mt-2 h-2 rounded-full border border-dashed border-stone-400" />}</div>;
    })}<div aria-hidden="true" className="flex justify-between text-[11px] text-oliva"><span>0</span><span>50</span><span>100</span></div></dl>
    <p className="mt-6 text-sm leading-relaxed">{estrategia.por_que}</p>
    <details className="mt-5 rounded-xl border border-pino/15 bg-white/70 p-3"><summary className="cursor-pointer py-2 text-sm font-semibold">Evidencia, ventajas y límites</summary>
      <ListaFactores titulo="Evidencia utilizada" valores={estrategia.evidencia} /><ListaFactores titulo="Atributos potencialmente favorables del catálogo" valores={estrategia.beneficios} />
      <ListaFactores titulo="Riesgos y restricciones" valores={estrategia.riesgos} /><ListaFactores titulo="Vacíos de información" valores={estrategia.vacios_informacion} />
      <p className="mt-5 text-sm leading-relaxed text-oliva">{estrategia.aviso}</p>
    </details>
  </article>;
}
export function ComparadorRotaciones({ terrenoId, contexto }: { terrenoId: string; contexto: readonly unknown[] }) {
  const sesion = useAgricultura(); const [abierto, establecerAbierto] = useState(false); const contenido = useId();
  const consulta = useQuery({ queryKey: [...sesion.clave, 'rotaciones', terrenoId, ...contexto, sesion.usuario?.prioridad_agua, sesion.usuario?.prioridad_suelo, sesion.usuario?.prioridad_ingresos, 0, 0], enabled: abierto,
    staleTime: 0, queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerRotaciones(token, terrenoId, undefined, signal), signal) });
  const datos = consulta.data;
  return <section aria-labelledby="titulo-rotaciones" className="modulo modulo--arcilla">
    <CabeceraModulo icono="rotacion" etiqueta="Explorar opciones para tu tierra"><h2 id="titulo-rotaciones" className="mt-1 break-words font-campo text-2xl sm:text-4xl">Comparador de rotaciones</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Tu patrón registrado y dos alternativas del catálogo bajo condiciones comunes. Los puntajes son índices de una heurística referencial: un valor mayor es más favorable dentro del modelo; no representa probabilidades, dinero ni resultados medidos.</p>
    <button className="boton-secundario mt-5" type="button" aria-expanded={abierto} aria-controls={contenido} onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar comparador' : 'Comparar rotaciones'}</button>
    {abierto && <div id={contenido} className="aparecer mt-6 min-w-0"><EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} />
      {consulta.isSuccess && datos && <><div className="panel-fuente text-sm leading-relaxed">
        <p className="font-semibold">Horizonte inicial común: {mostrarFecha(datos.inicio_comun)}. Se esperan ventanas permitidas entre ciclos; no es una fecha de cosecha observada.</p>
        <p className="mt-2">Prioridades del propietario: agua {datos.metodologia.prioridades.agua ?? 'sin dato'}, suelo {datos.metodologia.prioridades.suelo ?? 'sin dato'}, ingresos {datos.metodologia.prioridades.ingresos ?? 'sin dato'}. Peso climático fijo: {datos.metodologia.peso_riesgo}.</p>
        <p className="mt-2">Escenario aplicado: lluvia {datos.escenario.lluvia_pct} %, temperatura {datos.escenario.temp_delta} °C.</p>
        {datos.clima ? <><p className="mt-2">Fuente climática: <a className="underline" target="_blank" rel="noreferrer" href="https://power.larc.nasa.gov/docs/">NASA POWER</a>, {datos.clima.periodo.inicio}–{datos.clima.periodo.fin}. Consulta: {new Date(datos.clima.actualizado_en).toLocaleDateString('es-EC')}.</p>
          <p className="mt-2">Origen: {datos.clima.estado_datos}{datos.clima.desactualizado ? ' · Dato desactualizado' : ''}. {datos.clima.resolucion}</p></> : <p className="mt-2 font-semibold">Climatología no disponible: no se determina el ranking.</p>}
        <p className="mt-3 font-semibold">Catálogo y fórmulas referenciales, pendientes de validación agronómica local.</p>
      </div>
        {[...datos.advertencias, ...(datos.clima?.advertencias ?? [])].map((aviso, indice) => <p role="status" key={indice} className="panel-aviso mt-4 text-sm">{aviso}</p>)}
        {datos.estrategias.some((valor) => valor.id === null) && <p role="status" className="mt-5 rounded-xl border border-stone-400 bg-stone-100 p-4 text-sm">No hay dos alternativas con información suficiente. Revisa las limitaciones; no se han inventado recomendaciones.</p>}
        <button className="enlace-nav mt-4 underline" type="button" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>{consulta.isFetching ? 'Actualizando comparación…' : 'Actualizar comparación'}</button>
        <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-3">{datos.estrategias.map((estrategia, indice) => <TarjetaEstrategia key={estrategia.id ?? `sin-dato-${indice}`} estrategia={estrategia} posicion={indice} />)}</div>
        <AyudaGrafica queMuestra="Cada tarjeta es una rotación. Las barras de colores muestran cinco índices del modelo de RotaAndes: agua, suelo, compatibilidad climática, valor de mercado referencial y el total ponderado con tus prioridades."
          ejeHorizontal="La longitud de cada barra va de 0 (izquierda) a 100 (derecha). La marca blanca del centro señala 50."
          ejeVertical="No hay eje vertical: cada fila es un índice distinto. Los índices no tienen unidades (no son litros, kilos ni dólares)."
          colores={INDICADORES.map(({ nombre, color }) => ({ color, texto: nombre, trazo: 'barra' as const }))}
          lectura="Una barra larga indica que la rotación es más favorable en ese aspecto según las reglas del modelo; una barra corta, menos favorable. Compara la misma barra entre las tres tarjetas. Una barra vacía con borde punteado significa «No determinado» por falta de datos."
          precauciones={['Son índices de una heurística referencial, no probabilidades, cosechas ni ingresos medidos.', 'El catálogo de cultivos y las fórmulas están pendientes de validación agronómica local.', 'Una diferencia de pocos puntos no es importante: lee también el porqué, los riesgos y los vacíos de información.']}
          ejemplo="Si una alternativa tiene la barra verde de Suelo más larga que tu rotación actual, el modelo considera que alterna mejor las familias o aporta más al suelo. Revisa luego sus riesgos antes de decidir." />
        <details className="mt-6 rounded-2xl border border-pino/20 bg-white/70 p-5 text-sm leading-relaxed"><summary className="cursor-pointer py-2 font-semibold">Cómo se calculan los indicadores</summary>
          <p className="mt-3">Escala del catálogo: N(x)=25×(x−1). Agua combina demanda inversa, tolerancia a sequía y cobertura referencial de lluvia/riego. Suelo promedia fijación de nitrógeno, materia orgánica y protección de erosión, y resta hasta 25 puntos por familias compartidas. Clima combina tolerancias y severidad heurística durante los ciclos. Valor de mercado es el promedio normalizado del catálogo, sin ingresos monetarios.</p>
          <p className="mt-3">Total = (agua×prioridad de agua + suelo×prioridad de suelo + clima×3 + valor de mercado×prioridad de ingresos) / suma de esos cuatro pesos. Un dato esencial ausente conserva el total no determinado. No es un modelo agronómico validado.</p>
        </details><p className="mt-6 text-sm leading-relaxed text-oliva">{datos.aviso}</p>
      </>}
    </div>}
  </section>;
}
