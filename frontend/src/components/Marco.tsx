import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { Marca } from './Iconos';
export function Marco({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation(); const contenido = useRef<HTMLElement>(null);
  useEffect(() => { if (ubicacion.key !== 'default' && !ubicacion.hash) { contenido.current?.focus({ preventScroll: true }); contenido.current?.scrollIntoView?.({ block: 'start' }); } }, [ubicacion.key, ubicacion.hash]);
  return (
    <div className="flex min-h-screen flex-col bg-crema text-pino">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:block focus:bg-maiz-claro focus:p-4 focus:font-semibold">Saltar al contenido</a>
      <header className="z-30 border-b sm:sticky sm:top-0 border-pino/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-10">
          <Link to={sesion.usuario ? '/inicio' : '/'} className="flex min-h-11 items-center gap-3 text-xl font-bold tracking-tight">
            <Marca className="size-10 shrink-0" /><span>Rota<span className="text-cultivo">Andes</span></span>
          </Link>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-1 text-sm font-semibold">
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
        <div className="franja-andina" aria-hidden="true" />
      </header>
      <main ref={contenido} id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 focus:outline-none sm:px-10 sm:py-12">{children}</main>
      <footer className="mt-10 bg-pino text-crema">
        <div className="franja-andina" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-4 py-8 text-sm leading-relaxed sm:px-10">
          <div className="flex max-w-xl gap-3"><Marca className="size-10 shrink-0" /><p><strong className="block text-base">RotaAndes · Cotopaxi, Ecuador</strong>Herramienta de apoyo: no reemplaza la experiencia del agricultor ni el criterio de un técnico agrícola. Datos de NASA POWER, NASA GIBS (MODIS y SMAP) y Open-Meteo.</p></div>
          <div className="flex flex-wrap gap-2"><Link className="enlace-nav underline hover:text-pino" to="/">Portada</Link><Link className="enlace-nav underline hover:text-pino" to="/fuentes">Acerca de y fuentes</Link></div>
        </div>
      </footer>
    </div>
  );
}
