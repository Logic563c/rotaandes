// Iconos propios de RotaAndes (trazos SVG originales). Decorativos: el texto vecino siempre explica su significado.
import type { ReactNode } from 'react';

export type NombreIcono = 'gota' | 'hoja' | 'copo' | 'moneda' | 'nube' | 'sol' | 'calendario' | 'rotacion' | 'mapa' | 'documento' | 'satelite'
  | 'termometro' | 'tendencia' | 'deslizador' | 'brote' | 'altitud' | 'riego' | 'suelo' | 'area' | 'libro' | 'fuente' | 'usuario' | 'tecnico' | 'flecha';

const trazos: Record<NombreIcono, ReactNode> = {
  gota: <path d="M12 3.5c3.2 4 5.5 7.1 5.5 10a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-10Z" />,
  hoja: <><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5Z" /><path d="M5 19 13 11" /></>,
  copo: <><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></>,
  moneda: <><circle cx="12" cy="12" r="8" /><path d="M14.5 9.2c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1.1 0-2-.5-2.6-1.3M12 6.5V8m0 8v1.5" /></>,
  nube: <path d="M7 18h10.5a4 4 0 0 0 .3-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18Z" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h2M13.5 14h2M8 17h2" /></>,
  rotacion: <><path d="M19 8a7.5 7.5 0 0 0-13.3-1.2M5 16a7.5 7.5 0 0 0 13.3 1.2" /><path d="M19 3.5V8h-4.5M5 20.5V16h4.5" /></>,
  mapa: <><path d="m3.5 6.5 5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2v-13Z" /><path d="M9 4.5v13M15 6.5v13" /></>,
  documento: <><path d="M6.5 3h7.5l4.5 4.5v13.5h-12V3Z" /><path d="M14 3v4.5h4.5M9 12.5h6M9 16h6" /></>,
  satelite: <><rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)" /><path d="m5 5 4 4M15 15l4 4M3 9l3-3 3 3-3 3-3-3ZM15 21l3-3 3 3" /><path d="M16.5 4.5a4.5 4.5 0 0 1 3 3" /></>,
  termometro: <><path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a3.8 3.8 0 1 1-4 0Z" /><path d="M12 9v7" /></>,
  tendencia: <><path d="M3.5 20h17" /><path d="m4.5 15.5 5-5 3.5 3.5 6.5-7" /><path d="M15 7h4.5v4.5" /></>,
  deslizador: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></>,
  brote: <><path d="M12 21v-9" /><path d="M12 12c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5ZM12 14.5c0-3.5 2.5-6 6.5-6 0 3.5-2.5 6-6.5 6Z" /><path d="M7 21h10" /></>,
  altitud: <><path d="m2.5 19.5 6.5-11 4 6.5 2.5-3.5 6 8h-19Z" /><path d="m7 12 2 1.5 2-1.5" /></>,
  riego: <><path d="M4 9.5h9a3 3 0 0 1 3 3V14" /><path d="M4 7v5" /><path d="M14.5 17.5v.5M17.5 17.5v.5M16 20v.5M13 20v.5M19 20v.5" /></>,
  suelo: <><path d="M3 9.5h18" /><path d="M3 9.5c3-3 6-3 9 0s6 3 9 0" /><path d="M6 14h.01M11 16h.01M16 13.5h.01M8 18.5h.01M18 18h.01" /><path d="M3 21h18" /></>,
  area: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12h16M12 4v16" /></>,
  libro: <><path d="M4.5 5.5c3-1.5 5.5-1 7.5.5v14c-2-1.5-4.5-2-7.5-.5v-14ZM19.5 5.5c-3-1.5-5.5-1-7.5.5v14c2-1.5 4.5-2 7.5-.5v-14Z" /></>,
  fuente: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.5h.01" /></>,
  usuario: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" /></>,
  tecnico: <><path d="M9 11.5a3.5 3.5 0 1 1 6 0" /><path d="M5 20.5c1-3.7 3.7-5.5 7-5.5s6 1.8 7 5.5" /><path d="m14.5 6 3-3 2.5 2.5-3 3" /></>,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icono({ nombre, className = '' }: { nombre: NombreIcono; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{trazos[nombre]}</svg>;
}

// Marca de RotaAndes: montaña andina con un brote. Original.
export function Marca({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
    <rect width="48" height="48" rx="14" fill="#1d4636" />
    <path d="M6 36 18 17l6 9 5-6 13 16H6Z" fill="#2f7d43" />
    <path d="m18 17 4 6-4-2-3 2 3-6Z" fill="#f8f6ef" />
    <path d="M6 36h36v4H6z" fill="#a3492a" />
    <circle cx="35" cy="13" r="4.5" fill="#e6b33c" />
    <path d="M24 36v-7m0 0c0-3-2-4.5-5-4.5 0 3 2 4.5 5 4.5Zm0-1.5c0-2.6 1.8-4 4.5-4 0 2.6-1.8 4-4.5 4Z" stroke="#f8f6ef" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </svg>;
}

// Cabecera común de los módulos del detalle del terreno.
export function CabeceraModulo({ icono, etiqueta, children }: { icono: NombreIcono; etiqueta: string; children: ReactNode }) {
  return <div className="modulo__cabecera"><span className="modulo__icono"><Icono nombre={icono} /></span><div className="min-w-0"><p className="etiqueta-seccion">{etiqueta}</p>{children}</div></div>;
}
