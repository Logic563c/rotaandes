import { describe, expect, it } from 'vitest';
import { generarPdfTerreno, textoSeguroPdf, MAX_BYTES_PDF } from '../src/services/pdfTerreno.js';
import { reportePrueba } from './fixtures/reportePruebas.js';
import { leerPdf } from './fixtures/leerPdf.js';

describe('PDF auténtico, contenido, español y diseño', () => {
  it('genera A4 con páginas numeradas, todas las secciones, acentos y valores del motor', async () => {
    const datos = reportePrueba(); const pdf = await generarPdfTerreno(datos); const leido = await leerPdf(pdf);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-'); expect(pdf.length).toBeLessThan(MAX_BYTES_PDF); expect(leido.paginas.length).toBeGreaterThan(7);
    for (const titulo of ['Viña Ñandú de Pujilí', 'Climatología histórica NASA POWER', 'Pronóstico y alertas', 'Calendario de siembra', 'Comparación de tres estrategias', 'Tendencias históricas', 'GWETROOT', 'mm/mes', 'Vacíos de información', 'Papa']) expect(leido.texto).toContain(titulo);
    expect(leido.texto.includes(datos.rotaciones?.estrategias[0]?.puntajes.total?.toLocaleString('es-EC') ?? 'Sin dato')).toBe(true);
    for (const [i, pagina] of leido.paginas.entries()) { expect(pagina.ancho).toBeCloseTo(595.28, 1); expect(pagina.alto).toBeCloseTo(841.89, 1); expect(pagina.texto).toContain(`Página ${i + 1} de ${leido.paginas.length}`); expect(pagina.posiciones.every((p) => p.x >= 40 && p.x <= 550 && p.y >= 25 && p.y <= 820)).toBe(true); }
  }, 15000);
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
