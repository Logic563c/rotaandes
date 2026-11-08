export function EstadoConsulta({ cargando, error, alReintentar }: { cargando: boolean; error: Error | null; alReintentar: () => void }) {
  if (cargando) return <p role="status" className="tarjeta p-6">Cargando información…</p>;
  if (error) return <div className="tarjeta p-6"><p role="alert" className="aviso-error">{error.message}</p><button className="boton-secundario mt-4" onClick={alReintentar}>Reintentar</button></div>;
  return null;
}
