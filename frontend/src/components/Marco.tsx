import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
export function Marco({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation(); const contenido = useRef<HTMLElement>(null);
  useEffect(() => { if (ubicacion.key !== 'default' && !ubicacion.hash) { contenido.current?.focus({ preventScroll: true }); contenido.current?.scrollIntoView?.({ block: 'start' }); } }, [ubicacion.key, ubicacion.hash]);
  return (
    <div className="min-h-screen bg-crema text-pino">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:p-4">Saltar al contenido</a>
      <header className="border-b border-pino/15 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-10">
          <Link to={sesion.usuario ? '/inicio' : '/'} className="flex items-center gap-3 text-xl font-bold">
            <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-2xl bg-pino font-campo text-crema">R</span>RotaAndes
          </Link>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <NavLink className="enlace-nav" to="/glosario">Glosario</NavLink>
            <NavLink className="enlace-nav" to="/fuentes">Fuentes</NavLink>
            {sesion.usuario ? <>
              <NavLink className="enlace-nav" to="/inicio">Mi espacio</NavLink>
              {sesion.usuario.rol === 'tecnico' && <NavLink className="enlace-nav" to="/tecnico">Panel técnico</NavLink>}
              <NavLink className="enlace-nav" to="/terrenos">{sesion.usuario.rol === 'agricultor' ? 'Mis terrenos' : 'Terrenos'}</NavLink>
              <NavLink className="enlace-nav" to="/perfil">Mi perfil</NavLink>
              <button className="enlace-nav" type="button" onClick={() => {
                sesion.cerrarSesion(); void navegar('/login', { replace: true });
              }}>Cerrar sesión</button>
            </> : <>
              <NavLink className="enlace-nav" to="/login">Iniciar sesión</NavLink>
              <NavLink className="boton-primario" to="/registro">Crear cuenta</NavLink>
            </>}
          </nav>
        </div>
      </header>
      <main ref={contenido} id="contenido" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14">{children}</main>
      <footer className="mx-auto max-w-6xl border-t border-pino/15 px-5 py-7 text-xs leading-relaxed text-oliva sm:px-10">
        RotaAndes · Cotopaxi, Ecuador. Herramienta de apoyo: no reemplaza la experiencia del agricultor ni el criterio de un técnico agrícola.
        <div className="mt-3 flex flex-wrap gap-2"><Link className="enlace-nav underline" to="/">Portada</Link><Link className="enlace-nav underline" to="/fuentes">Acerca de y fuentes</Link></div>
      </footer>
    </div>
  );
}
