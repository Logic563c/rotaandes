import PDFDocument from 'pdfkit';
import type { DatosReporte } from './reportes.js';
import { MESES_CALENDARIO } from './calendario.js';

export const MAX_BYTES_PDF = 4 * 1024 * 1024;
export const MAX_PAGINAS_PDF = 80;
export class ErrorPdf extends Error { constructor() { super('No se pudo construir un informe válido dentro de los límites seguros.'); } }
const VERDE = '#23483c'; const TIERRA = '#985535'; const CLARO = '#f7f5ed'; const GRIS = '#526451';
const ETIQUETAS = { recomendado: 'Recomendado', posible_con_cuidado: 'Posible con cuidado', no_recomendado: 'No recomendado', no_determinado: 'No determinado' };
const MARCAS = { recomendado: 'R', posible_con_cuidado: 'C', no_recomendado: 'N', no_determinado: '?' };
const numero = (v: number | null | undefined, decimales = 2) => v == null ? 'Sin dato' : v.toLocaleString('es-EC', { maximumFractionDigits: decimales });
export function textoSeguroPdf(entrada: string): string {
  return Array.from(entrada.normalize('NFC')).map((c) => {
    const cambios: Record<string, string> = { '≤': '<=', '≥': '>=', '→': '->', '−': '-', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...', '€': 'EUR', '\t': ' ', '\r': ' ' };
    if (c in cambios) return cambios[c];
    const codigo = c.codePointAt(0) ?? 0;
    return c === '\n' || (codigo >= 32 && codigo <= 126) || (codigo >= 160 && codigo <= 255) ? c : codigo < 32 || codigo === 127 ? ' ' : '[símbolo]';
  }).join('');
}
type Documento = InstanceType<typeof PDFDocument>;
class Compositor {
  y = 72; paginas = 0; readonly ancho = 499.28; readonly limite = 775; readonly inicio = Date.now();
  constructor(readonly doc: Documento) {}
  comprobar() { if (this.paginas > MAX_PAGINAS_PDF || Date.now() - this.inicio > 4000) throw new ErrorPdf(); }
  nueva() {
    this.comprobar(); if (++this.paginas > MAX_PAGINAS_PDF) throw new ErrorPdf(); this.doc.addPage();
    this.doc.font('Helvetica-Bold').fontSize(10).fillColor(VERDE).text('RotaAndes | Informe del terreno', 48, 31, { lineBreak: false });
    this.doc.moveTo(48, 49).lineTo(547.28, 49).strokeColor('#d9e3ce').lineWidth(0.8).stroke(); this.y = 72;
  }
  reservar(alto: number) { this.comprobar(); if (this.y + alto > this.limite) this.nueva(); }
  lineas(entrada: string, ancho = this.ancho, tamano = 10, negrita = false) {
    const texto = textoSeguroPdf(entrada); if (texto.length > 12000) throw new ErrorPdf();
    this.doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamano);
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
  p(texto: string, tamano = 10, negrita = false, color = VERDE) {
    for (const linea of this.lineas(texto, this.ancho, tamano, negrita)) { this.reservar(tamano + 5); this.doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamano).fillColor(color).text(linea, 48, this.y, { lineBreak: false }); this.y += tamano + 5; }
    this.y += 6;
  }
  titulo(texto: string, nueva = true) { if (nueva) this.nueva(); this.reservar(80); this.p(texto, 20, true); this.y += 6; }
  tabla(cabecera: string[], filas: string[][], anchos: number[]) {
    const dibujar = (celdas: string[], esCabecera: boolean) => {
      const textos = celdas.map((t, i) => this.lineas(t, (anchos[i] ?? 0) - 12, 9, esCabecera)); const alto = Math.max(...textos.map((t) => t.length)) * 13 + 12;
      if (alto > 650) throw new ErrorPdf();
      let x = 48;
      celdas.forEach((_celda, i) => { const ancho = anchos[i] ?? 0; this.doc.rect(x, this.y, ancho, alto).fillAndStroke(esCabecera ? VERDE : CLARO, '#d9e3ce');
        textos[i]?.forEach((linea, indice) => this.doc.font(esCabecera ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(esCabecera ? '#ffffff' : VERDE).text(linea, x + 6, this.y + 6 + indice * 13, { lineBreak: false })); x += ancho; });
      this.y += alto;
    };
    this.reservar(90); dibujar(cabecera, true);
    for (const fila of filas) { const alto = Math.max(...fila.map((t, i) => this.lineas(t, (anchos[i] ?? 0) - 12, 9).length)) * 13 + 12;
      if (this.y + alto > this.limite) { this.nueva(); dibujar(cabecera, true); } dibujar(fila, false); this.comprobar(); }
    this.y += 15;
  }
  barras(titulo: string, datos: { etiqueta: string; valor: number | null }[], unidad: string) {
    this.reservar(225); this.p(titulo, 12, true);
    const validos = datos.flatMap((d) => d.valor === null ? [] : [d.valor]); if (!validos.length) { this.p('Sin datos válidos para graficar.'); return; }
    const maximo = Math.max(1, ...validos); const superior = this.y; const alto = 140; const paso = (this.ancho - 35) / datos.length;
    this.doc.fontSize(8).fillColor(GRIS).text(`${numero(maximo)} ${unidad}`, 48, superior, { lineBreak: false });
    this.doc.moveTo(80, superior).lineTo(80, superior + alto).lineTo(547, superior + alto).strokeColor('#9ba998').lineWidth(0.7).stroke();
    datos.forEach((d, i) => { const x = 84 + i * paso; if (d.valor !== null && d.valor > 0) this.doc.rect(x, superior + alto - d.valor / maximo * alto, paso - 5, d.valor / maximo * alto).fill(VERDE);
      this.doc.font('Helvetica').fontSize(7).fillColor(GRIS).text(textoSeguroPdf(d.etiqueta), x, superior + alto + 8, { lineBreak: false });
      if (d.valor === null) this.doc.text('ND', x, superior + alto - 12, { lineBreak: false }); });
    this.y = superior + alto + 32; this.p(`Escala desde cero, ${unidad}. ND significa sin dato, no cero. Los valores exactos están en la tabla.`, 8, false, GRIS);
  }
  fuente(texto: string) { this.p(texto, 9, false, GRIS); }
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
      const c = new Compositor(doc); const t = datos.terreno;
      c.nueva(); doc.rect(0, 65, 595.28, 310).fill(VERDE); c.y = 100; c.p('ROTAANDES', 13, true, '#ffffff'); c.p('Informe de terreno agrícola', 28, true, '#ffffff'); c.p(t.nombre, 23, true, '#ffffff'); c.y = 395;
      c.p('Datos para conversar y decidir', 21, true); c.p(`Generado: ${fecha.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })} (Ecuador continental).`); c.fuente(`Identificador del terreno: ${t.id}`);
      c.p('Escenario original: lluvia 0 % y temperatura 0 °C. Este documento no recoge los cambios hipotéticos del simulador.', 11);
      c.p('Herramienta de apoyo: no reemplaza el criterio del agricultor ni del técnico agrícola. Catálogo e índices referenciales, sin validación agronómica local.', 12, true, TIERRA);
      c.p('Incluye lote e historial, clima regional, pronóstico disponible, calendario, tres posiciones de rotación y tendencias válidas. Una sección ausente se identifica; no se completa con datos inventados.');
      c.fuente('Documento estático: comprueba siempre la vigencia del pronóstico. Los operadores <= y -> equivalen a menor o igual y secuencia. Símbolos ajenos al repertorio latino se muestran como [símbolo].');
      for (const aviso of datos.avisos) c.fuente(aviso);
      c.titulo('1. El terreno y su historial'); c.p('Fuente: PostgreSQL de RotaAndes. Son datos declarados, salvo la altitud estimada obtenida al guardar la ubicación.');
      c.tabla(['Característica', 'Valor registrado'], [ ['Nombre', t.nombre], ['Ubicación', `${t.latitud}, ${t.longitud}`], ['Altitud estimada', `${numero(t.altitudM)}${t.altitudM === null ? '' : ' m'}`], ['Área declarada', `${numero(t.areaHa)}${t.areaHa === null ? '' : ' ha'}`], ['Riego declarado', t.tieneRiego === null ? 'Sin indicar' : t.tieneRiego ? 'Sí' : 'No'], ['Tipo de suelo', ({ franco: 'Franco', arenoso: 'Arenoso', arcilloso: 'Arcilloso', no_se: 'No sé' } as Record<string, string>)[t.tipoSuelo ?? ''] ?? 'Sin indicar'] ], [165, 334.28]);
      c.fuente('Altitud: Open-Meteo / Copernicus DEM GLO-90, resolución 90 m; estimación, no medición exacta del lote. Área sin cálculo automático de superficie. No se incluyen datos de contacto ni notas privadas.');
      if (datos.historial.length) c.tabla(['Cultivo', 'Siembra (fecha)', 'Cosecha registrada'], datos.historial.map((s) => [s.cultivo, s.fechaSiembra, s.fechaCosecha ?? 'Sin registrar']), [199.28, 150, 150]); else c.p('Sin siembras registradas. No se presupone un cultivo actual.');
      c.titulo('2. Climatología histórica NASA POWER'); const clima = datos.clima;
      if (clima) {
        c.fuente(`Fuente: ${clima.fuente}. Periodo ${clima.periodo.inicio}-${clima.periodo.fin}. Consulta: ${clima.actualizado_en}. Origen: ${clima.estado_datos}. ${clima.desactualizado ? 'DATOS DESACTUALIZADOS.' : 'Caché/consulta con vigencia verificada por el servicio.'}`); c.fuente(clima.resolucion); c.p(clima.metodologia);
        for (const aviso of clima.advertencias) c.fuente(aviso);
        c.barras('Lluvia mensual de referencia', clima.mensual.map((m) => ({ etiqueta: MESES_CALENDARIO[m.mes - 1]?.slice(0, 3) ?? '', valor: m.lluvia_mm })), 'mm/mes');
        c.tabla(['Mes', 'Mín. °C', 'Media °C', 'Máx. °C', 'Lluvia mm', 'GWETROOT 0-1', 'Riesgo heurístico'], clima.mensual.map((m) => [MESES_CALENDARIO[m.mes - 1] ?? '', numero(m.t_min), numero(m.t_med), numero(m.t_max), numero(m.lluvia_mm), numero(m.humedad_suelo, 3), m.riesgo_helada ?? 'Sin dato']), [73, 52, 55, 52, 68, 89, 110.28]);
        c.fuente('Precipitación original PRECTOTCORR en mm/día convertida por el servicio a mm mensuales de referencia. T2M_MIN/MAX preservan extremos del producto; no son medias de mínimas diarias. Riesgo histórico heurístico no equivale a días observados de helada ni a pronóstico.');
      } else c.p('Climatología no disponible para esta ubicación. No se muestran valores de otra localidad ni ceros de relleno.');
      c.titulo('3. Pronóstico y alertas preventivas'); const pronostico = datos.pronostico;
      if (pronostico) {
        c.fuente(`Fuente: Open-Meteo (CC BY 4.0). Consulta: ${pronostico.actualizado_en}. Vigente hasta: ${pronostico.vigente_hasta}. Zona: ${pronostico.zona_horaria}. Origen: ${pronostico.estado_datos}. La consulta no es la hora de emisión del modelo.`);
        c.tabla(['Fecha', 'Mínima °C', 'Máxima °C', 'Precipitación mm/día'], pronostico.dias.map((d) => [d.fecha, numero(d.t_min), numero(d.t_max), numero(d.precipitacion_mm)]), [139.28, 110, 110, 140]);
        c.p(`Umbral preventivo: mínima prevista <= ${numero(pronostico.umbral_helada_c)} °C. Alertas calculadas por RotaAndes, no avisos oficiales.`, 11, true);
        if (!pronostico.alertas.length) c.p(pronostico.dias.some((d) => d.t_min === null) ? 'No se encontraron alertas en los días evaluables; faltan mínimas y no se puede descartar riesgo.' : 'Sin alertas previstas para estos siete días; no garantiza ausencia de heladas locales.');
        for (const alerta of pronostico.alertas) c.p(`${alerta.fecha}: ${alerta.mensaje}`);
        for (const aviso of pronostico.advertencias) c.fuente(aviso); c.p(pronostico.aviso);
      } else c.p('Pronóstico vigente no disponible. Estado de heladas desconocido; no significa sin riesgo.');
      c.titulo('4. Calendario de siembra'); c.p('R = recomendado; C = posible con cuidado; N = no recomendado; ? = no determinado. Son reglas del sistema con catálogo referencial y clima regional, no garantías agronómicas. Escenario original 0 % / 0 °C.');
      if (datos.calendario) {
        c.tabla(['Cultivo', ...MESES_CALENDARIO.map((m) => m.slice(0, 3))], datos.cultivos.map((cultivo) => [cultivo.nombre, ...Array.from({ length: 12 }, (_, i) => { const celda = datos.calendario?.find((d) => d.cultivo_id === cultivo.id && d.mes === i + 1); return celda ? MARCAS[celda.estado] : '?'; })]), [91.28, ...Array.from({ length: 12 }, () => 34)]);
        c.p('Motivos completos por cultivo y mes', 14, true);
        for (const cultivo of datos.cultivos) { c.reservar(80); c.p(cultivo.nombre, 13, true); for (const celda of datos.calendario.filter((d) => d.cultivo_id === cultivo.id)) { c.reservar(55); c.p(`${MESES_CALENDARIO[celda.mes - 1]}: ${ETIQUETAS[celda.estado]}`, 10, true); c.p(celda.motivo, 9); } }
      } else c.p('Calendario no disponible con el catálogo y los datos verificables actuales.');
      c.titulo('5. Comparación de tres estrategias'); const rotaciones = datos.rotaciones;
      if (rotaciones) {
        c.p(`Inicio común hipotético: ${rotaciones.inicio_comun}. Método: ${rotaciones.metodologia.version}. Prioridades del propietario: agua ${numero(rotaciones.metodologia.prioridades.agua)}, suelo ${numero(rotaciones.metodologia.prioridades.suelo)}, ingresos ${numero(rotaciones.metodologia.prioridades.ingresos)}; peso climático ${rotaciones.metodologia.peso_riesgo}.`);
        c.p('Índices referenciales 0-100: mayor indica más favorable dentro de la heurística. Ingresos significa índice de mercado; no dinero. No se estiman rendimientos, ahorro real de agua o mejoras medidas de suelo.');
        for (const estrategia of rotaciones.estrategias) {
          c.reservar(100); c.p(estrategia.nombre, 16, true); c.p(`Estado: ${ETIQUETAS[estrategia.estado]}. Secuencia: ${estrategia.secuencia.map((id) => datos.cultivos.find((d) => d.id === id)?.nombre ?? id).join(' -> ') || 'No determinada'}.`);
          c.tabla(['Agua', 'Suelo', 'Compatibilidad climática', 'Ingresos (índice)', 'Total'], [[numero(estrategia.puntajes.agua), numero(estrategia.puntajes.suelo), numero(estrategia.puntajes.riesgo), numero(estrategia.puntajes.ingresos), numero(estrategia.puntajes.total)]], [85, 85, 129.28, 110, 90]);
          c.p(estrategia.por_que);
          for (const paso of estrategia.planificacion) { c.reservar(60); c.p(`${paso.nombre}: ${paso.inicio_estimado ?? 'Inicio no determinado'} -> ${paso.fin_estimado ?? 'Fin no determinado'}; ciclo ${numero(paso.ciclo_meses)} meses, espera ${numero(paso.espera_meses)} meses.`, 10, true); c.p(paso.motivo, 9); }
          for (const [etiqueta, lista] of [['Evidencia y factores', estrategia.evidencia], ['Beneficios potenciales referenciales', estrategia.beneficios], ['Riesgos', estrategia.riesgos], ['Vacíos de información', estrategia.vacios_informacion]] as const) { c.reservar(55); c.p(etiqueta, 11, true); if (!lista.length) c.p('Sin información adicional verificable; no se presuponen resultados.'); for (const texto of lista) c.p(`- ${texto}`, 9); }
          c.fuente(estrategia.aviso);
        } c.p(rotaciones.aviso);
      } else c.p('Comparación no evaluable. No se inventan tres secuencias ni puntuaciones para completar la sección.');
      c.titulo('6. Tendencias históricas 2005-2024'); const tendencia = datos.tendencia;
      if (tendencia) {
        c.fuente(`Fuente: ${tendencia.fuente}. ${tendencia.resolucion}`);
        for (const [tipo, fuente] of Object.entries(tendencia.fuentes)) c.fuente(`${tipo}: ${fuente.estado_datos}; consulta ${fuente.actualizado_en ?? 'no disponible'}. ${fuente.desactualizado ? 'Desactualizado.' : ''}`);
        c.barras('Precipitación anual', tendencia.anual.map((a) => ({ etiqueta: String(a.anio), valor: a.lluvia_mm })), 'mm/año');
        c.tabla(['Año', 'Lluvia mm/año', 'Menor mínima mensual °C', 'Heladas modeladas (días)', 'Días válidos/esperados'], tendencia.anual.map((a) => [String(a.anio), numero(a.lluvia_mm), numero(a.t_min), numero(a.dias_helada), `${a.cobertura.dias_temperatura}/${a.cobertura.dias_esperados}`]), [50, 104, 120, 117, 108.28]);
        for (const [variable, resumen] of Object.entries(tendencia.tendencias)) { c.p(`${variable}: ${resumen.n} años completos; ${resumen.direccion}. Pendiente anual ${numero(resumen.pendiente_anual, 6)}, por década ${numero(resumen.pendiente_decada, 6)}. Diferencia 2024-2005: ${numero(resumen.diferencia_2005_2024, 6)}. Años excluidos: ${resumen.anios_excluidos.join(', ') || 'ninguno'}.`, 9); }
        c.fuente('Unidades de pendientes: cambios del total anual en mm, temperatura en °C, conteo en días e índice GWETTOP adimensional, por año o por década según se indica. GWETTOP no es humedad relativa ni humedad SMAP.');
        for (const texto of Object.values(tendencia.metodologia)) c.fuente(texto); for (const texto of tendencia.advertencias) c.fuente(texto); c.p(tendencia.aviso);
      } else c.p('Series históricas no disponibles o no verificables para este punto. No se convierten promedios mensuales en días de helada observados.');
      c.titulo('7. Fuentes, alcance y lectura responsable');
      c.p('Datos declarados: PostgreSQL / RotaAndes. Meteorología histórica y tendencias: NASA POWER / MERRA-2. Pronóstico y altitud: Open-Meteo. Recomendaciones y puntuaciones: motores explicables de RotaAndes con catálogo referencial.');
      c.fuente('NASA POWER: https://power.larc.nasa.gov/docs/'); c.fuente('Open-Meteo: https://open-meteo.com/ | Licencia de datos: https://creativecommons.org/licenses/by/4.0/');
      c.p('La resolución regional no respalda conclusiones exactas por parcela. No se demuestra significancia estadística ni atribución causal. Este informe no constituye asesoría agronómica validada y no modifica siembras, datos históricos o escenarios. Confirma decisiones con experiencia local y un técnico agrícola.');
      for (const aviso of datos.avisos) c.p(aviso, 10, true, TIERRA);
      const rango = doc.bufferedPageRange();
      for (let i = rango.start; i < rango.start + rango.count; i++) { doc.switchToPage(i); doc.font('Helvetica').fontSize(8).fillColor(GRIS).text(`RotaAndes | ${t.id.slice(0, 8)} | Página ${i + 1} de ${rango.count}`, 48, 809, { lineBreak: false }); }
      c.comprobar(); doc.end();
    } catch { doc.destroy(); rechazar(new ErrorPdf()); }
  });
}
