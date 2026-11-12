// Piezas comunes para que todas las gráficas se lean igual: tipo de dato, ejes con unidades,
// leyenda propia, valor exacto al pasar el cursor o tocar, resumen y ayuda «¿Cómo interpretar esta gráfica?».
import type { ReactNode } from 'react';
import { Icono } from './Iconos';
import type { NombreIcono } from './Iconos';
import { formatearValor } from '../lib/graficas';

export type TipoDatoGrafica = 'historico' | 'pronostico' | 'hipotetico' | 'indice';
const TIPOS: Record<TipoDatoGrafica, { texto: string; clase: string; icono: NombreIcono }> = {
  historico: { texto: 'Dato histórico', clase: 'chip--cielo', icono: 'libro' },
  pronostico: { texto: 'Pronóstico', clase: 'chip--cultivo', icono: 'nube' },
  hipotetico: { texto: 'Escenario hipotético', clase: 'chip--maiz', icono: 'deslizador' },
  indice: { texto: 'Índice del modelo', clase: 'chip--gris', icono: 'rotacion' },
};
export function TipoDato({ tipo }: { tipo: TipoDatoGrafica }) {
  const detalle = TIPOS[tipo];
  return <span className={`chip ${detalle.clase}`}><Icono nombre={detalle.icono} className="size-4" />{detalle.texto}</span>;
}

export type TrazoLeyenda = 'barra' | 'linea' | 'discontinua' | 'punteada' | 'referencia';
export interface ElementoLeyenda { color: string; texto: string; trazo: TrazoLeyenda }
function Muestra({ color, trazo }: Omit<ElementoLeyenda, 'texto'>) {
  if (trazo === 'barra') return <span aria-hidden="true" className="inline-block h-3.5 w-5 shrink-0 rounded-sm" style={{ background: color }} />;
  const patron = trazo === 'linea' ? undefined : trazo === 'discontinua' ? '5 3' : trazo === 'punteada' ? '2 3' : '6 4';
  return <svg aria-hidden="true" viewBox="0 0 24 10" className="h-2.5 w-6 shrink-0"><line x1="1" y1="5" x2="23" y2="5" stroke={color} strokeWidth={trazo === 'referencia' ? 2 : 3} strokeDasharray={patron} strokeLinecap="round" /></svg>;
}
export function LeyendaGrafica({ elementos }: { elementos: ElementoLeyenda[] }) {
  return <ul aria-label="Leyenda de la gráfica" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">{elementos.map((elemento) => <li key={elemento.texto} className="flex items-center gap-2"><Muestra color={elemento.color} trazo={elemento.trazo} />{elemento.texto}</li>)}</ul>;
}

export interface AyudaGraficaProps {
  queMuestra: string; ejeHorizontal: string; ejeVertical: string; colores: ElementoLeyenda[];
  lectura: string; precauciones: string[]; ejemplo: string;
}
export function AyudaGrafica({ queMuestra, ejeHorizontal, ejeVertical, colores, lectura, precauciones, ejemplo }: AyudaGraficaProps) {
  return <details className="ayuda-grafica mt-4"><summary className="flex items-center gap-2 font-semibold"><Icono nombre="fuente" className="size-5 shrink-0" />¿Cómo interpretar esta gráfica?</summary>
    <dl className="mt-3 space-y-3 text-sm leading-relaxed">
      <div><dt className="font-semibold">Qué muestra</dt><dd className="text-oliva">{queMuestra}</dd></div>
      <div><dt className="font-semibold">Eje horizontal (de izquierda a derecha)</dt><dd className="text-oliva">{ejeHorizontal}</dd></div>
      <div><dt className="font-semibold">Eje vertical (de abajo hacia arriba)</dt><dd className="text-oliva">{ejeVertical}</dd></div>
      <div><dt className="font-semibold">Qué representa cada color</dt><dd><ul className="mt-1 space-y-1 text-oliva">{colores.map((color) => <li key={color.texto} className="flex items-center gap-2"><Muestra color={color.color} trazo={color.trazo} />{color.texto}</li>)}</ul></dd></div>
      <div><dt className="font-semibold">Valores altos y bajos</dt><dd className="text-oliva">{lectura}</dd></div>
      <div><dt className="font-semibold">Precauciones</dt><dd><ul className="mt-1 list-disc space-y-1 pl-5 text-oliva">{precauciones.map((texto) => <li key={texto}>{texto}</li>)}</ul></dd></div>
      <div><dt className="font-semibold">Ejemplo de lectura</dt><dd className="text-oliva">{ejemplo}</dd></div>
    </dl>
  </details>;
}

export interface SerieTooltip { clave: string; nombre: string; unidad: string; color: string; decimales?: number }
/** Contenido del cuadro emergente: muestra el valor exacto con su unidad, o «Sin dato» si falta. */
export function TooltipGrafica({ activo, etiqueta, filas, claveEtiqueta, claveTitulo, series, nota }: {
  activo: boolean | undefined; etiqueta: unknown; filas: readonly object[]; claveEtiqueta: string; claveTitulo?: string; series: SerieTooltip[]; nota?: string;
}) {
  if (!activo) return null;
  const fila = filas.find((valor) => String((valor as Record<string, unknown>)[claveEtiqueta]) === String(etiqueta)) as Record<string, unknown> | undefined;
  if (!fila) return null;
  const titulo = fila[claveTitulo ?? claveEtiqueta];
  return <div className="tooltip-grafica">
    <p className="font-semibold">{String(titulo)}</p>
    <ul className="mt-1 space-y-0.5">{series.map((serie) => { const valor = fila[serie.clave]; return <li key={serie.clave} className="flex items-center gap-2"><span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: serie.color }} />{serie.nombre}: <strong>{formatearValor(typeof valor === 'number' ? valor : null, serie.unidad, serie.decimales)}</strong></li>; })}</ul>
    {nota && <p className="mt-1 text-[11px] text-oliva">{nota}</p>}
  </div>;
}

export interface MarcoGraficaProps {
  titulo: string; descripcion: string; tipo: TipoDatoGrafica; fuente: string; ejeVertical: string; ejeHorizontal: string;
  leyenda: ElementoLeyenda[]; resumen?: string; ayuda: Omit<AyudaGraficaProps, 'colores' | 'ejeHorizontal' | 'ejeVertical'> & { ejeHorizontal?: string; ejeVertical?: string };
  children: ReactNode;
}
/** Marco común: título, tipo de dato, fuente y periodo, ejes con unidades, leyenda, resumen y ayuda. */
export function MarcoGrafica({ titulo, descripcion, tipo, fuente, ejeVertical, ejeHorizontal, leyenda, resumen, ayuda, children }: MarcoGraficaProps) {
  return <figure aria-label={`Gráfica: ${titulo}`} className="tarjeta min-w-0 p-4 sm:p-6">
    <figcaption className="mb-3"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-lg font-semibold">{titulo}</h3><TipoDato tipo={tipo} /></div>
      <p className="mt-1 text-sm leading-relaxed text-oliva">{descripcion}</p><p className="mt-1 text-xs text-oliva">{fuente}</p></figcaption>
    <p className="eje-grafica"><span aria-hidden="true">↑ </span>{ejeVertical}</p>
    {children}
    <p className="eje-grafica text-right">{ejeHorizontal}<span aria-hidden="true"> →</span></p>
    <LeyendaGrafica elementos={leyenda} />
    {resumen && <p className="resumen-grafica mt-3"><strong>En pocas palabras: </strong>{resumen}</p>}
    <AyudaGrafica {...ayuda} ejeHorizontal={ayuda.ejeHorizontal ?? ejeHorizontal} ejeVertical={ayuda.ejeVertical ?? ejeVertical} colores={leyenda} />
  </figure>;
}
