import { useId, useState } from 'react';
import type { RespuestaCalendario, EstadoCalendario } from '../types/api';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const GRUPOS: { estado: EstadoCalendario; titulo: string }[] = [
  { estado: 'recomendado', titulo: 'Recomendado según la regla referencial' },
  { estado: 'posible_con_cuidado', titulo: 'Posible con cuidado' },
  { estado: 'no_recomendado', titulo: 'No recomendado' },
  { estado: 'no_determinado', titulo: 'No determinado: falta información esencial' },
];
export function ResumenCalendario({ datos }: { datos: RespuestaCalendario }) {
  const id = useId();
  const [mes, establecerMes] = useState(() => Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date())));
  return <section aria-label="Resumen del calendario" className="tarjeta mb-6 p-5 sm:p-6"><h3 className="font-campo text-2xl">Para empezar: un mes a la vez</h3><p className="mt-2 text-sm leading-relaxed text-oliva">Este resumen lee el calendario calculado del escenario original. No es un pronóstico ni una garantía de cosecha. Abre una celda de la matriz para conocer todos los motivos.</p>
    <label className="campo mt-4 max-w-xs" htmlFor={id}>Mes que quieres revisar<select id={id} value={mes} onChange={(evento) => establecerMes(Number(evento.target.value))}>{MESES.map((nombre, indice) => <option key={nombre} value={indice + 1}>{nombre}</option>)}</select></label>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2">{GRUPOS.map((grupo) => { const cultivos = datos.cultivos.filter((cultivo) => (datos.celdas.find((celda) => celda.cultivo_id === cultivo.id && celda.mes === mes)?.estado ?? 'no_determinado') === grupo.estado); return <div className="rounded-xl border border-pino/15 p-4" key={grupo.estado}><dt className="font-semibold">{grupo.titulo} ({cultivos.length})</dt><dd className="mt-2 text-sm leading-relaxed text-oliva">{cultivos.length ? cultivos.map((cultivo) => cultivo.nombre).join(', ') : 'Ningún cultivo en este grupo.'}</dd></div>; })}</dl>
    <p className="mt-4 text-sm leading-relaxed text-oliva">Fuente: climatología NASA POWER {datos.clima.periodo.inicio}–{datos.clima.periodo.fin} y catálogo agrícola referencial, pendiente de validación local.{datos.clima.desactualizado && ' Atención: se utiliza información desactualizada, identificada en el detalle.'} Las restricciones y la falta de datos no se ocultan.</p>
  </section>;
}
