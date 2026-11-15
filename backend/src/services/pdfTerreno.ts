import PDFDocument from 'pdfkit';
import type { DatosReporte } from './reportes.js';
import { MESES_CALENDARIO } from './calendario.js';
import type { CeldaCalendario } from './calendario.js';

export const MAX_BYTES_PDF = 4 * 1024 * 1024;
export const MAX_PAGINAS_PDF = 80;
export class ErrorPdf extends Error { constructor() { super('No se pudo construir un informe válido dentro de los límites seguros.'); } }

// Identidad visual (misma paleta que la web; ver docs/INFORME_PULIDO_VISUAL.md).
const BOSQUE = '#1d4636'; const CULTIVO = '#2f7d43'; const CIELO = '#1f6391'; const MAIZ = '#e6b33c'; const TERRACOTA = '#a3492a';
const CREMA = '#f8f6ef'; const GRIS = '#4b5d49'; const LINEA = '#d9dfd2';
const CLAROS = { cultivo: '#e3f1e1', cielo: '#e2eff8', maiz: '#fbf0d0', terracota: '#f8e6dc', gris: '#eeece6' };
const ETIQUETAS = { recomendado: 'Recomendado', posible_con_cuidado: 'Posible con cuidado', no_recomendado: 'No recomendado', no_determinado: 'No determinado' };
const MARCAS = { recomendado: 'R', posible_con_cuidado: 'C', no_recomendado: 'N', no_determinado: '?' };
const COLOR_ESTADO = { recomendado: CLAROS.cultivo, posible_con_cuidado: CLAROS.maiz, no_recomendado: CLAROS.terracota, no_determinado: CLAROS.gris };
const RIESGO = { alto: { letra: 'A', fondo: CLAROS.terracota, texto: '#85391f' }, medio: { letra: 'M', fondo: CLAROS.maiz, texto: '#6b4a0e' }, bajo: { letra: 'B', fondo: CLAROS.cultivo, texto: '#1f5a2f' } };
const DIRECCIONES: Record<string, string> = { ascendente: 'ascendente', descendente: 'descendente', sin_cambio: 'sin cambio apreciable', no_determinada: 'no determinada (datos insuficientes)' };
const numero = (v: number | null | undefined, decimales = 2) => v == null ? 'Sin dato' : v.toLocaleString('es-EC', { maximumFractionDigits: decimales });
const SUELOS: Record<string, string> = { franco: 'Franco', arenoso: 'Arenoso', arcilloso: 'Arcilloso', no_se: 'No sé' };
export function textoSeguroPdf(entrada: string): string {
  return Array.from(entrada.normalize('NFC')).map((c) => {
    const cambios: Record<string, string> = { '≤': '<=', '≥': '>=', '→': '->', '−': '-', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...', '€': 'EUR', '\t': ' ', '\r': ' ' };
    if (c in cambios) return cambios[c];
    const codigo = c.codePointAt(0) ?? 0;
    return c === '\n' || (codigo >= 32 && codigo <= 126) || (codigo >= 160 && codigo <= 255) ? c : codigo < 32 || codigo === 127 ? ' ' : '[símbolo]';
  }).join('');
}
type Documento = InstanceType<typeof PDFDocument>;
type Fuente = 'Helvetica' | 'Helvetica-Bold' | 'Times-Bold';
const X = 48; const ANCHO = 499.28; const DERECHA = X + ANCHO;

class Compositor {
  y = 72; paginas = 0; readonly ancho = ANCHO; readonly limite = 770; readonly inicio = Date.now();
  constructor(readonly doc: Documento, readonly nombreTerreno: string) {}
  comprobar() { if (this.paginas > MAX_PAGINAS_PDF || Date.now() - this.inicio > 4000) throw new ErrorPdf(); }
  nueva(cabecera = true) {
    this.comprobar(); if (++this.paginas > MAX_PAGINAS_PDF) throw new ErrorPdf(); this.doc.addPage();
    if (cabecera) {
      this.marca(X, 24, 20);
      this.doc.font('Helvetica-Bold').fontSize(9.5).fillColor(BOSQUE).text('RotaAndes | Informe del terreno', X + 28, 31, { lineBreak: false });
      const nombre = this.lineas(this.nombreTerreno, 230, 8.5, 'Helvetica')[0] ?? '';
      this.doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(nombre, DERECHA - this.doc.widthOfString(nombre), 32, { lineBreak: false });
      this.franja(X, 50, ANCHO, 2.5);
    }
    this.y = 72;
  }
  franja(x: number, y: number, ancho: number, alto: number) {
    [CULTIVO, MAIZ, TERRACOTA, CIELO].forEach((color, i) => this.doc.rect(x + i * ancho / 4, y, ancho / 4, alto).fill(color));
  }
  marca(x: number, y: number, lado: number) {
    const e = lado / 48; const d = this.doc;
    d.roundedRect(x, y, lado, lado, 14 * e).fill(BOSQUE);
    d.polygon([x + 6 * e, y + 36 * e], [x + 18 * e, y + 17 * e], [x + 24 * e, y + 26 * e], [x + 29 * e, y + 20 * e], [x + 42 * e, y + 36 * e]).fill(CULTIVO);
    d.rect(x + 6 * e, y + 36 * e, 36 * e, 4 * e).fill(TERRACOTA);
    d.circle(x + 35 * e, y + 13 * e, 4.5 * e).fill(MAIZ);
  }
  lineas(entrada: string, ancho = this.ancho, tamano = 10, fuente: Fuente = 'Helvetica') {
    const texto = textoSeguroPdf(entrada); if (texto.length > 12000) throw new ErrorPdf();
    this.doc.font(fuente).fontSize(tamano);
    const lineas: string[] = [];
    for (const parrafo of texto.split('\n')) {
      let linea = '';
      for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
        const candidata = linea ? `${linea} ${palabra}` : palabra;
        if (this.doc.widthOfString(candidata) <= ancho) { linea = candidata; continue; }
        if (linea) lineas.push(linea); linea = '';
        for (const c of palabra) { if (this.doc.widthOfString(linea + c) > ancho && linea) { lineas.push(linea); linea = ''; } linea += c; }
      }
      lineas.push(linea);
    }
    return lineas;
  }
  p(texto: string, tamano = 10, negrita = false, color = BOSQUE, sangria = 0) {
    const fuente: Fuente = negrita ? 'Helvetica-Bold' : 'Helvetica'; const interlinea = tamano + 4.5;
    for (const linea of this.lineas(texto, this.ancho - sangria, tamano, fuente)) { this.reservar(interlinea); this.doc.font(fuente).fontSize(tamano).fillColor(color).text(linea, X + sangria, this.y, { lineBreak: false }); this.y += interlinea; }
    this.y += 5;
  }
  reservar(alto: number) { this.comprobar(); if (this.y + alto > this.limite) this.nueva(); }
  // Título de sección: banda de color con número y nombre.
  titulo(texto: string, color = BOSQUE, nueva = true) {
    if (nueva) this.nueva(); this.reservar(90);
    const lineas = this.lineas(texto, this.ancho - 40, 19, 'Times-Bold'); const alto = lineas.length * 23 + 20;
    this.doc.roundedRect(X, this.y, this.ancho, alto, 10).fill(color);
    this.doc.rect(X, this.y + alto - 4, this.ancho, 4).fill(MAIZ);
    lineas.forEach((linea, i) => this.doc.font('Times-Bold').fontSize(19).fillColor('#ffffff').text(linea, X + 18, this.y + 12 + i * 23, { lineBreak: false }));
    this.y += alto + 14;
  }
  subtitulo(texto: string, color = BOSQUE) {
    this.reservar(48); this.doc.rect(X, this.y + 1, 4, 15).fill(color);
    for (const [i, linea] of this.lineas(texto, this.ancho - 14, 13, 'Helvetica-Bold').entries()) this.doc.font('Helvetica-Bold').fontSize(13).fillColor(BOSQUE).text(linea, X + 12, this.y + 2 + i * 17, { lineBreak: false });
    this.y += this.lineas(texto, this.ancho - 14, 13, 'Helvetica-Bold').length * 17 + 8;
  }
  // Recuadro con texto (fuente, aviso o dato destacado).
  recuadro(texto: string, fondo: string, borde: string, tamano = 9.5, colorTexto = BOSQUE, negrita = false) {
    const fuente: Fuente = negrita ? 'Helvetica-Bold' : 'Helvetica'; const lineas = this.lineas(texto, this.ancho - 30, tamano, fuente); const interlinea = tamano + 4;
    let pendientes = lineas;
    while (pendientes.length) {
      this.reservar(interlinea + 20); const caben = Math.max(1, Math.floor((this.limite - this.y - 16) / interlinea)); const bloque = pendientes.slice(0, caben); pendientes = pendientes.slice(caben);
      const alto = bloque.length * interlinea + 16;
      this.doc.roundedRect(X, this.y, this.ancho, alto, 8).fill(fondo); this.doc.rect(X, this.y, 4, alto).fill(borde);
      bloque.forEach((linea, i) => this.doc.font(fuente).fontSize(tamano).fillColor(colorTexto).text(linea, X + 16, this.y + 8 + i * interlinea, { lineBreak: false }));
      this.y += alto + 8;
    }
  }
  tabla(cabecera: string[], filas: string[][], anchos: number[], opciones: { color?: string; fondoCelda?: (fila: number, columna: number) => string | null } = {}) {
    const colorCabecera = opciones.color ?? BOSQUE;
    const dibujar = (celdas: string[], esCabecera: boolean, indiceFila: number) => {
      const fuente: Fuente = esCabecera ? 'Helvetica-Bold' : 'Helvetica';
      const textos = celdas.map((t, i) => this.lineas(t, (anchos[i] ?? 0) - 12, 9, fuente)); const alto = Math.max(...textos.map((t) => t.length)) * 12.5 + 11;
      if (alto > 650) throw new ErrorPdf();
      let x = X;
      celdas.forEach((_celda, i) => {
        const ancho = anchos[i] ?? 0; const especial = esCabecera ? null : opciones.fondoCelda?.(indiceFila, i) ?? null;
        const fondo = esCabecera ? colorCabecera : especial ?? (indiceFila % 2 ? '#ffffff' : CREMA);
        this.doc.rect(x, this.y, ancho, alto).fillAndStroke(fondo, LINEA);
        textos[i]?.forEach((linea, indice) => this.doc.font(fuente).fontSize(9).fillColor(esCabecera ? '#ffffff' : BOSQUE).text(linea, x + 6, this.y + 6 + indice * 12.5, { lineBreak: false }));
        x += ancho;
      });
      this.y += alto;
    };
    this.reservar(90); dibujar(cabecera, true, -1);
    filas.forEach((fila, indice) => {
      const alto = Math.max(...fila.map((t, i) => this.lineas(t, (anchos[i] ?? 0) - 12, 9).length)) * 12.5 + 11;
      if (this.y + alto > this.limite) { this.nueva(); dibujar(cabecera, true, -1); } dibujar(fila, false, indice); this.comprobar();
    });
    this.y += 14;
  }
  barras(titulo: string, datos: { etiqueta: string; valor: number | null }[], unidad: string, color = CIELO) {
    this.reservar(230); this.subtitulo(titulo, color);
    const validos = datos.flatMap((d) => d.valor === null ? [] : [d.valor]); if (!validos.length) { this.p('Sin datos válidos para graficar.'); return; }
    const maximo = Math.max(1, ...validos); const superior = this.y + 4; const alto = 135; const paso = (this.ancho - 35) / datos.length;
    this.doc.roundedRect(X, superior - 8, this.ancho, alto + 42, 8).fill(CREMA);
    for (const fraccion of [0.5, 1]) this.doc.moveTo(80, superior + alto - alto * fraccion).lineTo(DERECHA - 4, superior + alto - alto * fraccion).dash(2, { space: 3 }).strokeColor(LINEA).lineWidth(0.6).stroke().undash();
    this.doc.font('Helvetica').fontSize(7.5).fillColor(GRIS).text(`${numero(maximo)} ${unidad}`, X + 4, superior, { lineBreak: false });
    this.doc.moveTo(80, superior).lineTo(80, superior + alto).lineTo(DERECHA - 4, superior + alto).strokeColor('#9ba998').lineWidth(0.7).stroke();
    datos.forEach((d, i) => { const x = 84 + i * paso; if (d.valor !== null && d.valor > 0) this.doc.roundedRect(x, superior + alto - d.valor / maximo * alto, paso - 5, d.valor / maximo * alto, 2).fill(color);
      this.doc.font('Helvetica').fontSize(7).fillColor(GRIS).text(textoSeguroPdf(d.etiqueta), x, superior + alto + 8, { lineBreak: false });
      if (d.valor === null) this.doc.text('ND', x, superior + alto - 12, { lineBreak: false }); });
    this.y = superior + alto + 40; this.p(`Escala desde cero, ${unidad}. ND significa sin dato, no cero. Los valores exactos están en la tabla.`, 8, false, GRIS);
  }
  fuente(texto: string) { this.p(texto, 8.5, false, GRIS); }
  // Fichas en cuadrícula (dos o tres columnas) para el resumen.
  fichas(elementos: { titulo: string; valor: string; fondo: string; acento: string }[], columnas = 2) {
    const separacion = 10; const ancho = (this.ancho - separacion * (columnas - 1)) / columnas;
    for (let i = 0; i < elementos.length; i += columnas) {
      const fila = elementos.slice(i, i + columnas);
      const alto = Math.max(...fila.map((e) => this.lineas(e.valor, ancho - 24, 11.5, 'Helvetica-Bold').length * 15 + this.lineas(e.titulo, ancho - 24, 8, 'Helvetica-Bold').length * 11)) + 24;
      this.reservar(alto + 8);
      fila.forEach((e, j) => {
        const x = X + j * (ancho + separacion); this.doc.roundedRect(x, this.y, ancho, alto, 8).fill(e.fondo); this.doc.rect(x, this.y, ancho, 3.5).fill(e.acento);
        let y = this.y + 11;
        for (const linea of this.lineas(e.titulo.toUpperCase(), ancho - 24, 8, 'Helvetica-Bold')) { this.doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS).text(linea, x + 12, y, { lineBreak: false }); y += 11; }
        for (const linea of this.lineas(e.valor, ancho - 24, 11.5, 'Helvetica-Bold')) { this.doc.font('Helvetica-Bold').fontSize(11.5).fillColor(BOSQUE).text(linea, x + 12, y + 2, { lineBreak: false }); y += 15; }
      });
      this.y += alto + 10;
    }
  }
}

type Delimitacion = NonNullable<DatosReporte['terreno']['delimitacion']>;
const superficie = (d: Delimitacion) => `${numero(d.areaHa, 2)} ha (${numero(d.areaM2, 0)} m²)`;
// Delimitación dibujada por el agricultor: croquis vectorial a escala propia, superficie aproximada y advertencias.
function seccionDelimitacion(c: Compositor, t: DatosReporte['terreno']) {
  c.subtitulo('Delimitación de la zona de cultivo', CULTIVO);
  const d = t.delimitacion ?? null;
  if (!d) { c.p('Sin delimitación guardada: el terreno se representa solo con un punto en el mapa. La delimitación es opcional.', 9.5, false, GRIS); return; }
  const lado = 150; c.reservar(lado + 70);
  const doc = c.doc; const y0 = c.y; const anillo = d.poligono.coordinates[0] ?? [];
  const latMedia = anillo.reduce((suma, p) => suma + p[1], 0) / Math.max(1, anillo.length); const factor = Math.cos((latMedia * Math.PI) / 180);
  const xs = anillo.map((p) => p[0] * factor); const ys = anillo.map((p) => p[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const escala = (lado - 30) / Math.max(maxX - minX, maxY - minY, 1e-9);
  const desX = X + 15 + ((lado - 30) - (maxX - minX) * escala) / 2; const desY = y0 + 15 + ((lado - 30) - (maxY - minY) * escala) / 2;
  const puntos = anillo.map((p): [number, number] => [desX + (p[0] * factor - minX) * escala, desY + (maxY - p[1]) * escala]);
  doc.roundedRect(X, y0, lado, lado, 8).fill('#eef3ea');
  doc.polygon(...puntos).fillOpacity(0.45).fill(CULTIVO).fillOpacity(1);
  doc.polygon(...puntos).lineWidth(1.6).strokeColor(BOSQUE).stroke();
  for (const [px, py] of puntos.slice(0, -1)) doc.circle(px, py, 2.6).fill(BOSQUE);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(BOSQUE).text('N', X + lado - 16, y0 + 6, { lineBreak: false });
  doc.moveTo(X + lado - 13, y0 + 26).lineTo(X + lado - 13, y0 + 16).strokeColor(BOSQUE).lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(GRIS).text('Croquis sin escala de mapa', X + 8, y0 + lado - 12, { lineBreak: false });
  const textoX = X + lado + 16; const anchoTexto = c.ancho - lado - 16;
  const filas = [
    ['Superficie aproximada', superficie(d)],
    ['Vértices', `${d.vertices} vértices`],
    ['Área declarada', t.areaHa === null ? 'Sin indicar: no hay comparación' : `${numero(t.areaHa)} ha`],
    ['Diferencia dibujada - declarada', d.diferenciaHa === null ? 'No aplica' : `${d.diferenciaHa > 0 ? '+' : ''}${numero(d.diferenciaHa, 2)} ha${d.diferenciaPct === null ? '' : ` (${d.diferenciaPct > 0 ? '+' : ''}${numero(d.diferenciaPct, 1)} %)`}`],
    ['Primer vértice (lat, lon)', `${anillo[0]?.[1] ?? 'Sin dato'}, ${anillo[0]?.[0] ?? 'Sin dato'}`],
  ];
  let y = y0 + 2;
  for (const [titulo, valor] of filas) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS).text(textoSeguroPdf((titulo ?? '').toUpperCase()), textoX, y, { lineBreak: false }); y += 11;
    for (const linea of c.lineas(valor ?? '', anchoTexto, 10.5, 'Helvetica-Bold')) { doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BOSQUE).text(linea, textoX, y, { lineBreak: false }); y += 14; }
    y += 3;
  }
  c.y = Math.max(y0 + lado, y) + 10;
  c.recuadro('Delimitación dibujada por el usuario sobre un mapa. La superficie es una estimación geodésica (esfera de radio 6.378.137 m); no es una medición catastral certificada ni un levantamiento topográfico, y no reemplaza el área declarada. Los datos climáticos NASA POWER son regionales (celdas de unos 50 km) y no corresponden exactamente al interior de esta zona.', CLAROS.maiz, MAIZ, 8.5);
}

function mesEcuador(fechaIso: string): number {
  return Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date(fechaIso)));
}
const nombreMes = (mes: number) => MESES_CALENDARIO[mes - 1] ?? String(mes);
function listar(nombres: string[]): string { return nombres.length ? nombres.join(', ') : 'Ninguno'; }

// Resumen inicial para el agricultor: solo reorganiza datos ya calculados; no añade cálculos agronómicos.
function resumenAgricultor(c: Compositor, datos: DatosReporte) {
  const t = datos.terreno;
  c.titulo('Resumen para el agricultor', CULTIVO);
  c.p('Lo más importante de su terreno en pocas páginas. Todos los valores, motivos y advertencias completos están en las secciones técnicas que siguen.', 11, false, GRIS);
  c.fichas([
    { titulo: 'Altitud estimada', valor: t.altitudM === null ? 'Sin dato' : `${numero(t.altitudM)} m s. n. m.`, fondo: CLAROS.cultivo, acento: CULTIVO },
    { titulo: 'Área declarada', valor: t.areaHa === null ? 'Sin indicar' : `${numero(t.areaHa)} ha`, fondo: CLAROS.maiz, acento: MAIZ },
    { titulo: 'Riego declarado', valor: t.tieneRiego === null ? 'Sin indicar' : t.tieneRiego ? 'Sí' : 'No', fondo: CLAROS.cielo, acento: CIELO },
    { titulo: 'Tipo de suelo', valor: SUELOS[t.tipoSuelo ?? ''] ?? 'Sin indicar', fondo: CLAROS.terracota, acento: TERRACOTA },
  ], 4);
  c.p(t.delimitacion ? `Zona de cultivo dibujada en el mapa: aprox. ${superficie(t.delimitacion)}. Es una estimación, no una medición catastral.` : 'Zona de cultivo: sin delimitación dibujada; el terreno se representa con un punto.', 9.5, false, GRIS);

  c.subtitulo('El clima de su zona en breve (NASA POWER)', CIELO);
  const clima = datos.clima;
  if (clima) {
    const conLluvia = clima.mensual.filter((m) => m.lluvia_mm !== null).map((m) => ({ mes: m.mes, lluvia: m.lluvia_mm ?? 0 }));
    const humedos = [...conLluvia].sort((a, b) => b.lluvia - a.lluvia || a.mes - b.mes).slice(0, 3);
    const secos = [...conLluvia].sort((a, b) => a.lluvia - b.lluvia || a.mes - b.mes).slice(0, 3);
    const altos = clima.mensual.filter((m) => m.riesgo_helada === 'alto').map((m) => nombreMes(m.mes));
    const conMinima = clima.mensual.filter((m) => m.t_min !== null);
    const frio = conMinima.length ? conMinima.reduce((a, b) => (b.t_min ?? 0) < (a.t_min ?? 0) ? b : a) : null;
    c.fichas([
      { titulo: 'Meses más lluviosos', valor: humedos.length ? humedos.map((m) => `${nombreMes(m.mes)} (${numero(m.lluvia, 0)} mm)`).join(', ') : 'Sin dato', fondo: CLAROS.cielo, acento: CIELO },
      { titulo: 'Meses más secos', valor: secos.length ? secos.map((m) => `${nombreMes(m.mes)} (${numero(m.lluvia, 0)} mm)`).join(', ') : 'Sin dato', fondo: CLAROS.maiz, acento: MAIZ },
      { titulo: 'Riesgo de helada alto (regla heurística)', valor: altos.length ? listar(altos) : conMinima.length ? 'Ningún mes según la regla' : 'Sin dato', fondo: CLAROS.terracota, acento: TERRACOTA },
      { titulo: 'Mes con la mínima más baja', valor: frio ? `${nombreMes(frio.mes)}: ${numero(frio.t_min)} °C` : 'Sin dato', fondo: CLAROS.cultivo, acento: CULTIVO },
    ], 2);
    // Franja de doce meses: lluvia y riesgo con letra (no depende solo del color).
    c.reservar(95); const superior = c.y; const paso = c.ancho / 12; const maximo = Math.max(1, ...conLluvia.map((m) => m.lluvia));
    clima.mensual.forEach((m, i) => {
      const x = X + i * paso; const altura = m.lluvia_mm === null ? 0 : Math.max(2, m.lluvia_mm / maximo * 46);
      if (m.lluvia_mm !== null) c.doc.roundedRect(x + 6, superior + 48 - altura, paso - 12, altura, 2).fill(CIELO);
      else c.doc.font('Helvetica').fontSize(7).fillColor(GRIS).text('ND', x + paso / 2 - 5, superior + 38, { lineBreak: false });
      const riesgo = m.riesgo_helada ? RIESGO[m.riesgo_helada] : { letra: '?', fondo: CLAROS.gris, texto: GRIS };
      c.doc.roundedRect(x + 4, superior + 54, paso - 8, 15, 3).fill(riesgo.fondo);
      c.doc.font('Helvetica-Bold').fontSize(8).fillColor(riesgo.texto).text(riesgo.letra, x + paso / 2 - 3, superior + 58, { lineBreak: false });
      c.doc.font('Helvetica').fontSize(7.5).fillColor(GRIS).text(nombreMes(m.mes).slice(0, 3), x + paso / 2 - 7, superior + 73, { lineBreak: false });
    });
    c.y = superior + 88;
    c.fuente(`Barras: lluvia mensual de referencia. Letras: riesgo de helada heurístico A = alto, M = medio, B = bajo, ? = sin dato. Periodo ${clima.periodo.inicio}-${clima.periodo.fin}; dato regional (~50-70 km), no del lote.`);
  } else c.recuadro('Climatología NASA POWER no disponible en este momento: no se muestran valores de otra zona ni ceros de relleno.', CLAROS.gris, GRIS);

  c.subtitulo('Los próximos siete días (Open-Meteo)', CIELO);
  const pronostico = datos.pronostico;
  if (pronostico) {
    const conMinima = pronostico.dias.filter((d) => d.t_min !== null);
    const minimo = conMinima.length ? conMinima.reduce((a, b) => (b.t_min ?? 0) < (a.t_min ?? 0) ? b : a) : null;
    const conLluvia = pronostico.dias.filter((d) => d.precipitacion_mm !== null);
    const lluvia = conLluvia.reduce((suma, d) => suma + (d.precipitacion_mm ?? 0), 0);
    c.fichas([
      { titulo: 'Alertas preventivas de helada', valor: pronostico.alertas.length ? `${pronostico.alertas.length}: ${pronostico.alertas.map((a) => a.fecha).join(', ')}` : 'Ninguna en estos siete días', fondo: pronostico.alertas.length ? CLAROS.terracota : CLAROS.cultivo, acento: pronostico.alertas.length ? TERRACOTA : CULTIVO },
      { titulo: 'Mínima prevista más baja', valor: minimo ? `${numero(minimo.t_min)} °C el ${minimo.fecha}` : 'Sin dato', fondo: CLAROS.cielo, acento: CIELO },
      { titulo: `Lluvia prevista (${conLluvia.length} de 7 días con dato)`, valor: conLluvia.length ? `${numero(lluvia, 1)} mm en total` : 'Sin dato', fondo: CLAROS.cielo, acento: CIELO },
    ], 3);
    c.fuente(`Pronóstico consultado ${pronostico.actualizado_en}; vigente hasta ${pronostico.vigente_hasta}. Umbral preventivo: mínima <= ${numero(pronostico.umbral_helada_c)} °C. No es un aviso oficial.`);
  } else c.recuadro('Pronóstico vigente no disponible: el estado de heladas para los próximos días es desconocido, no significa ausencia de riesgo.', CLAROS.gris, GRIS);

  c.titulo('¿Qué sembrar en los próximos meses?', CULTIVO);
  if (datos.calendario) {
    const inicial = mesEcuador(datos.generadoEn);
    const meses = [0, 1, 2].map((d) => ((inicial - 1 + d) % 12) + 1);
    const nombres = (mes: number, estado: keyof typeof ETIQUETAS) => datos.cultivos.filter((cultivo) => datos.calendario?.find((celda) => celda.cultivo_id === cultivo.id && celda.mes === mes)?.estado === estado).map((cultivo) => cultivo.nombre);
    c.fichas(meses.flatMap((mes) => [
      { titulo: `${nombreMes(mes)} · Recomendado`, valor: listar(nombres(mes, 'recomendado')), fondo: CLAROS.cultivo, acento: CULTIVO },
      { titulo: `${nombreMes(mes)} · Posible con cuidado`, valor: listar(nombres(mes, 'posible_con_cuidado')), fondo: CLAROS.maiz, acento: MAIZ },
    ]), 2);
    c.fuente('Según el calendario del sistema (escenario original), que evalúa el ciclo completo de cada cultivo con clima regional NASA y parámetros de INIAP y FAO. Los demás cultivos no se recomiendan o no pueden determinarse; los motivos están en la sección 4.');
  } else c.recuadro('Calendario no disponible con los datos verificables actuales. No se proponen cultivos sin información.', CLAROS.gris, GRIS);

  c.subtitulo('Rotaciones en una mirada', TERRACOTA);
  const rotaciones = datos.rotaciones;
  if (rotaciones) {
    c.fichas(rotaciones.estrategias.map((e, i) => ({
      titulo: `${e.es_actual ? 'Su patrón actual' : `Alternativa ${i}`} · ${ETIQUETAS[e.estado]}`,
      valor: `${e.nombre}\nÍndice total: ${e.puntajes.total === null ? 'No determinado' : `${numero(e.puntajes.total)}/100`}`,
      fondo: [CLAROS.gris, CLAROS.cultivo, CLAROS.cielo][i] ?? CLAROS.gris, acento: [BOSQUE, CULTIVO, CIELO][i] ?? BOSQUE })), 3);
    c.fuente('Índices 0-100 de una heurística referencial: mayor es más favorable dentro del modelo; no son dinero, rendimiento ni probabilidad. Evidencia, beneficios, riesgos y vacíos completos en la sección 5.');
  } else c.recuadro('Comparación de rotaciones no evaluable con los datos actuales; no se inventan alternativas ni puntajes.', CLAROS.gris, GRIS);

  c.subtitulo('Cómo ha cambiado el clima, 2005-2024', CIELO);
  const tendencia = datos.tendencia;
  if (tendencia) {
    const describir = (clave: 'lluvia_mm' | 't_min' | 'dias_helada') => { const r = tendencia.tendencias[clave]; return `${DIRECCIONES[r.direccion] ?? r.direccion} (${r.n} años completos)`; };
    c.fichas([
      { titulo: 'Lluvia anual', valor: describir('lluvia_mm'), fondo: CLAROS.cielo, acento: CIELO },
      { titulo: 'Temperatura mínima', valor: describir('t_min'), fondo: CLAROS.maiz, acento: MAIZ },
      { titulo: 'Días de helada modelados', valor: describir('dias_helada'), fondo: CLAROS.terracota, acento: TERRACOTA },
    ], 3);
    c.fuente('Tendencia descriptiva de series regionales NASA POWER; sin prueba de significancia ni atribución causal. Detalle en la sección 6.');
  } else c.recuadro('Series históricas no disponibles para este punto.', CLAROS.gris, GRIS);
  c.recuadro('Antes de decidir: esta es una herramienta de apoyo. Confirme con su experiencia y con un técnico agrícola. El catálogo y los índices son referenciales, sin validación agronómica local.', CLAROS.terracota, TERRACOTA, 10, '#85391f', true);
}

export async function generarPdfTerreno(datos: DatosReporte): Promise<Buffer> {
  const fecha = new Date(datos.generadoEn); if (!Number.isFinite(fecha.getTime())) throw new ErrorPdf();
  const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 55, left: 48, right: 48 }, autoFirstPage: false, bufferPages: true,
    info: { Title: textoSeguroPdf(`RotaAndes - ${datos.terreno.nombre}`), Author: 'RotaAndes', Subject: 'Informe orientativo del terreno; escenario original', CreationDate: fecha, ModDate: fecha } });
  return new Promise<Buffer>((resolver, rechazar) => {
    const partes: Buffer[] = []; let bytes = 0;
    doc.on('data', (parte: unknown) => { if (!Buffer.isBuffer(parte)) { doc.destroy(new ErrorPdf()); return; } bytes += parte.length; if (bytes > MAX_BYTES_PDF) { doc.destroy(new ErrorPdf()); return; } partes.push(parte); });
    doc.on('error', () => rechazar(new ErrorPdf())); doc.on('end', () => { const buffer = Buffer.concat(partes); if (buffer.subarray(0, 5).toString() !== '%PDF-' || !buffer.subarray(-1024).toString().includes('%%EOF')) rechazar(new ErrorPdf()); else resolver(buffer); });
    try {
      const t = datos.terreno; const c = new Compositor(doc, t.nombre);
      // Portada: paisaje andino vectorial, marca y ficha.
      c.nueva(false);
      doc.rect(0, 0, 595.28, 340).fill(BOSQUE);
      doc.circle(470, 92, 38).fill(MAIZ);
      doc.polygon([0, 315], [110, 250], [190, 290], [330, 228], [450, 285], [595.28, 240], [595.28, 340], [0, 340]).fill('#2b5e48');
      doc.polygon([330, 228], [352, 246], [336, 243], [322, 250], [312, 240]).fill('#f8f6ef');
      doc.polygon([0, 332], [150, 290], [300, 318], [450, 280], [595.28, 315], [595.28, 340], [0, 340]).fill(CULTIVO);
      c.franja(0, 340, 595.28, 9);
      c.marca(X, 46, 44);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text('ROTAANDES', X + 56, 54, { lineBreak: false });
      doc.font('Helvetica').fontSize(9.5).fillColor(CLAROS.maiz).text('Cotopaxi, Ecuador', X + 56, 72, { lineBreak: false });
      c.y = 128;
      for (const linea of c.lineas('Informe de terreno agrícola', 420, 30, 'Times-Bold')) { doc.font('Times-Bold').fontSize(30).fillColor('#ffffff').text(linea, X, c.y, { lineBreak: false }); c.y += 34; }
      for (const linea of c.lineas(t.nombre, 460, 21, 'Helvetica-Bold').slice(0, 4)) { doc.font('Helvetica-Bold').fontSize(21).fillColor(CLAROS.maiz).text(linea, X, c.y, { lineBreak: false }); c.y += 25; }
      c.y = 372;
      c.p('Datos para conversar y decidir', 19, true);
      c.p(`Generado: ${fecha.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} (Ecuador continental).`, 10, false, GRIS);
      c.fichas([
        { titulo: 'Ubicación', valor: `${t.latitud}, ${t.longitud}`, fondo: CLAROS.cielo, acento: CIELO },
        { titulo: 'Altitud estimada', valor: t.altitudM === null ? 'Sin dato' : `${numero(t.altitudM)} m`, fondo: CLAROS.cultivo, acento: CULTIVO },
        { titulo: 'Área declarada', valor: t.areaHa === null ? 'Sin indicar' : `${numero(t.areaHa)} ha`, fondo: CLAROS.maiz, acento: MAIZ },
      ], 3);
      c.p('Escenario original: lluvia 0 % y temperatura 0 °C. Este documento no recoge los cambios hipotéticos del simulador.', 10);
      c.recuadro('Herramienta de apoyo: no reemplaza el criterio del agricultor ni del técnico agrícola. Catálogo e índices referenciales, sin validación agronómica local.', CLAROS.terracota, TERRACOTA, 10.5, '#85391f', true);
      c.p('Contenido: Resumen para el agricultor · 1. El terreno y su historial · 2. Climatología histórica · 3. Pronóstico y alertas · 4. Calendario de siembra · 5. Comparación de tres estrategias · 6. Tendencias históricas · 7. Fuentes y alcance. Una sección ausente se identifica; no se completa con datos inventados.', 9.5, false, GRIS);
      c.fuente(`Identificador del terreno: ${t.id}. Documento estático: comprueba siempre la vigencia del pronóstico. Los operadores <= y -> equivalen a menor o igual y secuencia. Símbolos ajenos al repertorio latino se muestran como [símbolo].`);
      for (const aviso of datos.avisos) c.fuente(aviso);

      resumenAgricultor(c, datos);

      c.titulo('1. El terreno y su historial'); c.p('Fuente: PostgreSQL de RotaAndes. Son datos declarados, salvo la altitud estimada obtenida al guardar la ubicación.');
      c.tabla(['Característica', 'Valor registrado'], [ ['Nombre', t.nombre], ['Ubicación', `${t.latitud}, ${t.longitud}`], ['Altitud estimada', `${numero(t.altitudM)}${t.altitudM === null ? '' : ' m'}`], ['Área declarada', `${numero(t.areaHa)}${t.areaHa === null ? '' : ' ha'}`], ['Riego declarado', t.tieneRiego === null ? 'Sin indicar' : t.tieneRiego ? 'Sí' : 'No'], ['Tipo de suelo', SUELOS[t.tipoSuelo ?? ''] ?? 'Sin indicar'] ], [165, 334.28]);
      c.fuente('Altitud: Open-Meteo / Copernicus DEM GLO-90, resolución 90 m; estimación, no medición exacta del lote. El área declarada es la que indicó el agricultor y no se reemplaza por la superficie dibujada. No se incluyen datos de contacto ni notas privadas.');
      seccionDelimitacion(c, t);
      c.subtitulo('Historial de siembras', CULTIVO);
      if (datos.historial.length) c.tabla(['Cultivo', 'Siembra (fecha)', 'Cosecha registrada'], datos.historial.map((s) => [s.cultivo, s.fechaSiembra, s.fechaCosecha ?? 'Sin registrar']), [199.28, 150, 150], { color: CULTIVO }); else c.p('Sin siembras registradas. No se presupone un cultivo actual.');

      c.titulo('2. Climatología histórica NASA POWER', CIELO); const clima = datos.clima;
      if (clima) {
        c.recuadro(`Fuente: ${clima.fuente}. Periodo ${clima.periodo.inicio}-${clima.periodo.fin}. Consulta: ${clima.actualizado_en}. Origen: ${clima.estado_datos}. ${clima.desactualizado ? 'DATOS DESACTUALIZADOS.' : 'Caché/consulta con vigencia verificada por el servicio.'} ${clima.resolucion}`, CLAROS.cielo, CIELO, 8.5);
        c.p(clima.metodologia, 9.5);
        for (const aviso of clima.advertencias) c.fuente(aviso);
        c.barras('Lluvia mensual de referencia', clima.mensual.map((m) => ({ etiqueta: MESES_CALENDARIO[m.mes - 1]?.slice(0, 3) ?? '', valor: m.lluvia_mm })), 'mm/mes');
        c.tabla(['Mes', 'Mín. °C', 'Media °C', 'Máx. °C', 'Lluvia mm', 'GWETROOT 0-1', 'Riesgo heurístico'], clima.mensual.map((m) => [MESES_CALENDARIO[m.mes - 1] ?? '', numero(m.t_min), numero(m.t_med), numero(m.t_max), numero(m.lluvia_mm), numero(m.humedad_suelo, 3), m.riesgo_helada ?? 'Sin dato']), [73, 52, 55, 52, 68, 89, 110.28],
          { color: CIELO, fondoCelda: (fila, columna) => { const riesgo = clima.mensual[fila]?.riesgo_helada; return columna === 6 && riesgo ? RIESGO[riesgo].fondo : null; } });
        c.fuente('Precipitación original PRECTOTCORR en mm/día convertida por el servicio a mm mensuales de referencia. T2M_MIN/MAX preservan extremos del producto; no son medias de mínimas diarias. Riesgo histórico heurístico no equivale a días observados de helada ni a pronóstico.');
      } else c.recuadro('Climatología no disponible para esta ubicación. No se muestran valores de otra localidad ni ceros de relleno.', CLAROS.gris, GRIS, 10);

      c.titulo('3. Pronóstico y alertas preventivas', CIELO); const pronostico = datos.pronostico;
      if (pronostico) {
        c.recuadro(`Fuente: Open-Meteo (CC BY 4.0). Consulta: ${pronostico.actualizado_en}. Vigente hasta: ${pronostico.vigente_hasta}. Zona: ${pronostico.zona_horaria}. Origen: ${pronostico.estado_datos}. La consulta no es la hora de emisión del modelo.`, CLAROS.cielo, CIELO, 8.5);
        c.tabla(['Fecha', 'Mínima °C', 'Máxima °C', 'Precipitación mm/día'], pronostico.dias.map((d) => [d.fecha, numero(d.t_min), numero(d.t_max), numero(d.precipitacion_mm)]), [139.28, 110, 110, 140],
          { color: CIELO, fondoCelda: (fila) => pronostico.alertas.some((a) => a.fecha === pronostico.dias[fila]?.fecha) ? CLAROS.terracota : null });
        c.p(`Umbral preventivo: mínima prevista <= ${numero(pronostico.umbral_helada_c)} °C. Alertas calculadas por RotaAndes, no avisos oficiales.`, 10.5, true);
        if (!pronostico.alertas.length) c.p(pronostico.dias.some((d) => d.t_min === null) ? 'No se encontraron alertas en los días evaluables; faltan mínimas y no se puede descartar riesgo.' : 'Sin alertas previstas para estos siete días; no garantiza ausencia de heladas locales.');
        for (const alerta of pronostico.alertas) c.recuadro(`${alerta.fecha}: ${alerta.mensaje}`, CLAROS.terracota, TERRACOTA, 9.5);
        for (const aviso of pronostico.advertencias) c.fuente(aviso); c.p(pronostico.aviso, 9.5);
      } else c.recuadro('Pronóstico vigente no disponible. Estado de heladas desconocido; no significa sin riesgo.', CLAROS.gris, GRIS, 10);

      c.titulo('4. Calendario de siembra', CULTIVO);
      c.p('R = recomendado; C = posible con precaución; N = no recomendado; ? = no determinado (faltan datos o fuentes). Cada mes evalúa el ciclo completo del cultivo: época, altitud, temperatura media, heladas y agua. Son reglas de RotaAndes con clima regional NASA y parámetros de INIAP y FAO, no garantías agronómicas. Escenario original 0 % / 0 °C.');
      if (datos.calendario) {
        const calendario = datos.calendario;
        // Filas agrupadas por categoría: una fila de título por categoría y una por cultivo.
        const ordenados = [...datos.cultivos].sort((a, b) => a.categoria_nombre.localeCompare(b.categoria_nombre, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
        const filas: ({ tipo: 'categoria'; nombre: string } | { tipo: 'cultivo'; id: string; nombre: string })[] = [];
        for (const cultivo of ordenados) {
          if (filas.every((fila) => fila.tipo !== 'categoria' || fila.nombre !== cultivo.categoria_nombre)) filas.push({ tipo: 'categoria', nombre: cultivo.categoria_nombre });
          filas.push({ tipo: 'cultivo', id: cultivo.id, nombre: cultivo.nombre });
        }
        const estadoDe = (fila: number, columna: number) => { const valor = filas[fila]; return columna === 0 || valor?.tipo !== 'cultivo' ? undefined : calendario.find((d) => d.cultivo_id === valor.id && d.mes === columna)?.estado; };
        c.tabla(['Cultivo', ...MESES_CALENDARIO.map((m) => m.slice(0, 3))], filas.map((fila) => fila.tipo === 'categoria' ? [fila.nombre.toUpperCase(), ...Array.from({ length: 12 }, () => '')]
          : [fila.nombre, ...Array.from({ length: 12 }, (_, i) => { const celda = calendario.find((d) => d.cultivo_id === fila.id && d.mes === i + 1); return celda ? MARCAS[celda.estado] : '?'; })]), [91.28, ...Array.from({ length: 12 }, () => 34)],
          { color: CULTIVO, fondoCelda: (fila, columna) => { if (filas[fila]?.tipo === 'categoria') return CLAROS.gris; const estado = estadoDe(fila, columna); return columna === 0 ? null : COLOR_ESTADO[estado ?? 'no_determinado']; } });
        c.subtitulo('Motivos por cultivo', CULTIVO);
        c.p('Los meses seguidos con el mismo resultado y motivo se agrupan. Los tramos recomendados o con precaución incluyen todos sus criterios; los demás, su motivo principal. La explicación completa de cada mes está en la aplicación.', 9.5, false, GRIS);
        for (const cultivo of ordenados) {
          c.reservar(90); c.p(`${cultivo.nombre} (${cultivo.nombre_cientifico}) · ${cultivo.categoria_nombre}`, 12.5, true, CULTIVO);
          const ciclo = cultivo.ciclo_dias_min === cultivo.ciclo_dias_max ? `${cultivo.ciclo_dias_max} días` : `${cultivo.ciclo_dias_min}-${cultivo.ciclo_dias_max} días`;
          const manejo = cultivo.establecimiento === 'trasplante' ? ' Trasplante (INIAP).' : cultivo.establecimiento === 'siembra_directa' ? ' Siembra directa (INIAP).' : '';
          c.p(`Ciclo de referencia: ${ciclo}; se evalúan ${cultivo.ciclo_meses_evaluados} meses.${manejo} Fuentes: ${cultivo.fuentes.map((f) => f.cita).join('; ')}.`, 9, false, GRIS);
          const celdas = calendario.filter((d) => d.cultivo_id === cultivo.id).sort((a, b) => a.mes - b.mes);
          const clave = (x: CeldaCalendario) => `${x.estado}|${x.resumen.split(': ').slice(1).join(': ')}`;
          const tramos: { desde: number; hasta: number; celda: CeldaCalendario }[] = [];
          for (const celda of celdas) {
            const ultimo = tramos.at(-1);
            if (ultimo && clave(ultimo.celda) === clave(celda) && ultimo.hasta === celda.mes - 1) ultimo.hasta = celda.mes; else tramos.push({ desde: celda.mes, hasta: celda.mes, celda });
          }
          for (const tramo of tramos) {
            c.reservar(50);
            const periodo = tramo.desde === tramo.hasta ? MESES_CALENDARIO[tramo.desde - 1] : `${MESES_CALENDARIO[tramo.desde - 1]} a ${MESES_CALENDARIO[tramo.hasta - 1]}`;
            c.p(`${periodo}: ${ETIQUETAS[tramo.celda.estado]}. ${tramo.celda.resumen}`, 9.5, true);
            if (tramo.celda.estado === 'recomendado' || tramo.celda.estado === 'posible_con_cuidado') c.p(tramo.celda.motivo.split('\n').filter((linea) => linea.startsWith('• ') && !linea.startsWith('• Ciclo')).join('\n'), 8.5, false, BOSQUE, 10);
          }
        }
        c.fuente('NASA describe una zona y un periodo histórico, no el microclima del lote ni el tiempo futuro; NASA no evalúa cultivos. Los parámetros agronómicos son referenciales y están pendientes de validación local (MAG/INIAP).');
      } else c.recuadro('Calendario no disponible con el catálogo y los datos verificables actuales.', CLAROS.gris, GRIS, 10);

      c.titulo('5. Comparación de tres estrategias', TERRACOTA); const rotaciones = datos.rotaciones;
      if (rotaciones) {
        c.p(`Inicio común hipotético: ${rotaciones.inicio_comun}. Método: ${rotaciones.metodologia.version}. Prioridades del propietario: agua ${numero(rotaciones.metodologia.prioridades.agua)}, suelo ${numero(rotaciones.metodologia.prioridades.suelo)}, ingresos ${numero(rotaciones.metodologia.prioridades.ingresos)}; peso climático ${rotaciones.metodologia.peso_riesgo}.`);
        c.recuadro('Índices referenciales 0-100: mayor indica más favorable dentro de la heurística. Ingresos significa índice de mercado; no dinero. No se estiman rendimientos, ahorro real de agua o mejoras medidas de suelo.', CLAROS.maiz, MAIZ, 9);
        for (const [indice, estrategia] of rotaciones.estrategias.entries()) {
          const acento = [BOSQUE, CULTIVO, CIELO][indice] ?? BOSQUE;
          c.reservar(110); c.subtitulo(`${estrategia.es_actual ? 'Patrón actual' : `Alternativa ${indice}`}: ${estrategia.nombre}`, acento);
          c.p(`Estado: ${ETIQUETAS[estrategia.estado]}. Secuencia: ${estrategia.secuencia.map((id) => datos.cultivos.find((d) => d.id === id)?.nombre ?? id).join(' -> ') || 'No determinada'}.`);
          c.tabla(['Agua', 'Suelo', 'Compatibilidad climática', 'Ingresos (índice)', 'Total'], [[numero(estrategia.puntajes.agua), numero(estrategia.puntajes.suelo), numero(estrategia.puntajes.riesgo), numero(estrategia.puntajes.ingresos), numero(estrategia.puntajes.total)]], [85, 85, 129.28, 110, 90], { color: acento });
          c.p(estrategia.por_que);
          for (const paso of estrategia.planificacion) { c.reservar(60); c.p(`${paso.nombre}: ${paso.inicio_estimado ?? 'Inicio no determinado'} -> ${paso.fin_estimado ?? 'Fin no determinado'}; ciclo ${numero(paso.ciclo_meses)} meses, espera ${numero(paso.espera_meses)} meses.`, 9.5, true); c.p(paso.motivo, 9, false, BOSQUE, 10); }
          for (const [etiqueta, lista] of [['Evidencia y factores', estrategia.evidencia], ['Beneficios potenciales referenciales', estrategia.beneficios], ['Riesgos', estrategia.riesgos], ['Vacíos de información', estrategia.vacios_informacion]] as const) { c.reservar(55); c.p(etiqueta, 10.5, true, acento); if (!lista.length) c.p('Sin información adicional verificable; no se presuponen resultados.', 9); for (const texto of lista) c.p(`- ${texto}`, 9, false, BOSQUE, 8); }
          c.fuente(estrategia.aviso);
        } c.p(rotaciones.aviso, 9.5);
      } else c.recuadro('Comparación no evaluable. No se inventan tres secuencias ni puntuaciones para completar la sección.', CLAROS.gris, GRIS, 10);

      c.titulo('6. Tendencias históricas 2005-2024', CIELO); const tendencia = datos.tendencia;
      if (tendencia) {
        c.recuadro(`Fuente: ${tendencia.fuente}. ${tendencia.resolucion}`, CLAROS.cielo, CIELO, 8.5);
        for (const [tipo, fuente] of Object.entries(tendencia.fuentes)) c.fuente(`${tipo}: ${fuente.estado_datos}; consulta ${fuente.actualizado_en ?? 'no disponible'}. ${fuente.desactualizado ? 'Desactualizado.' : ''}`);
        c.barras('Precipitación anual', tendencia.anual.map((a) => ({ etiqueta: String(a.anio), valor: a.lluvia_mm })), 'mm/año');
        c.tabla(['Año', 'Lluvia mm/año', 'Menor mínima mensual °C', 'Heladas modeladas (días)', 'Días válidos/esperados'], tendencia.anual.map((a) => [String(a.anio), numero(a.lluvia_mm), numero(a.t_min), numero(a.dias_helada), `${a.cobertura.dias_temperatura}/${a.cobertura.dias_esperados}`]), [50, 104, 120, 117, 108.28], { color: CIELO });
        for (const [variable, resumen] of Object.entries(tendencia.tendencias)) { c.p(`${variable}: ${resumen.n} años completos; ${resumen.direccion}. Pendiente anual ${numero(resumen.pendiente_anual, 6)}, por década ${numero(resumen.pendiente_decada, 6)}. Diferencia 2024-2005: ${numero(resumen.diferencia_2005_2024, 6)}. Años excluidos: ${resumen.anios_excluidos.join(', ') || 'ninguno'}.`, 9); }
        c.fuente('Unidades de pendientes: cambios del total anual en mm, temperatura en °C, conteo en días e índice GWETTOP adimensional, por año o por década según se indica. GWETTOP no es humedad relativa ni humedad SMAP.');
        for (const texto of Object.values(tendencia.metodologia)) c.fuente(texto); for (const texto of tendencia.advertencias) c.fuente(texto); c.p(tendencia.aviso, 9.5);
      } else c.recuadro('Series históricas no disponibles o no verificables para este punto. No se convierten promedios mensuales en días de helada observados.', CLAROS.gris, GRIS, 10);

      c.titulo('7. Fuentes, alcance y lectura responsable');
      c.p('Datos declarados: PostgreSQL / RotaAndes. Meteorología histórica y tendencias: NASA POWER / MERRA-2. Pronóstico y altitud: Open-Meteo. Recomendaciones y puntuaciones: motores explicables de RotaAndes con catálogo referencial.');
      c.fuente('NASA POWER: https://power.larc.nasa.gov/docs/'); c.fuente('Open-Meteo: https://open-meteo.com/ | Licencia de datos: https://creativecommons.org/licenses/by/4.0/');
      c.recuadro('La resolución regional no respalda conclusiones exactas por parcela. No se demuestra significancia estadística ni atribución causal. Este informe no constituye asesoría agronómica validada y no modifica siembras, datos históricos o escenarios. Confirma decisiones con experiencia local y un técnico agrícola.', CLAROS.terracota, TERRACOTA, 10);
      for (const aviso of datos.avisos) c.p(aviso, 10, true, TERRACOTA);
      const rango = doc.bufferedPageRange();
      for (let i = rango.start; i < rango.start + rango.count; i++) {
        doc.switchToPage(i); c.franja(X, 796, ANCHO, 1.5);
        doc.font('Helvetica').fontSize(8).fillColor(GRIS).text(`RotaAndes | ${t.id.slice(0, 8)} | Página ${i + 1} de ${rango.count}`, X, 805, { lineBreak: false });
        doc.font('Helvetica').fontSize(8).fillColor(GRIS).text('Herramienta de apoyo, no asesoría validada', 360, 805, { lineBreak: false });
      }
      c.comprobar(); doc.end();
    } catch { doc.destroy(); rechazar(new ErrorPdf()); }
  });
}
