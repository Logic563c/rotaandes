// Utilidades de presentación de las gráficas. Solo describen datos ya recibidos del backend:
// no calculan reglas agronómicas ni sustituyen valores ausentes.

/** Un color fijo por variable en todas las gráficas de RotaAndes. */
export const COLORES_VARIABLE = {
  lluvia: '#1f6391',
  temperaturaMaxima: '#b4541f',
  temperaturaMedia: '#1d4636',
  temperaturaMinima: '#5b4a9e',
  helada: '#5b4a9e',
  humedadSuelo: '#8a5a2b',
  original: '#6b6b63',
  simulado: '#a87510',
} as const;

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatearValor(valor: number | null | undefined, unidad: string, decimales = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return 'Sin dato';
  const texto = valor.toLocaleString('es-EC', { maximumFractionDigits: decimales });
  return unidad ? `${texto} ${unidad}` : texto;
}

export interface PuntoSerie { etiqueta: string; valor: number | null }

/** Devuelve el punto máximo y el mínimo de una serie, ignorando datos ausentes. */
export function extremos(serie: PuntoSerie[]): { maximo: PuntoSerie & { valor: number }; minimo: PuntoSerie & { valor: number } } | null {
  const validos = serie.filter((punto): punto is PuntoSerie & { valor: number } => punto.valor !== null && Number.isFinite(punto.valor));
  const primero = validos[0];
  if (!primero) return null;
  let maximo = primero; let minimo = primero;
  for (const punto of validos) { if (punto.valor > maximo.valor) maximo = punto; if (punto.valor < minimo.valor) minimo = punto; }
  return { maximo, minimo };
}

export function etiquetasSinDato(serie: PuntoSerie[]): string[] {
  return serie.filter((punto) => punto.valor === null || !Number.isFinite(punto.valor)).map((punto) => punto.etiqueta);
}

export function unirLista(valores: string[]): string {
  if (valores.length <= 1) return valores.join('');
  return `${valores.slice(0, -1).join(', ')} y ${valores[valores.length - 1]}`;
}

function frasesSinDato(serie: PuntoSerie[], nombre: string): string {
  const ausentes = etiquetasSinDato(serie);
  return ausentes.length === 0 ? '' : ` Sin dato en ${unirLista(ausentes)}: ${ausentes.length === 1 ? 'ese punto se deja' : 'esos puntos se dejan'} en blanco; no ${nombre === 'lluvia' ? 'significa lluvia cero' : 'significa un valor cero'}.`;
}

/** Resumen descriptivo de una serie mensual (lluvia, humedad…). No es una recomendación. */
export function resumirSerie(serie: PuntoSerie[], { nombre, unidad, alto, bajo, decimales = 1 }: { nombre: string; unidad: string; alto: string; bajo: string; decimales?: number }): string {
  const resultado = extremos(serie);
  if (!resultado) return `No hay datos válidos de ${nombre} para resumir.`;
  if (resultado.maximo.etiqueta === resultado.minimo.etiqueta) return `Solo hay un dato válido de ${nombre}: ${formatearValor(resultado.maximo.valor, unidad, decimales)} en ${resultado.maximo.etiqueta}.${frasesSinDato(serie, nombre)}`;
  return `Con estos datos, ${alto} es ${resultado.maximo.etiqueta} (${formatearValor(resultado.maximo.valor, unidad, decimales)}) y ${bajo} es ${resultado.minimo.etiqueta} (${formatearValor(resultado.minimo.valor, unidad, decimales)}).${frasesSinDato(serie, nombre)}`;
}

/** Resumen de temperaturas mínimas frente a un umbral ya definido por el proyecto. */
export function resumirMinimas(serie: PuntoSerie[], umbralC: number, unidad = '°C'): string {
  const resultado = extremos(serie);
  if (!resultado) return 'No hay temperaturas mínimas válidas para resumir.';
  const bajoUmbral = serie.filter((punto) => punto.valor !== null && punto.valor <= umbralC).map((punto) => punto.etiqueta);
  const umbral = formatearValor(umbralC, unidad, 1);
  const frase = bajoUmbral.length === 0 ? `Ningún valor llega a ${umbral} o menos.` : `${bajoUmbral.length === 1 ? 'Un valor llega' : `${bajoUmbral.length} valores llegan`} a ${umbral} o menos (${unirLista(bajoUmbral)}).`;
  return `La mínima más baja es ${formatearValor(resultado.minimo.valor, unidad, 1)} en ${resultado.minimo.etiqueta}. ${frase}${frasesSinDato(serie, 'temperatura')}`;
}
