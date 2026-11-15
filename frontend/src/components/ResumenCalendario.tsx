import { useId, useState } from 'react';
import type { RespuestaCalendario, EstadoCalendario } from '../types/api';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const GRUPOS: { estado: EstadoCalendario; titulo: string; simbolo: string; estilo: string }[] = [
  { estado: 'recomendado', titulo: 'Recomendado', simbolo: '✓', estilo: 'border-cultivo/40 bg-cultivo-claro' },
  { estado: 'posible_con_cuidado', titulo: 'Posible con precaución', simbolo: '!', estilo: 'border-maiz bg-maiz-claro' },
  { estado: 'no_recomendado', titulo: 'No recomendado', simbolo: '×', estilo: 'border-arcilla/30 bg-arcilla-claro' },
  { estado: 'no_determinado', titulo: 'No determinado: faltan datos o fuentes', simbolo: '?', estilo: 'border-stone-300 bg-stone-100' },
];
export function ResumenCalendario({ datos }: { datos: RespuestaCalendario }) {
  const id = useId();
  const [mes, establecerMes] = useState(() => Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date())));
  return <section aria-label="Resumen del calendario" className="mb-6 rounded-3xl border border-cultivo/25 bg-gradient-to-br from-cultivo-claro/70 to-white p-5 sm:p-6"><h3 className="font-campo text-2xl">Para empezar: un mes a la vez</h3><p className="mt-2 text-sm leading-relaxed text-oliva">Este resumen lee el calendario calculado del escenario original: indica qué puedes sembrar o trasplantar en el mes elegido, evaluando todo el ciclo de cada cultivo. No es un pronóstico ni una garantía de cosecha. Abre una casilla de la matriz para conocer todos los motivos.</p>
    <label className="campo mt-4 max-w-xs" htmlFor={id}>Mes que quieres revisar<select id={id} value={mes} onChange={(evento) => establecerMes(Number(evento.target.value))}>{MESES.map((nombre, indice) => <option key={nombre} value={indice + 1}>{nombre}</option>)}</select></label>
    <dl className="mt-5 grid gap-3 sm:grid-cols-2">{GRUPOS.map((grupo) => { const cultivos = datos.cultivos.filter((cultivo) => (datos.celdas.find((celda) => celda.cultivo_id === cultivo.id && celda.mes === mes)?.estado ?? 'no_determinado') === grupo.estado); return <div className={`rounded-2xl border p-4 ${grupo.estilo}`} key={grupo.estado}><dt className="flex items-start gap-2 font-semibold"><span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white font-bold">{grupo.simbolo}</span><span>{grupo.titulo} ({cultivos.length})</span></dt><dd className="mt-2 text-sm leading-relaxed text-pino">{cultivos.length ? cultivos.map((cultivo) => cultivo.nombre).join(', ') : 'Ningún cultivo en este grupo.'}</dd></div>; })}</dl>
    <p className="mt-4 text-sm leading-relaxed text-oliva">Fuente: climatología NASA POWER {datos.clima.periodo.inicio}–{datos.clima.periodo.fin} y parámetros agronómicos de INIAP y FAO, pendientes de validación local.{datos.clima.desactualizado && ' Atención: se utiliza información desactualizada, identificada en el detalle.'} Las restricciones y la falta de datos no se ocultan.</p>
  </section>;
}
