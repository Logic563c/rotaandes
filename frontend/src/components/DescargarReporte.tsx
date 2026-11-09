import { useEffect, useRef, useState } from 'react';
import { obtenerReportePdf } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';

export function DescargarReporte({ terrenoId }: { terrenoId: string }) {
  const sesion = useAgricultura(); const [preparando, establecerPreparando] = useState(false); const [error, establecerError] = useState<string | null>(null); const [descargado, establecerDescargado] = useState(false);
  const control = useRef<AbortController | null>(null); const enlaces = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => { const urls = enlaces.current; return () => { control.current?.abort(); for (const [url, temporizador] of urls) { clearTimeout(temporizador); URL.revokeObjectURL(url); } urls.clear(); }; }, []);
  async function descargar() {
    if (control.current) return; const actual = new AbortController(); control.current = actual; establecerPreparando(true); establecerError(null); establecerDescargado(false);
    try {
      const resultado = await sesion.ejecutar((token) => obtenerReportePdf(token, terrenoId, actual.signal), actual.signal);
      if (!sesion.sigueActiva() || actual.signal.aborted) return;
      const url = URL.createObjectURL(resultado.archivo); const enlace = document.createElement('a'); enlace.href = url; enlace.download = resultado.nombre;
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
      const temporizador = setTimeout(() => { URL.revokeObjectURL(url); enlaces.current.delete(url); }, 1000); enlaces.current.set(url, temporizador); establecerDescargado(true);
    } catch (fallo: unknown) { if (!actual.signal.aborted && sesion.sigueActiva()) establecerError(fallo instanceof Error ? fallo.message : 'No se pudo descargar el informe.'); }
    finally { if (control.current === actual) control.current = null; if (!actual.signal.aborted && sesion.sigueActiva()) establecerPreparando(false); }
  }
  return <section aria-label="Informe PDF del terreno" className="tarjeta mt-7 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="max-w-xl"><h2 className="font-campo text-2xl">Un informe para revisar y compartir</h2><p className="mt-2 text-sm leading-relaxed text-oliva">Datos del terreno, historial y resultados disponibles en el escenario original. Las secciones sin información se indican; no incluye cambios hipotéticos del simulador.</p></div><button className="boton-primario" type="button" disabled={preparando} onClick={() => { void descargar(); }}>{preparando ? 'Preparando informe…' : 'Descargar informe PDF'}</button></div>
    {preparando && <p role="status" className="mt-3 text-sm">Preparando el documento. Puede tardar unos segundos al comprobar las fuentes.</p>}{error && <p role="alert" className="aviso-error mt-4">{error}</p>}{descargado && <p role="status" className="mt-3 text-sm">La descarga del informe PDF está preparada. Revisa las descargas de tu navegador.</p>}
  </section>;
}
