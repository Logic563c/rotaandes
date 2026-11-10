import { Icono } from './Iconos';
export function EstadoConsulta({ cargando, error, alReintentar }: { cargando: boolean; error: Error | null; alReintentar: () => void }) {
  if (cargando) return <p role="status" className="tarjeta estado-cargando p-6 font-semibold">Cargando información…</p>;
  if (error) return <div className="tarjeta p-6"><p role="alert" className="aviso-error flex gap-3"><Icono nombre="fuente" className="mt-0.5 size-5 shrink-0" /><span>{error.message}</span></p><button className="boton-secundario mt-4" onClick={alReintentar}><Icono nombre="rotacion" className="size-4" />Reintentar</button></div>;
  return null;
}
