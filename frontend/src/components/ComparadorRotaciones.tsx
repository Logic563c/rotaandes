import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerRotaciones } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { EstadoCalendario, EstrategiaRotacion } from '../types/api';
import { EstadoConsulta } from './EstadoConsulta';

const ESTADOS: Record<EstadoCalendario, string> = { recomendado: '✓ Compatible según la regla referencial', posible_con_cuidado: '! Posible con cuidado', no_recomendado: '× Restricción comprobada', no_determinado: '? Información insuficiente' };
const INDICADORES = [{ clave: 'agua', nombre: 'Agua' }, { clave: 'suelo', nombre: 'Suelo' }, { clave: 'riesgo', nombre: 'Compatibilidad climática' }, { clave: 'ingresos', nombre: 'Valor de mercado referencial' }, { clave: 'total', nombre: 'Total ponderado' }] as const;
const mostrarFecha = (fecha: string) => new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${fecha}T00:00:00Z`));
function ListaFactores({ titulo, valores }: { titulo: string; valores: string[] }) {
  return valores.length > 0 ? <div className="mt-5"><h4 className="font-semibold">{titulo}</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-oliva">{valores.map((valor, indice) => <li key={indice}>{valor}</li>)}</ul></div> : null;
}
function TarjetaEstrategia({ estrategia, posicion }: { estrategia: EstrategiaRotacion; posicion: number }) {
  const titulo = useId();
  return <article aria-labelledby={titulo} className="tarjeta min-w-0 p-5 sm:p-6">
    <p className="etiqueta-seccion">{estrategia.es_actual ? 'Referencia del historial' : `Alternativa ${posicion}`}</p>
    <h3 id={titulo} className="mt-3 break-words font-campo text-2xl">{estrategia.nombre}</h3>
    <p className="mt-4 rounded-xl border border-pino/25 bg-arena/60 p-3 text-sm font-semibold">{ESTADOS[estrategia.estado]}</p>
    {estrategia.secuencia.length > 0 ? <ol aria-label={`Secuencia de ${estrategia.nombre}`} className="mt-5 space-y-3">{estrategia.planificacion.map((paso, indice) => <li key={indice} className="rounded-xl border border-pino/15 bg-white/80 p-3 text-sm">
      <p className="font-semibold">{indice + 1}. {paso.nombre}</p>
      <p className="mt-1 text-oliva">{paso.inicio_estimado && paso.fin_estimado ? `${mostrarFecha(paso.inicio_estimado)} → ${mostrarFecha(paso.fin_estimado)}` : 'Fechas no determinadas'}</p>
      <p className="mt-1 text-xs text-oliva">Ciclo referencial: {paso.ciclo_meses ?? 'sin dato'} meses. {paso.espera_meses === null ? 'Espera no determinada.' : `Espera previa: ${paso.espera_meses} meses.`}</p>
      <details className="mt-2"><summary className="cursor-pointer py-2 font-semibold">Ver criterio del calendario</summary><p className="mt-2 leading-relaxed text-oliva">{paso.motivo}</p></details>
    </li>)}</ol> : <p className="mt-5 text-sm text-oliva">No hay una secuencia verificable para esta posición. No se ha completado con cultivos inventados.</p>}
    <dl className="mt-6 space-y-4">{INDICADORES.map(({ clave, nombre }) => {
      const valor = estrategia.puntajes[clave];
      return <div key={clave}><div className="flex flex-wrap justify-between gap-2 text-sm"><dt className="font-semibold">{nombre}</dt><dd>{valor === null ? 'No determinado' : `${valor.toLocaleString('es-EC', { maximumFractionDigits: 2 })}/100`}</dd></div>
        {valor !== null && <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-arena"><div className={`h-full rounded-full ${clave === 'total' ? 'bg-arcilla' : 'bg-pino'}`} style={{ width: `${valor}%` }} /></div>}</div>;
    })}</dl>
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
  return <section aria-labelledby="titulo-rotaciones" className="mt-12 min-w-0 border-t border-pino/15 pt-9">
    <p className="etiqueta-seccion">Explorar opciones para tu tierra</p><h2 id="titulo-rotaciones" className="mt-3 font-campo text-3xl sm:text-4xl">Comparador de rotaciones</h2>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Tu patrón registrado y dos alternativas del catálogo bajo condiciones comunes. Los puntajes son índices de una heurística referencial: un valor mayor es más favorable dentro del modelo; no representa probabilidades, dinero ni resultados medidos.</p>
    <button className="boton-secundario mt-5" type="button" aria-expanded={abierto} aria-controls={contenido} onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar comparador' : 'Comparar rotaciones'}</button>
    {abierto && <div id={contenido} className="mt-6 min-w-0"><EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} />
      {consulta.isSuccess && datos && <><div className="rounded-2xl border border-pino/20 bg-arena/50 p-5 text-sm leading-relaxed">
        <p className="font-semibold">Horizonte inicial común: {mostrarFecha(datos.inicio_comun)}. Se esperan ventanas permitidas entre ciclos; no es una fecha de cosecha observada.</p>
        <p className="mt-2">Prioridades del propietario: agua {datos.metodologia.prioridades.agua ?? 'sin dato'}, suelo {datos.metodologia.prioridades.suelo ?? 'sin dato'}, ingresos {datos.metodologia.prioridades.ingresos ?? 'sin dato'}. Peso climático fijo: {datos.metodologia.peso_riesgo}.</p>
        <p className="mt-2">Escenario aplicado: lluvia {datos.escenario.lluvia_pct} %, temperatura {datos.escenario.temp_delta} °C.</p>
        {datos.clima ? <><p className="mt-2">Fuente climática: <a className="underline" target="_blank" rel="noreferrer" href="https://power.larc.nasa.gov/docs/">NASA POWER</a>, {datos.clima.periodo.inicio}–{datos.clima.periodo.fin}. Consulta: {new Date(datos.clima.actualizado_en).toLocaleDateString('es-EC')}.</p>
          <p className="mt-2">Origen: {datos.clima.estado_datos}{datos.clima.desactualizado ? ' · Dato desactualizado' : ''}. {datos.clima.resolucion}</p></> : <p className="mt-2 font-semibold">Climatología no disponible: no se determina el ranking.</p>}
        <p className="mt-3 font-semibold">Catálogo y fórmulas referenciales, pendientes de validación agronómica local.</p>
      </div>
        {[...datos.advertencias, ...(datos.clima?.advertencias ?? [])].map((aviso, indice) => <p role="status" key={indice} className="mt-4 rounded-xl border border-arcilla/30 bg-white p-4 text-sm">{aviso}</p>)}
        {datos.estrategias.some((valor) => valor.id === null) && <p role="status" className="mt-5 rounded-xl border border-stone-400 bg-stone-100 p-4 text-sm">No hay dos alternativas con información suficiente. Revisa las limitaciones; no se han inventado recomendaciones.</p>}
        <button className="enlace-nav mt-4 underline" type="button" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>{consulta.isFetching ? 'Actualizando comparación…' : 'Actualizar comparación'}</button>
        <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-3">{datos.estrategias.map((estrategia, indice) => <TarjetaEstrategia key={estrategia.id ?? `sin-dato-${indice}`} estrategia={estrategia} posicion={indice} />)}</div>
        <details className="mt-6 rounded-2xl border border-pino/20 bg-white/70 p-5 text-sm leading-relaxed"><summary className="cursor-pointer py-2 font-semibold">Cómo se calculan los indicadores</summary>
          <p className="mt-3">Escala del catálogo: N(x)=25×(x−1). Agua combina demanda inversa, tolerancia a sequía y cobertura referencial de lluvia/riego. Suelo promedia fijación de nitrógeno, materia orgánica y protección de erosión, y resta hasta 25 puntos por familias compartidas. Clima combina tolerancias y severidad heurística durante los ciclos. Valor de mercado es el promedio normalizado del catálogo, sin ingresos monetarios.</p>
          <p className="mt-3">Total = (agua×prioridad de agua + suelo×prioridad de suelo + clima×3 + valor de mercado×prioridad de ingresos) / suma de esos cuatro pesos. Un dato esencial ausente conserva el total no determinado. No es un modelo agronómico validado.</p>
        </details><p className="mt-6 text-sm leading-relaxed text-oliva">{datos.aviso}</p>
      </>}
    </div>}
  </section>;
}
