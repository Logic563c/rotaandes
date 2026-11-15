import { useId, useState } from 'react';
import type { CeldaCalendario, RespuestaCalendario, EstadoCalendario } from '../types/api';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const GRUPOS: { estado: EstadoCalendario; titulo: string; simbolo: string; estilo: string }[] = [
  { estado: 'recomendado', titulo: 'Recomendado', simbolo: '✓', estilo: 'border-cultivo/40 bg-cultivo-claro' },
  { estado: 'posible_con_cuidado', titulo: 'Posible con precaución', simbolo: '!', estilo: 'border-maiz bg-maiz-claro' },
  { estado: 'no_recomendado', titulo: 'No recomendado', simbolo: '×', estilo: 'border-arcilla/30 bg-arcilla-claro' },
  { estado: 'no_determinado', titulo: 'No determinado: faltan datos o fuentes', simbolo: '?', estilo: 'border-stone-300 bg-stone-100' },
];
export function ResumenCalendario({ datos, alSeleccionar }: { datos: RespuestaCalendario; alSeleccionar?: (celda: CeldaCalendario) => void }) {
  const id = useId();
  const [mes, establecerMes] = useState(() => Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date())));
  // La API valida una única casilla por cultivo y mes. Se cuentan esas mismas casillas,
  // sin volver a evaluar criterios ni convertir una ausencia en una precaución.
  const celdas = datos.celdas.filter((celda) => celda.mes === mes);
  const nombres = new Map(datos.cultivos.map((cultivo) => [cultivo.id, cultivo.nombre]));
  const esUniforme = celdas.length > 0 && celdas.every((celda) => celda.estado === celdas[0]?.estado);
  return <section aria-label="Resumen del calendario" className="mb-6 rounded-3xl border border-cultivo/25 bg-gradient-to-br from-cultivo-claro/70 to-white p-5 sm:p-6"><h3 className="font-campo text-2xl">Para empezar: un mes a la vez</h3><p className="mt-2 text-sm leading-relaxed text-oliva">Este resumen lee las mismas casillas de la matriz del escenario original: indica qué puedes sembrar o trasplantar en el mes elegido, evaluando todo el ciclo de cada cultivo. No es un pronóstico ni una garantía de cosecha.</p>
    <label className="campo mt-4 max-w-xs" htmlFor={id}>Mes que quieres revisar<select id={id} value={mes} onChange={(evento) => establecerMes(Number(evento.target.value))}>{MESES.map((nombre, indice) => <option key={nombre} value={indice + 1}>{nombre}</option>)}</select></label>
    <p className="mt-3 text-sm text-oliva" role="status">{MESES[mes - 1]}: {celdas.length} cultivos evaluados. Incluye todos los cultivos; los filtros de la matriz no cambian este total.{alSeleccionar && ' Selecciona un cultivo del resumen para ver sus motivos.'}</p>
    {esUniforme && <p className="mt-3 text-sm leading-relaxed text-oliva">Todos tienen el mismo estado este mes, pero pueden tener motivos distintos. Revisa el detalle de cada cultivo.</p>}
    <dl className="mt-5 grid gap-3 sm:grid-cols-2">{GRUPOS.map((grupo) => {
      const delGrupo = celdas.filter((celda) => celda.estado === grupo.estado);
      return <div className={`rounded-2xl border p-4 ${grupo.estilo}`} key={grupo.estado}>
        <dt className="flex items-start gap-2 font-semibold"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white font-bold">{grupo.simbolo}</span><span>{grupo.titulo} ({delGrupo.length})</span></dt>
        <dd className="mt-2 text-sm leading-relaxed text-pino">{delGrupo.length ? <ul className="flex flex-wrap gap-2">{delGrupo.map((celda) => <li key={celda.cultivo_id}>{alSeleccionar ? <button type="button" className="min-h-11 rounded-lg border border-pino/20 bg-white/80 px-3 py-2 text-left underline underline-offset-2 hover:bg-white" aria-label={`Ver motivos de ${nombres.get(celda.cultivo_id)} en ${MESES[mes - 1]}`} onClick={() => alSeleccionar(celda)}>{nombres.get(celda.cultivo_id)}</button> : nombres.get(celda.cultivo_id)}</li>)}</ul> : 'Ningún cultivo en este grupo.'}</dd>
      </div>;
    })}</dl>
    <p className="mt-4 text-sm leading-relaxed text-oliva">Fuente: climatología NASA POWER {datos.clima.periodo.inicio}–{datos.clima.periodo.fin} y parámetros agronómicos de INIAP y FAO, pendientes de validación local.{datos.clima.desactualizado && ' Atención: se utiliza información desactualizada, identificada en el detalle.'} Las restricciones y la falta de datos no se ocultan.</p>
  </section>;
}
