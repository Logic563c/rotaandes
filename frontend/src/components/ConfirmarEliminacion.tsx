import { useEffect, useId, useRef } from 'react';

interface ConfirmarEliminacionProps {
  titulo: string; mensaje: string; estaEliminando: boolean; error: string | null;
  alConfirmar: () => void; alCancelar: () => void;
}
export function ConfirmarEliminacion({ titulo, mensaje, estaEliminando, error, alConfirmar, alCancelar }: ConfirmarEliminacionProps) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idMensaje = useId();
  useEffect(() => {
    const dialogo = referencia.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);
  return <dialog ref={referencia} aria-labelledby={idTitulo} aria-describedby={idMensaje} className="dialogo-confirmacion" onCancel={(evento) => { evento.preventDefault(); if (!estaEliminando) alCancelar(); }}>
    <h2 id={idTitulo} className="text-xl font-semibold">{titulo}</h2>
    <p id={idMensaje} className="mt-4 text-sm leading-relaxed text-oliva">{mensaje}</p>
    {error && <p role="alert" className="aviso-error mt-4">{error}</p>}
    <div className="mt-6 flex flex-wrap gap-3"><button autoFocus type="button" className="boton-secundario" disabled={estaEliminando} onClick={alCancelar}>Cancelar</button><button type="button" className="boton-peligro" disabled={estaEliminando} onClick={alConfirmar}>{estaEliminando ? 'Eliminando…' : 'Sí, eliminar'}</button></div>
  </dialog>;
}
