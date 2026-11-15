import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MesClima } from '../types/api';
import { COLORES_VARIABLE, MESES_CORTOS, MESES_LARGOS, resumirMinimas, resumirSerie } from '../lib/graficas';
import { MarcoGrafica, TooltipGrafica } from './AyudaGrafica';
import type { SerieTooltip } from './AyudaGrafica';

const EJE_MESES = 'Meses del año, de enero (Ene) a diciembre (Dic). Cada mes es el promedio de muchos años, no un año concreto.';
const MARGEN = { top: 8, right: 8, left: 0, bottom: 4 };
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function GraficasClima({ mensual, fuente }: { mensual: MesClima[]; fuente: string }) {
  const filas = mensual.map((mes) => ({ ...mes, nombre: MESES_CORTOS[mes.mes - 1] ?? String(mes.mes), nombreLargo: capitalizar(MESES_LARGOS[mes.mes - 1] ?? String(mes.mes)) }));
  const serie = (clave: 'lluvia_mm' | 't_min' | 'humedad_suelo') => filas.map((fila) => ({ etiqueta: fila.nombreLargo.toLowerCase(), valor: fila[clave] }));
  const hayLluvia = mensual.some((mes) => mes.lluvia_mm !== null);
  const hayTemperatura = mensual.some((mes) => mes.t_min !== null || mes.t_med !== null || mes.t_max !== null);
  const hayHumedad = mensual.some((mes) => mes.humedad_suelo !== null);
  const tooltip = (series: SerieTooltip[], nota?: string) => <Tooltip cursor={{ fill: '#1f639114', stroke: '#1d463655' }} content={({ active, label }) => <TooltipGrafica activo={active} etiqueta={label} filas={filas} claveEtiqueta="nombre" claveTitulo="nombreLargo" series={series} {...(nota && { nota })} />} />;
  const ejeX = <XAxis dataKey="nombre" tick={{ fontSize: 10 }} interval={0} tickMargin={4} />;
  const sinDatos = (texto: string) => <p className="py-12 text-sm text-oliva">{texto}</p>;
  return <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-2">
    <MarcoGrafica titulo="Lluvia de cada mes" tipo="historico" fuente={fuente}
      descripcion="Cuánta lluvia cae en promedio en cada mes en tu zona. Cada barra es un mes."
      lecturaRapida="Cada barra es un mes: más alta significa más lluvia y más baja, menos, cuando hay datos. Compara los meses habitualmente más lluviosos o secos; no indica cuánto lloverá este año."
      ejeVertical="Lluvia en milímetros (mm) por mes" ejeHorizontal="Meses del año"
      leyenda={[{ color: COLORES_VARIABLE.lluvia, texto: 'Lluvia promedio del mes (mm)', trazo: 'barra' }]}
      resumen={resumirSerie(serie('lluvia_mm'), { nombre: 'lluvia', unidad: 'mm', alto: 'el mes más lluvioso', bajo: 'el más seco' })}
      ayuda={{ queMuestra: 'Cada barra azul es la lluvia promedio de un mes, sumada en todo el mes. Se calcula con los datos de NASA POWER de muchos años.', ejeHorizontal: EJE_MESES, ejeVertical: 'Milímetros de lluvia (mm). 1 mm equivale a 1 litro de agua por cada metro cuadrado de terreno. La escala empieza en 0.',
        lectura: 'Una barra alta indica un mes lluvioso; una barra baja, un mes seco en el que los cultivos sin riego pueden sufrir falta de agua.',
        precauciones: ['Es un promedio de la zona (unos 50 km), no la lluvia exacta de tu parcela.', 'Un año concreto puede ser más seco o más lluvioso que este promedio.', 'Si falta un mes, no se dibuja su barra: no significa que no llueva.'],
        ejemplo: 'Pasa el cursor o toca una barra para ver los milímetros exactos de ese mes. Compara la barra más alta con la más baja para reconocer la época lluviosa y la seca.' }}>
      {hayLluvia ? <ResponsiveContainer width="100%" height={250} minWidth={0} initialDimension={{ width: 500, height: 250 }}>
        <BarChart data={filas} accessibilityLayer margin={MARGEN}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" />{ejeX}<YAxis width={42} tick={{ fontSize: 11 }} domain={[0, 'auto']} allowDecimals={false} />
          {tooltip([{ clave: 'lluvia_mm', nombre: 'Lluvia', unidad: 'mm', color: COLORES_VARIABLE.lluvia, decimales: 1 }])}
          <Bar dataKey="lluvia_mm" name="Lluvia" unit=" mm" fill={COLORES_VARIABLE.lluvia} radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart>
      </ResponsiveContainer> : sinDatos('No hay datos válidos de lluvia para graficar.')}
    </MarcoGrafica>

    <MarcoGrafica titulo="Temperaturas de cada mes" tipo="historico" fuente={fuente}
      descripcion="Temperatura mínima (noche), media y máxima (día) promedio de cada mes, medidas a 2 m del suelo."
      lecturaRapida="Cada línea sigue una temperatura: máxima, media o mínima. Más arriba significa más calor; más abajo, más frío. La mínima permite reconocer los meses habitualmente más fríos, sin confirmar heladas en tu terreno."
      ejeVertical="Temperatura en grados Celsius (°C)" ejeHorizontal="Meses del año"
      leyenda={[{ color: COLORES_VARIABLE.temperaturaMaxima, texto: 'Máxima (°C)', trazo: 'punteada' }, { color: COLORES_VARIABLE.temperaturaMedia, texto: 'Media (°C)', trazo: 'linea' }, { color: COLORES_VARIABLE.temperaturaMinima, texto: 'Mínima (°C)', trazo: 'discontinua' }, { color: '#a3492a', texto: 'Límite de riesgo alto de helada: 2 °C', trazo: 'referencia' }]}
      resumen={resumirMinimas(serie('t_min'), 2)}
      ayuda={{ queMuestra: 'Tres líneas: la de arriba es la temperatura máxima promedio, la del medio la media y la de abajo la mínima promedio de cada mes. La línea roja horizontal marca 2 °C.', ejeHorizontal: EJE_MESES, ejeVertical: 'Grados Celsius (°C). Cuanto más arriba, más calor.',
        lectura: 'Si la línea de la mínima se acerca o baja de la línea roja de 2 °C, ese mes tiene riesgo alto de helada según la regla de RotaAndes (entre 2 y 5 °C el riesgo es medio). Las máximas altas indican días cálidos.',
        precauciones: ['Son promedios de muchos años: una noche concreta puede ser mucho más fría que la mínima promedio.', 'Desde 3400 m RotaAndes sube un nivel el riesgo, porque el dato regional promedia zonas más bajas.', 'Si falta un mes, la línea se corta: no se inventa el valor.'],
        ejemplo: 'Toca un mes para ver a la vez su mínima, media y máxima exactas. Busca los meses en los que la línea morada de la mínima está más baja.' }}>
      {hayTemperatura ? <ResponsiveContainer width="100%" height={250} minWidth={0} initialDimension={{ width: 500, height: 250 }}>
        <LineChart data={filas} accessibilityLayer margin={MARGEN}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" />{ejeX}<YAxis width={36} tick={{ fontSize: 11 }} />
          {tooltip([{ clave: 't_max', nombre: 'Máxima', unidad: '°C', color: COLORES_VARIABLE.temperaturaMaxima, decimales: 1 }, { clave: 't_med', nombre: 'Media', unidad: '°C', color: COLORES_VARIABLE.temperaturaMedia, decimales: 1 }, { clave: 't_min', nombre: 'Mínima', unidad: '°C', color: COLORES_VARIABLE.temperaturaMinima, decimales: 1 }])}
          <ReferenceLine y={2} stroke="#a3492a" strokeDasharray="6 4" ifOverflow="extendDomain" />
          <Line dataKey="t_max" name="Máxima" unit=" °C" stroke={COLORES_VARIABLE.temperaturaMaxima} strokeWidth={2} strokeDasharray="2 3" connectNulls={false} isAnimationActive={false} dot={{ r: 2 }} />
          <Line dataKey="t_med" name="Media" unit=" °C" stroke={COLORES_VARIABLE.temperaturaMedia} strokeWidth={2} connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} />
          <Line dataKey="t_min" name="Mínima" unit=" °C" stroke={COLORES_VARIABLE.temperaturaMinima} strokeWidth={2.5} strokeDasharray="5 3" connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer> : sinDatos('No hay temperaturas válidas para graficar.')}
    </MarcoGrafica>

    <MarcoGrafica titulo="Humedad del suelo de cada mes" tipo="historico" fuente={fuente}
      descripcion="Qué tan húmedo está en promedio el suelo en la zona de las raíces, según el modelo de NASA POWER."
      lecturaRapida="Cada barra es un mes: cerca de 1, el modelo indica suelo más húmedo en la zona de raíces; cerca de 0, más seco. Compara meses de la zona; no mide el agua de tu parcela."
      ejeVertical="Índice de humedad del suelo, de 0 (seco) a 1 (saturado de agua)" ejeHorizontal="Meses del año"
      leyenda={[{ color: COLORES_VARIABLE.humedadSuelo, texto: 'Humedad en la zona de raíces (índice 0–1)', trazo: 'barra' }]}
      resumen={resumirSerie(serie('humedad_suelo'), { nombre: 'humedad del suelo', unidad: '', alto: 'el mes con el suelo más húmedo', bajo: 'el más seco', decimales: 2 })}
      ayuda={{ queMuestra: 'Cada barra marrón indica la humedad promedio del suelo en la zona de las raíces durante ese mes. Es un índice sin unidades, no un porcentaje ni litros.', ejeHorizontal: EJE_MESES, ejeVertical: 'Índice de 0 a 1. 0 significa suelo seco y 1 suelo saturado de agua. La escala va siempre de 0 a 1 para no exagerar las diferencias.',
        lectura: 'Barras más altas indican un suelo más húmedo; barras bajas, un suelo más seco en el que las plantas pueden tener menos agua disponible.',
        precauciones: ['Es un valor modelado para una zona de unos 50 km, no una medición de tu parcela.', 'No reemplaza revisar el suelo con la mano o con un análisis.', 'Si falta un mes, no se dibuja su barra.'],
        ejemplo: 'Toca una barra para ver el índice exacto. Si la humedad baja en los mismos meses en los que baja la lluvia, esa es la época más seca para tus cultivos.' }}>
      {hayHumedad ? <ResponsiveContainer width="100%" height={230} minWidth={0} initialDimension={{ width: 500, height: 230 }}>
        <BarChart data={filas} accessibilityLayer margin={MARGEN}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#deded0" />{ejeX}<YAxis width={36} tick={{ fontSize: 11 }} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} />
          {tooltip([{ clave: 'humedad_suelo', nombre: 'Humedad del suelo', unidad: '', color: COLORES_VARIABLE.humedadSuelo, decimales: 2 }], 'Índice de 0 (seco) a 1 (saturado).')}
          <Bar dataKey="humedad_suelo" name="Humedad del suelo" fill={COLORES_VARIABLE.humedadSuelo} radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart>
      </ResponsiveContainer> : sinDatos('No hay datos válidos de humedad del suelo para graficar.')}
    </MarcoGrafica>
  </div>;
}
