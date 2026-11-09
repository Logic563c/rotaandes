import { readFile, stat } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

try {
  const ruta = process.argv[2]; if (!ruta || process.argv.length !== 3) throw new Error();
  const informacion = await stat(ruta); if (informacion.size > 4 * 1024 * 1024 || informacion.size < 10) throw new Error();
  const bytes = await readFile(ruta); if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error();
  const tarea = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }); const pdf = await tarea.promise;
  try {
    if (pdf.numPages < 1 || pdf.numPages > 80) throw new Error(); let caracteres = 0;
    for (let i = 1; i <= pdf.numPages; i++) { const p = await pdf.getPage(i); const v = p.getViewport({ scale: 1 }); if (Math.abs(v.width - 595.28) > 1 || Math.abs(v.height - 841.89) > 1) throw new Error(); const texto = await p.getTextContent(); caracteres += texto.items.reduce((s, t) => s + ('str' in t ? t.str.length : 0), 0); }
    if (!caracteres) throw new Error(); console.info(JSON.stringify({ pdf_valido: true, formato: 'A4', paginas: pdf.numPages, bytes: bytes.length, caracteres_extraibles: caracteres, contenido_privado: 'No se imprime el texto ni la ruta del archivo.' }));
  } finally { await tarea.destroy(); }
} catch { console.error('No se pudo validar el PDF. Revisa el archivo y sus límites; no se imprime su contenido privado.'); process.exitCode = 1; }
