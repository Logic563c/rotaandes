import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MesClima } from '../types/api';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export function GraficasClima({ mensual }: { mensual: MesClima[] }) {
  const filas = mensual.map((mes) => ({ ...mes, nombre: MESES[mes.mes - 1] }));
  const hayLluvia = mensual.some((mes) => mes.lluvia_mm !== null);
  const hayTemperatura = mensual.some((mes) => mes.t_min !== null || mes.t_med !== null || mes.t_max !== null);
  return <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-2">
    <figure className="tarjeta min-w-0 p-4 sm:p-6" aria-label="Gráfica de lluvia mensual estimada">
      <figcaption className="mb-5"><h3 className="text-lg font-semibold">Lluvia mensual estimada</h3><p className="mt-1 text-xs text-oliva">Milímetros por mes. Los datos ausentes no se representan como cero.</p></figcaption>
      {hayLluvia ? <ResponsiveContainer width="100%" height={270} minWidth={0} initialDimension={{ width: 500, height: 270 }}>
        <BarChart data={filas} accessibilityLayer margin={{ top: 8, right: 6, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" /><XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} /><YAxis width={45} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="lluvia_mm" name="Lluvia estimada" unit=" mm" fill="#446957" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart>
      </ResponsiveContainer> : <p className="py-12 text-sm text-oliva">No hay datos válidos de lluvia para graficar.</p>}
    </figure>
    <figure className="tarjeta min-w-0 p-4 sm:p-6" aria-label="Gráfica de temperaturas climatológicas">
      <figcaption className="mb-5"><h3 className="text-lg font-semibold">Temperaturas climatológicas</h3><p className="mt-1 text-xs text-oliva">Grados Celsius (°C), a 2 m. Mínima, media y máxima del producto NASA.</p></figcaption>
      {hayTemperatura ? <ResponsiveContainer width="100%" height={270} minWidth={0} initialDimension={{ width: 500, height: 270 }}>
        <LineChart data={filas} accessibilityLayer margin={{ top: 8, right: 6, left: 0, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" /><XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} /><YAxis width={40} tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="t_min" name="Mínima" unit=" °C" stroke="#436b94" strokeDasharray="5 3" connectNulls={false} isAnimationActive={false} dot={{ r: 2 }} />
          <Line dataKey="t_med" name="Media" unit=" °C" stroke="#23483c" strokeWidth={2} connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} />
          <Line dataKey="t_max" name="Máxima" unit=" °C" stroke="#985535" strokeDasharray="2 3" connectNulls={false} isAnimationActive={false} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer> : <p className="py-12 text-sm text-oliva">No hay temperaturas válidas para graficar.</p>}
    </figure>
  </div>;
}
