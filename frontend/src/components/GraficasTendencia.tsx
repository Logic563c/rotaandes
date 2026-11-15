import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnioTendencia, EstadisticaTendencia, RespuestaTendencia } from '../types/tendencia';
import { COLORES_VARIABLE, formatearValor, resumirSerie } from '../lib/graficas';
import { MarcoGrafica, TooltipGrafica } from './AyudaGrafica';

type Campo = 'lluvia_mm' | 't_min' | 'dias_helada' | 'humedad_suelo';
interface Definicion {
  campo: Campo; titulo: string; descripcion: string; unidad: string; eje: string; color: string; barras: boolean; decimales: number;
  leyenda: string; dominio?: [number, number]; resumen: { nombre: string; alto: string; bajo: string };
  lecturaRapida: string; queMuestra: string; ejeVertical: string; lectura: string; precauciones: string[];
}
const DEFINICIONES: Definicion[] = [
  { campo: 'lluvia_mm', titulo: 'Lluvia total de cada año', descripcion: 'Suma de la lluvia de los doce meses de cada año entre 2005 y 2024.', unidad: 'mm', eje: 'Lluvia en milímetros (mm) por año', color: COLORES_VARIABLE.lluvia, barras: true, decimales: 0,
    leyenda: 'Lluvia anual (mm)', resumen: { nombre: 'lluvia', alto: 'el año más lluvioso', bajo: 'el más seco' },
    lecturaRapida: 'Cada barra es un año completo: más alta significa más lluvia y más baja, menos. Compara años más lluviosos o secos; un solo año no demuestra una tendencia ni predice los siguientes.',
    queMuestra: 'Cada barra azul es la lluvia total de un año completo.', ejeVertical: 'Milímetros de lluvia en el año (mm). La escala empieza en 0.',
    lectura: 'Una barra alta indica un año lluvioso y una baja, un año seco. Si las barras de los últimos años son más bajas que las primeras, la zona habría recibido menos lluvia en esos años.',
    precauciones: ['Un solo año seco no demuestra una tendencia.', 'Los años incompletos no se suman y aparecen como hueco.'] },
  { campo: 't_min', titulo: 'Mes más frío de cada año', descripcion: 'La temperatura mínima mensual más baja que tuvo cada año.', unidad: '°C', eje: 'Temperatura en grados Celsius (°C)', color: COLORES_VARIABLE.temperaturaMinima, barras: false, decimales: 2,
    leyenda: 'Menor mínima mensual (°C)', resumen: { nombre: 'temperatura', alto: 'el año con el mes frío más templado', bajo: 'el año con el mes más frío' },
    lecturaRapida: 'Cada punto representa el promedio de mínimas del mes más frío de ese año: más abajo significa más frío y más arriba, más templado. Compara esos meses entre años; no es la noche más fría ni un pronóstico.',
    queMuestra: 'La línea morada une, año por año, la temperatura mínima promedio del mes más frío.', ejeVertical: 'Grados Celsius (°C). Cuanto más abajo, más frío. La escala se ajusta a los valores, por eso pequeñas diferencias se ven grandes: revisa los números.',
    lectura: 'Puntos más bajos indican años con un mes más frío, con más riesgo de heladas. Puntos más altos indican años con meses fríos más templados.',
    precauciones: ['Es un promedio mensual: una noche puntual puede ser mucho más fría.', 'Si falta un año, la línea se corta.'] },
  { campo: 'dias_helada', titulo: 'Días de helada de cada año', descripcion: 'Número de días del año con temperatura mínima de 0 °C o menos según el modelo de NASA.', unidad: 'días', eje: 'Número de días con helada en el año', color: COLORES_VARIABLE.helada, barras: true, decimales: 0,
    leyenda: 'Días con mínima ≤ 0 °C', resumen: { nombre: 'días de helada', alto: 'el año con más días de helada', bajo: 'el que tuvo menos' },
    lecturaRapida: 'Cada barra cuenta días con mínima modelada de 0 °C o menos: más alta significa más días y más baja, menos. Compara años de la zona, no heladas observadas en tu parcela. Un hueco no significa cero.',
    queMuestra: 'Cada barra morada cuenta los días de un año en los que la mínima diaria modelada fue de 0 °C o menos.', ejeVertical: 'Cantidad de días (de 0 a 366). La escala empieza en 0.',
    lectura: 'Una barra alta significa un año con muchas heladas; una barra baja o vacía en el eje, un año con pocas o ninguna.',
    precauciones: ['Son días modelados para la zona, no heladas observadas en tu parcela.', 'Un hueco indica que faltan días válidos, no cero heladas.'] },
  { campo: 'humedad_suelo', titulo: 'Humedad del suelo superficial de cada año', descripcion: 'Promedio anual de la humedad de la capa superior del suelo según el modelo de NASA.', unidad: '', eje: 'Índice de 0 (seco) a 1 (saturado)', color: COLORES_VARIABLE.humedadSuelo, barras: false, decimales: 2,
    leyenda: 'Humedad superficial (índice 0–1)', dominio: [0, 1], resumen: { nombre: 'humedad del suelo', alto: 'el año con el suelo más húmedo', bajo: 'el más seco' },
    lecturaRapida: 'Cada punto muestra la humedad superficial promedio de un año según el modelo: cerca de 1, más húmedo; cerca de 0, más seco. Compara años de la zona; no es un porcentaje ni una medición de tu parcela.',
    queMuestra: 'La línea marrón muestra la humedad promedio de la capa superior del suelo en cada año. Es un índice sin unidades.', ejeVertical: 'Índice de 0 a 1: 0 es suelo seco y 1 suelo saturado. La escala va siempre de 0 a 1.',
    lectura: 'Valores más altos indican años con suelo más húmedo; valores más bajos, años más secos.',
    precauciones: ['Es un valor modelado regional, no una medición de tu parcela.', 'No es un porcentaje de agua.'] },
];
const DIRECCIONES: Record<EstadisticaTendencia['direccion'], string> = {
  ascendente: 'La recta calculada sobre los años completos sube', descendente: 'La recta calculada sobre los años completos baja',
  sin_cambio: 'La recta calculada no muestra un cambio apreciable', no_determinada: 'No hay suficientes años completos para calcular una dirección',
};

export function GraficasTendencia({ anual, tendencias, fuente }: { anual: AnioTendencia[]; tendencias: RespuestaTendencia['tendencias']; fuente: string }) {
  const filas = anual.map((fila) => ({ ...fila, nombre: String(fila.anio) }));
  return <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-2">
    {DEFINICIONES.map((grafica) => {
      const estadistica = tendencias[grafica.campo];
      const serie = filas.map((fila) => ({ etiqueta: fila.nombre, valor: fila[grafica.campo] }));
      const direccion = `${DIRECCIONES[estadistica.direccion]}${estadistica.pendiente_decada !== null && estadistica.direccion !== 'no_determinada' ? ` (${formatearValor(estadistica.pendiente_decada, `${grafica.unidad}/década`.trim(), 3)})` : ''}.`;
      const tooltip = <Tooltip cursor={{ fill: '#1f639114', stroke: '#1d463655' }} content={({ active, label }) => <TooltipGrafica activo={active} etiqueta={label} filas={filas} claveEtiqueta="nombre" series={[{ clave: grafica.campo, nombre: grafica.leyenda, unidad: grafica.unidad, color: grafica.color, decimales: grafica.decimales }]} />} />;
      const ejeX = <XAxis dataKey="nombre" interval="preserveStartEnd" minTickGap={18} tick={{ fontSize: 11 }} />;
      return <MarcoGrafica key={grafica.campo} titulo={grafica.titulo} descripcion={grafica.descripcion} tipo="historico" fuente={fuente}
        lecturaRapida={grafica.lecturaRapida}
        ejeVertical={grafica.eje} ejeHorizontal="Años, de 2005 a 2024" leyenda={[{ color: grafica.color, texto: grafica.leyenda, trazo: grafica.barras ? 'barra' : 'linea' }]}
        resumen={`${resumirSerie(serie, { ...grafica.resumen, unidad: grafica.unidad, decimales: grafica.decimales })} ${direccion}`}
        ayuda={{ queMuestra: grafica.queMuestra, ejeHorizontal: 'Años de 2005 a 2024. Cada barra o punto es un año completo; los años incompletos quedan como hueco.', ejeVertical: grafica.ejeVertical, lectura: grafica.lectura,
          precauciones: [...grafica.precauciones, 'La recta de tendencia describe estos 20 años; no predice el futuro ni demuestra una causa.'],
          ejemplo: 'Pasa el cursor o toca un año para ver su valor exacto. Compara los primeros años con los últimos y luego confirma con la tabla anual y la cobertura de datos.' }}>
        {anual.some((fila) => fila[grafica.campo] !== null) ? <ResponsiveContainer width="100%" height={230} minWidth={0} initialDimension={{ width: 500, height: 230 }}>
          {grafica.barras ? <BarChart data={filas} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#deded0" vertical={false} strokeDasharray="3 3" />{ejeX}<YAxis width={48} tick={{ fontSize: 11 }} allowDecimals={grafica.campo !== 'dias_helada'} domain={[0, 'auto']} />{tooltip}
            <Bar dataKey={grafica.campo} name={grafica.leyenda} fill={grafica.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart> : <LineChart data={filas} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#deded0" vertical={false} strokeDasharray="3 3" />{ejeX}<YAxis width={44} tick={{ fontSize: 11 }} {...(grafica.dominio && { domain: grafica.dominio, ticks: [0, 0.25, 0.5, 0.75, 1] })} />{tooltip}
            <Line dataKey={grafica.campo} name={grafica.leyenda} stroke={grafica.color} strokeWidth={2.5} connectNulls={false} dot={{ r: 2.5 }} isAnimationActive={false} />
          </LineChart>}
        </ResponsiveContainer> : <p className="py-10 text-sm text-oliva">No hay años completos para representar esta variable.</p>}
      </MarcoGrafica>;
    })}
  </div>;
}
