import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function leerPdf(buffer: Uint8Array) {
  const tarea = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }); const documento = await tarea.promise;
  try {
    const paginas: { texto: string; ancho: number; alto: number; posiciones: { x: number; y: number }[] }[] = [];
    for (let i = 1; i <= documento.numPages; i++) {
      const pagina = await documento.getPage(i); const contenido = await pagina.getTextContent(); const vista = pagina.getViewport({ scale: 1 });
      const items = contenido.items.flatMap((item) => 'str' in item ? [item] : []);
      paginas.push({ texto: items.map((item) => item.str).join(' '), ancho: vista.width, alto: vista.height, posiciones: items.filter((i) => i.str.trim()).map((i) => ({ x: i.transform[4] ?? 0, y: i.transform[5] ?? 0 })) });
    } return { paginas, texto: paginas.map((p) => p.texto).join('\n') };
  } finally { await tarea.destroy(); }
}
