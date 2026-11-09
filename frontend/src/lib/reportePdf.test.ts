import { describe, expect, it, vi } from 'vitest';
import { obtenerReportePdf } from './api';
const id = '00000000-0000-4000-8000-000000000001';
// Solo comprobación de transporte: no es un PDF real; backend/E2E usan un parser de documentos auténticos.
const transporte = new TextEncoder().encode('%PDF-1.7\nfixture de transporte\n%%EOF');
describe('Transporte autenticado de PDF', () => {
  it('descarga binario por Bearer sin cookies ni navegación directa y usa nombre seguro', async () => {
    const solicitar = vi.fn().mockResolvedValue(new Response(transporte, { headers: { 'content-type': 'application/pdf' } })); vi.stubGlobal('fetch', solicitar);
    const datos = await obtenerReportePdf('token-solo-prueba', id); expect(datos.nombre).toBe(`rotaandes-${id}.pdf`); expect(datos.archivo.type).toBe('application/pdf'); expect(datos.archivo.size).toBe(transporte.length);
    expect(solicitar).toHaveBeenCalledWith(new URL(`http://localhost:3000/api/terrenos/${id}/reporte.pdf`), expect.objectContaining({ method: 'GET', credentials: 'omit', headers: { Accept: 'application/pdf', Authorization: 'Bearer token-solo-prueba' } }));
  });
  it.each([401, 403, 404, 429, 500])('propaga error HTTP %s sin crear un archivo JSON con extensión PDF', async (estado) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Prueba' }, { status: estado }))); await expect(obtenerReportePdf('token', id)).rejects.toMatchObject({ codigoHttp: estado });
  });
  it.each(['application/json', 'text/html', ''])('rechaza MIME incompatible: %s', async (tipo) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(transporte, { headers: { 'content-type': tipo } }))); await expect(obtenerReportePdf('token', id)).rejects.toThrow('PDF válido');
  });
  it('rechaza firma/tráiler ausentes, tamaño excesivo y UUID manipulable', async () => {
    const solicitar = vi.fn().mockResolvedValueOnce(new Response('{}', { headers: { 'content-type': 'application/pdf' } })).mockResolvedValueOnce(new Response(transporte, { headers: { 'content-type': 'application/pdf', 'content-length': '4194305' } })); vi.stubGlobal('fetch', solicitar);
    await expect(obtenerReportePdf('token', id)).rejects.toThrow('PDF válido'); await expect(obtenerReportePdf('token', id)).rejects.toThrow(); await expect(obtenerReportePdf('token', '../otro')).rejects.toThrow('identificador'); expect(solicitar).toHaveBeenCalledTimes(2);
  });
});
