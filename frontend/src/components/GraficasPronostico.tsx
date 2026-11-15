import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DiaPronostico } from '../types/api';
import { COLORES_VARIABLE, formatearValor, resumirMinimas, resumirSerie } from '../lib/graficas';
import { MarcoGrafica, TooltipGrafica } from './AyudaGrafica';

const corto = new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric', timeZone: 'America/Guayaquil' });
const largo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' });
const fechaLocal = (fecha: string) => new Date(`${fecha}T12:00:00-05:00`);
const MARGEN = { top: 8, right: 20, left: 0, bottom: 4 };

export function GraficasPronostico({ dias, umbralC }: { dias: DiaPronostico[]; umbralC: number }) {
  const filas = dias.map((dia) => ({ ...dia, nombre: corto.format(fechaLocal(dia.fecha)), nombreLargo: largo.format(fechaLocal(dia.fecha)) }));
  const serie = (clave: 't_min' | 'precipitacion_mm') => filas.map((fila) => ({ etiqueta: fila.nombreLargo, valor: fila[clave] }));
  const fuente = 'Fuente: Open-Meteo · pronóstico de 7 días · no es un dato de la NASA';
  const ejeX = <XAxis dataKey="nombre" tick={{ fontSize: 10 }} interval={0} tickMargin={4} />;
  const umbral = formatearValor(umbralC, '°C', 1);
  return <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
    <MarcoGrafica titulo="Temperaturas previstas" tipo="pronostico" fuente={fuente}
      descripcion="Temperatura mínima (noche) y máxima (día) previstas para cada uno de los próximos siete días."
      lecturaRapida="Cada punto es un día previsto: la línea naranja muestra la máxima y la morada, la mínima. Más arriba significa más calor; más abajo, más frío. Compara la mínima con la línea roja para reconocer alertas preventivas; no confirma una helada."
      ejeVertical="Temperatura en grados Celsius (°C)" ejeHorizontal="Días, desde hoy"
      leyenda={[{ color: COLORES_VARIABLE.temperaturaMaxima, texto: 'Máxima prevista (°C)', trazo: 'punteada' }, { color: COLORES_VARIABLE.temperaturaMinima, texto: 'Mínima prevista (°C)', trazo: 'discontinua' }, { color: '#a3492a', texto: `Umbral de alerta de helada: ${umbral}`, trazo: 'referencia' }]}
      resumen={resumirMinimas(serie('t_min'), umbralC)}
      ayuda={{ queMuestra: 'Dos líneas: arriba la máxima prevista de cada día y abajo la mínima prevista. La línea roja marca el umbral preventivo de helada.', ejeHorizontal: 'Los siete días del pronóstico, empezando por hoy.', ejeVertical: 'Grados Celsius (°C). Cuanto más abajo, más frío.',
        lectura: `Si la línea de la mínima toca o baja de la línea roja (${umbral}), RotaAndes muestra una alerta preventiva de posible helada para ese día.`,
        precauciones: ['Un pronóstico puede cambiar: vuelve a consultarlo cerca de la fecha.', 'Es el valor de una cuadrícula del modelo, no un termómetro en tu parcela; en hondonadas puede helar más.', 'Si falta un día, la línea se corta y ese día no se puede evaluar.'],
        ejemplo: 'Toca un día para ver su mínima y máxima exactas. Compara la mínima con la línea roja para saber qué días conviene proteger los cultivos sensibles.' }}>
      <ResponsiveContainer width="100%" height={230} minWidth={0} initialDimension={{ width: 500, height: 230 }}>
        <LineChart data={filas} accessibilityLayer margin={MARGEN}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" />{ejeX}<YAxis width={36} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ stroke: '#1d463655' }} content={({ active, label }) => <TooltipGrafica activo={active} etiqueta={label} filas={filas} claveEtiqueta="nombre" claveTitulo="nombreLargo" series={[{ clave: 't_max', nombre: 'Máxima', unidad: '°C', color: COLORES_VARIABLE.temperaturaMaxima, decimales: 1 }, { clave: 't_min', nombre: 'Mínima', unidad: '°C', color: COLORES_VARIABLE.temperaturaMinima, decimales: 1 }]} />} />
          <ReferenceLine y={umbralC} stroke="#a3492a" strokeDasharray="6 4" ifOverflow="extendDomain" />
          <Line dataKey="t_max" name="Máxima" stroke={COLORES_VARIABLE.temperaturaMaxima} strokeWidth={2} strokeDasharray="2 3" connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} />
          <Line dataKey="t_min" name="Mínima" stroke={COLORES_VARIABLE.temperaturaMinima} strokeWidth={2.5} strokeDasharray="5 3" connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </MarcoGrafica>
    <MarcoGrafica titulo="Lluvia prevista" tipo="pronostico" fuente={fuente}
      descripcion="Milímetros de lluvia previstos para cada día."
      lecturaRapida="Cada barra es un día: más alta significa más lluvia prevista y más baja, menos. Compara qué días podrían ser más lluviosos; el pronóstico puede cambiar y no es el promedio mensual de NASA."
      ejeVertical="Lluvia en milímetros (mm) por día" ejeHorizontal="Días, desde hoy"
      leyenda={[{ color: COLORES_VARIABLE.lluvia, texto: 'Lluvia prevista del día (mm)', trazo: 'barra' }]}
      resumen={resumirSerie(serie('precipitacion_mm'), { nombre: 'lluvia', unidad: 'mm', alto: 'el día con más lluvia prevista', bajo: 'el de menos' })}
      ayuda={{ queMuestra: 'Cada barra azul es la lluvia prevista para un día.', ejeHorizontal: 'Los siete días del pronóstico, empezando por hoy.', ejeVertical: 'Milímetros (mm) por día. 1 mm equivale a 1 litro por metro cuadrado. La escala empieza en 0.',
        lectura: 'Barras altas indican días con más lluvia prevista; sin barra o con barra muy baja, días secos o casi secos.',
        precauciones: ['La lluvia es la variable más difícil de pronosticar: tómala como orientación.', 'Esta escala es diaria; no se compara con la lluvia mensual de la climatología.'],
        ejemplo: 'Toca una barra para ver los milímetros exactos de ese día.' }}>
      <ResponsiveContainer width="100%" height={230} minWidth={0} initialDimension={{ width: 500, height: 230 }}>
        <BarChart data={filas} accessibilityLayer margin={MARGEN}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" />{ejeX}<YAxis width={36} tick={{ fontSize: 11 }} domain={[0, 'auto']} />
          <Tooltip cursor={{ fill: '#1f639114' }} content={({ active, label }) => <TooltipGrafica activo={active} etiqueta={label} filas={filas} claveEtiqueta="nombre" claveTitulo="nombreLargo" series={[{ clave: 'precipitacion_mm', nombre: 'Lluvia', unidad: 'mm', color: COLORES_VARIABLE.lluvia, decimales: 1 }]} />} />
          <Bar dataKey="precipitacion_mm" name="Lluvia" fill={COLORES_VARIABLE.lluvia} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </MarcoGrafica>
  </div>;
}
