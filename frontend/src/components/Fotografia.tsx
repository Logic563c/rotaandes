// Fotografías reales de Cotopaxi con licencia verificada (ver public/imagenes/CREDITOS.md).
// Son decorativas en las cabeceras: el texto siempre va sobre un velo de contraste y nunca sobre mapas, gráficas ni formularios.
import type { ReactNode } from 'react';
import { conjuntoFoto, FOTOS, fuenteFoto } from '../lib/fotografias';
import type { FotoRegistrada } from '../lib/fotografias';

export function CreditoFoto({ foto, claro = false }: { foto: FotoRegistrada; claro?: boolean }) {
  return <p className={`credito-foto ${claro ? 'credito-foto--claro' : ''}`}>Foto: {foto.autor} · <a href={foto.original} target="_blank" rel="noreferrer">Wikimedia Commons</a> · <a href={foto.licenciaUrl} target="_blank" rel="noreferrer">{foto.licencia}</a></p>;
}

/** Cabecera de página con fotografía de fondo y velo oscuro: el texto claro conserva contraste ≥ 4,5:1. */
export function BannerFoto({ children, foto = FOTOS.valle, className = '' }: { children: ReactNode; foto?: FotoRegistrada; className?: string }) {
  return <div className={`banner-foto ${className}`}>
    <img className="banner-foto__imagen" src={fuenteFoto(foto)} srcSet={conjuntoFoto(foto)} sizes="(min-width: 1152px) 1100px, 100vw" alt="" aria-hidden="true" decoding="async" />
    <div aria-hidden="true" className="banner-foto__velo" />
    <div className="relative">{children}</div>
    <div className="relative mt-5"><CreditoFoto foto={foto} claro /></div>
  </div>;
}
