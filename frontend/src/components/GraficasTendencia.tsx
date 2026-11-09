import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnioTendencia } from '../types/tendencia';

export function GraficasTendencia({ anual }: { anual: AnioTendencia[] }) {
  return <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-2">
    {([{ campo: 'lluvia_mm', titulo: 'Precipitación anual', unidad: ' mm', color: '#446957', barras: true },
      { campo: 't_min', titulo: 'Menor mínima mensual del año', unidad: ' °C', color: '#436b94', barras: false },
      { campo: 'dias_helada', titulo: 'Días de helada modelados', unidad: ' días', color: '#985535', barras: true }] as const).map((grafica) => <figure key={grafica.campo} aria-label={`Gráfica: ${grafica.titulo}`} className="tarjeta min-w-0 p-4 sm:p-6">
      <figcaption className="mb-4"><h3 className="font-semibold">{grafica.titulo}</h3><p className="mt-2 text-xs text-oliva">2005–2024 · {grafica.unidad.trim()}. Los años incompletos se muestran como huecos, nunca como cero.</p></figcaption>
      {anual.some((fila) => fila[grafica.campo] !== null) ? <ResponsiveContainer width="100%" height={250} minWidth={0} initialDimension={{ width: 500, height: 250 }}>
        {grafica.barras ? <BarChart data={anual} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#deded0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="anio" interval="preserveStartEnd" minTickGap={20} tick={{ fontSize: 11 }} /><YAxis width={50} tick={{ fontSize: 11 }} allowDecimals={grafica.campo !== 'dias_helada'} domain={[0, 'auto']} /><Tooltip />
          <Bar dataKey={grafica.campo} name={grafica.titulo} unit={grafica.unidad} fill={grafica.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart> : <LineChart data={anual} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#deded0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="anio" interval="preserveStartEnd" minTickGap={20} tick={{ fontSize: 11 }} /><YAxis width={45} tick={{ fontSize: 11 }} /><Tooltip />
          <Line dataKey={grafica.campo} name={grafica.titulo} unit={grafica.unidad} stroke={grafica.color} strokeWidth={2} strokeDasharray="5 3" connectNulls={false} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>}
      </ResponsiveContainer> : <p className="py-10 text-sm text-oliva">No hay años completos para representar esta variable.</p>}
      <p className="mt-3 text-xs text-oliva">Consulta los valores y su cobertura en la tabla anual complementaria.</p>
    </figure>)}
  </div>;
}
