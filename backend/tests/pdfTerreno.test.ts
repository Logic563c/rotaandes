import { describe, expect, it } from 'vitest';
import { generarPdfTerreno, textoSeguroPdf, MAX_BYTES_PDF } from '../src/services/pdfTerreno.js';
import { reportePrueba } from './fixtures/reportePruebas.js';
import { leerPdf } from './fixtures/leerPdf.js';
import { describirDelimitacion, validarPoligono } from '../src/services/geometriaTerreno.js';

describe('PDF auténtico, contenido, español y diseño', () => {
  it('genera A4 con páginas numeradas, todas las secciones, acentos y valores del motor', async () => {
    const datos = reportePrueba(); const pdf = await generarPdfTerreno(datos); const leido = await leerPdf(pdf);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-'); expect(pdf.length).toBeLessThan(MAX_BYTES_PDF); expect(leido.paginas.length).toBeGreaterThan(7);
    for (const titulo of ['Viña Ñandú de Pujilí', 'Climatología histórica NASA POWER', 'Pronóstico y alertas', 'Calendario de siembra', 'Comparación de tres estrategias', 'Tendencias históricas', 'GWETROOT', 'mm/mes', 'Vacíos de información', 'Papa']) expect(leido.texto).toContain(titulo);
    expect(leido.texto.includes(datos.rotaciones?.estrategias[0]?.puntajes.total?.toLocaleString('es-EC') ?? 'Sin dato')).toBe(true);
    for (const [i, pagina] of leido.paginas.entries()) { expect(pagina.ancho).toBeCloseTo(595.28, 1); expect(pagina.alto).toBeCloseTo(841.89, 1); expect(pagina.texto).toContain(`Página ${i + 1} de ${leido.paginas.length}`); expect(pagina.posiciones.every((p) => p.x >= 40 && p.x <= 550 && p.y >= 25 && p.y <= 820)).toBe(true); }
  }, 15000);
  it('incluye el calendario de 29 cultivos agrupado, rótulos unificados, lectura de las barras y acciones sugeridas', async () => {
    const datos = reportePrueba(); const leido = await leerPdf(await generarPdfTerreno(datos)); const texto = leido.texto.replace(/\s+/g, ' ');
    expect(datos.cultivos).toHaveLength(29); expect(leido.paginas.length).toBeLessThanOrEqual(80);
    for (const grupo of ['HORTALIZAS DE HOJA', 'HORTALIZAS DE RAÍZ', 'CEBOLLAS', 'TUBÉRCULOS ANDINOS', 'LEGUMINOSAS']) expect(texto).toContain(grupo);
    for (const cultivo of ['Lechuga (Lactuca sativa)', 'Melloco (Ullucus tuberosus)', 'Papa nabo (Brassica rapa subsp. rapa)']) expect(texto).toContain(cultivo);
    expect(texto).toContain('Posible con precaución'); expect(texto).not.toContain('Posible con cuidado');
    expect(texto).toContain('Para leerla: cada barra es un mes'); expect(texto).toContain('Qué puedes hacer:');
  }, 20000);
  it('abre con un resumen para el agricultor derivado solo de los datos del informe', async () => {
    const datos = reportePrueba(); const { paginas } = await leerPdf(await generarPdfTerreno(datos));
    const resumen = paginas.slice(1, 4).map((p) => p.texto).join(' ');
    for (const texto of ['Resumen para el agricultor', 'Meses más lluviosos', 'Riesgo de helada alto', '¿Qué sembrar en los próximos meses?', 'Rotaciones en una mirada', 'Antes de decidir']) expect(resumen.toLocaleLowerCase('es')).toContain(texto.toLocaleLowerCase('es'));
    const lluviosos = [...(datos.clima?.mensual ?? [])].filter((m) => m.lluvia_mm !== null).sort((a, b) => (b.lluvia_mm ?? 0) - (a.lluvia_mm ?? 0))[0];
    expect(resumen.toLowerCase()).toContain(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][(lluviosos?.mes ?? 1) - 1]);
    const vacio = reportePrueba(); vacio.clima = null; vacio.pronostico = null; vacio.calendario = null; vacio.rotaciones = null; vacio.tendencia = null;
    const texto = (await leerPdf(await generarPdfTerreno(vacio))).texto;
    for (const aviso of ['Climatología NASA POWER no disponible', 'Pronóstico vigente no disponible', 'Calendario no disponible', 'no evaluable', 'Series históricas no disponibles']) expect(texto).toContain(aviso);
    expect(texto.toLocaleLowerCase('es')).not.toContain('meses más lluviosos'); expect(texto).not.toContain('NaN');
  });
  it('incluye la delimitación con croquis, superficie, comparación y advertencia sin añadir páginas', async () => {
    const sin = reportePrueba(); const leidoSin = await leerPdf(await generarPdfTerreno(sin));
    expect(leidoSin.texto).toContain('Sin delimitación guardada'); expect(leidoSin.texto).toContain('sin delimitación dibujada');
    const con = reportePrueba();
    // Geometría sintética de prueba (aprox. 1,24 ha), no es una parcela real.
    const poligono = validarPoligono({ type: 'Polygon', coordinates: [[[-78.6205, -0.9305], [-78.6195, -0.9305], [-78.6195, -0.9295], [-78.6205, -0.9295], [-78.6205, -0.9305]]] }, { latitud: -0.93, longitud: -78.62 });
    const descripcion = describirDelimitacion(poligono, con.terreno.areaHa);
    if (!descripcion) throw new Error('Delimitación de prueba inválida');
    con.terreno.delimitacion = { poligono, ...descripcion };
    const leido = await leerPdf(await generarPdfTerreno(con));
    for (const texto of ['Delimitación de la zona de cultivo', '4 vértices', 'Zona de cultivo dibujada en el mapa: aprox. 1,24 ha', 'no es una medición catastral', 'no corresponden exactamente al interior', 'Croquis sin escala']) expect(leido.texto).toContain(texto);
    expect(leido.texto).toContain(`+${(descripcion.diferenciaHa ?? 0).toLocaleString('es-EC', { maximumFractionDigits: 2 })} ha`);
    expect(leido.paginas.length).toBe(leidoSin.paginas.length);
    for (const pagina of leido.paginas) expect(pagina.posiciones.every((p) => p.x >= 40 && p.x <= 550 && p.y >= 25 && p.y <= 820)).toBe(true);
   }, 30000);
  it('es repetible con datos y fecha fijos, sin modificar la entrada', async () => {
    const datos = reportePrueba(); const original = structuredClone(datos); const a = await generarPdfTerreno(datos); const b = await generarPdfTerreno(datos); expect(a.equals(b)).toBe(true); expect(datos).toEqual(original);
  });
  it('genera secciones verificables ante ausencia de proveedores sin inventar clima ni tres alternativas', async () => {
    const datos = reportePrueba(); datos.clima = null; datos.pronostico = null; datos.calendario = null; datos.rotaciones = null; datos.historial = [];
    const { texto } = await leerPdf(await generarPdfTerreno(datos)); expect(texto).toContain('Climatología no disponible'); expect(texto).toContain('Estado de heladas desconocido'); expect(texto).toContain('Sin siembras registradas'); expect(texto).toContain('Comparación no evaluable'); expect(texto).not.toContain('NaN');
  });
  it('normaliza operadores y símbolos, conserva español y controla nombres largos sin perder texto', async () => {
    expect(textoSeguroPdf('Ñandú ≤2 °C → haba 🌱')).toBe('Ñandú <=2 °C -> haba [símbolo]');
    const datos = reportePrueba(); datos.terreno.nombre = 'W'.repeat(120); datos.calendario = null; const { texto } = await leerPdf(await generarPdfTerreno(datos)); expect(texto.replaceAll(' ', '')).toContain('W'.repeat(120));
  });
  it('rechaza texto excesivo y fecha inválida, sin producir un PDF aparentemente válido', async () => {
    const datos = reportePrueba(); datos.terreno.nombre = 'x'.repeat(12001); await expect(generarPdfTerreno(datos)).rejects.toThrow(); datos.generadoEn = 'no-fecha'; await expect(generarPdfTerreno(datos)).rejects.toThrow();
  });
  it('rechaza documentos que superan el presupuesto de páginas, sin entregar una parte cortada', async () => {
    const datos = reportePrueba(); datos.historial = Array.from({ length: 1200 }, () => ({ cultivo: 'W'.repeat(120), fechaSiembra: '2025-01-01', fechaCosecha: null }));
    await expect(generarPdfTerreno(datos)).rejects.toThrow('límites seguros');
  });
});
