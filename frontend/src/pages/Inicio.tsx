import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { obtenerEstadoServicio } from '../lib/api';
import { Marco } from '../components/Marco';
import { Icono } from '../components/Iconos';
import type { NombreIcono } from '../components/Iconos';
import type { CSSProperties } from 'react';

const pasos: { titulo: string; detalle: string; icono: NombreIcono; acento: string; claro: string }[] = [
  { titulo: 'Registra tu terreno', detalle: 'Ubícalo en el mapa y cuenta qué siembras, si tienes riego y qué es importante para ti.', icono: 'mapa', acento: '#2f7d43', claro: '#e3f1e1' },
  { titulo: 'Consulta el clima y tus cultivos', detalle: 'Revisa el clima habitual de tu zona, el pronóstico de siete días y el calendario orientativo.', icono: 'nube', acento: '#1f6391', claro: '#e2eff8' },
  { titulo: 'Compara opciones para tus próximas siembras', detalle: 'Explora tres rotaciones y escenarios de lluvia o temperatura. Lee los motivos antes de decidir.', icono: 'rotacion', acento: '#a3492a', claro: '#f8e6dc' },
];
const funciones: { titulo: string; detalle: string; icono: NombreIcono; acento: string; claro: string }[] = [
  { titulo: 'Clima de tu zona', detalle: 'Lluvia, temperaturas y humedad del suelo por mes, con datos de NASA POWER.', icono: 'termometro', acento: '#1f6391', claro: '#e2eff8' },
  { titulo: 'Pronóstico y heladas', detalle: 'Siete días de Open-Meteo con aviso preventivo cuando la mínima baja de 2 °C.', icono: 'copo', acento: '#1f6391', claro: '#e2eff8' },
  { titulo: 'Calendario de siembra', detalle: 'Diez cultivos y doce meses, con el motivo de cada recomendación.', icono: 'calendario', acento: '#2f7d43', claro: '#e3f1e1' },
  { titulo: 'Tres rotaciones', detalle: 'Tu patrón actual frente a dos alternativas, con evidencia, riesgos y vacíos.', icono: 'rotacion', acento: '#a3492a', claro: '#f8e6dc' },
  { titulo: 'Simulador de escenarios', detalle: 'Prueba menos lluvia o más calor sin modificar tus datos.', icono: 'deslizador', acento: '#7a5410', claro: '#fbf0d0' },
  { titulo: 'Vista satelital e informe', detalle: 'Imágenes MODIS y SMAP de la región e informe PDF para compartir.', icono: 'satelite', acento: '#1d4636', claro: '#ece5d3' },
];

// Ilustración original: páramo, terrazas de cultivo y el sol andino.
function PaisajeAndino() {
  return <svg viewBox="0 0 480 400" className="block h-auto w-full" fill="none" aria-hidden="true" focusable="false">
    <rect width="480" height="400" fill="#dcecf6" />
    <circle cx="372" cy="92" r="40" fill="#e6b33c" /><circle cx="372" cy="92" r="58" fill="#e6b33c" opacity="0.18" />
    <path d="M60 70c18-10 40-8 52 4 14-8 38-4 44 10H52c-4-6 0-12 8-14Z" fill="#fff" opacity="0.85" />
    <path d="m0 250 110-150 54 66 86-118 230 202v150H0Z" fill="#9fb7a6" />
    <path d="m196 104 54-56 62 54-34-12-22 14-28-14-32 14Z" fill="#fbfaf5" />
    <path d="m0 262 118-96 92 92 104-98 166 130v110H0Z" fill="#5f8f6c" />
    <path d="M0 292c120-50 210-40 290-6s130 30 190-4v118H0Z" fill="#2f7d43" />
    <path d="M0 322c130-60 260-50 480 20v58H0Z" fill="#c9844f" />
    <path d="M0 350c120-40 230-34 480 28v22H0Z" fill="#a3492a" />
    <path d="M0 322c130-48 250-40 480 22M0 336c130-44 250-36 480 26M0 365c120-34 230-28 400 14" stroke="#f3dcb8" strokeWidth="3" />
    <path d="M40 300v-26m-10 15 10-17 10 17M440 292v-30m-11 18 11-20 11 20" stroke="#1d4636" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M300 278c-6-18 4-28 14-28 4 10-2 22-14 28Zm0 0c4-14 18-18 26-12-4 10-16 14-26 12Zm0 0v20" stroke="#e3f1e1" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}

export function Inicio() {
  const consulta = useQuery({ queryKey: ['estadoServicio'], queryFn: ({ signal }) => obtenerEstadoServicio(signal) });
  return <Marco>
    <div className="fondo-campo -mx-4 -mt-8 overflow-hidden border-b border-pino/10 px-4 pb-10 pt-8 sm:-mx-10 sm:-mt-12 sm:rounded-b-[2.5rem] sm:px-10 sm:pb-14 sm:pt-12">
      <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div><p className="etiqueta-seccion">Desde los Andes, para nuestra tierra</p>
          <h1 className="mt-5 font-campo text-4xl leading-tight tracking-tight sm:text-5xl">Conoce tu terreno, comprende el clima y explora mejores opciones para sembrar.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-oliva">Un espacio de apoyo para agricultores de Latacunga y Cotopaxi. Tu experiencia del campo, acompañada de información para comparar opciones.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link className="boton-primario px-6 text-base" to="/registro">Crear mi cuenta</Link><Link className="boton-secundario px-6 text-base" to="/login">Iniciar sesión</Link></div>
          <ul aria-label="Fuentes de datos" className="mt-6 flex flex-wrap gap-2">
            <li className="chip chip--cielo"><Icono nombre="nube" className="size-4" />Clima NASA POWER</li>
            <li className="chip chip--cultivo"><Icono nombre="satelite" className="size-4" />Imágenes MODIS y SMAP</li>
            <li className="chip chip--maiz"><Icono nombre="sol" className="size-4" />Pronóstico Open-Meteo</li>
          </ul>
          <a className="enlace-nav mt-4 underline" href="#como-funciona">Conocer cómo funciona <span aria-hidden="true" className="ml-2">↓</span></a>
        </div>
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_24px_50px_-24px_#1d463680]"><PaisajeAndino /></div>
      </div>
    </div>
    <section id="como-funciona" tabIndex={-1} className="destino-terreno mt-12"><p className="etiqueta-seccion">A tu ritmo, paso a paso</p><h2 className="mt-3 font-campo text-3xl sm:text-4xl">Tu terreno es el punto de partida</h2>
      <ol className="mt-7 grid gap-5 md:grid-cols-3">{pasos.map((paso, indice) => <li className="tarjeta tarjeta--acento p-6" style={{ '--acento': paso.acento } as CSSProperties} key={paso.titulo}>
        <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl" style={{ background: paso.claro, color: paso.acento }}><Icono nombre={paso.icono} className="size-7" /></span><span className="chip chip--gris">Paso {indice + 1}</span></div>
        <h3 className="mt-4 font-campo text-2xl">{paso.titulo}</h3><p className="mt-3 leading-relaxed text-oliva">{paso.detalle}</p></li>)}</ol>
    </section>
    <section className="mt-12" aria-labelledby="titulo-funciones"><p className="etiqueta-seccion">Todo sobre tu parcela en un lugar</p><h2 id="titulo-funciones" className="mt-3 font-campo text-3xl sm:text-4xl">Lo que encontrarás</h2>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{funciones.map((funcion) => <li key={funcion.titulo} className="tarjeta flex gap-4 p-5">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: funcion.claro, color: funcion.acento }}><Icono nombre={funcion.icono} className="size-7" /></span>
        <div><h3 className="text-lg font-semibold">{funcion.titulo}</h3><p className="mt-1 text-sm leading-relaxed text-oliva">{funcion.detalle}</p></div></li>)}</ul>
    </section>
    <section className="mt-12 grid gap-6 overflow-hidden rounded-[2rem] bg-pino p-6 text-crema sm:p-9 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-maiz-claro">Datos con una explicación</p><h2 className="mt-3 font-campo text-3xl">El clima de una zona, tu conocimiento del lote</h2><p className="mt-4 leading-relaxed text-crema/90">NASA POWER ayuda a conocer condiciones históricas. MODIS y SMAP aportan imágenes regionales de vegetación y humedad del suelo mediante NASA GIBS. Open-Meteo aporta el pronóstico.</p><Link className="enlace-nav mt-3 underline hover:text-pino" to="/fuentes">Consultar las fuentes de información</Link></div>
      <div className="rounded-3xl bg-white/10 p-5 sm:p-6"><h3 className="font-campo text-2xl">Orientación, sin promesas de cosecha</h3><p className="mt-4 leading-relaxed text-crema/90">El calendario y las rotaciones combinan datos con reglas y un catálogo agrícola referencial. No garantizan rendimiento, ingresos ni ahorro de agua. Si falta información, se indica.</p><p className="mt-3 font-semibold leading-relaxed text-maiz-claro">RotaAndes no sustituye tu experiencia ni la evaluación de un técnico agrícola.</p><Link className="enlace-nav mt-3 underline hover:text-pino" to="/glosario">¿Una palabra nueva? Abre el glosario</Link></div>
    </section>
    <section className="tarjeta mt-10 flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Estado de conexión"><div role="status" aria-live="polite" aria-atomic="true" className="flex items-start gap-3"><span aria-hidden="true" className={`mt-1 size-3 shrink-0 rounded-full ${consulta.isFetching ? 'bg-maiz' : consulta.isError ? 'bg-arcilla' : 'bg-cultivo'}`} /><div><h2 className="font-semibold">{consulta.isFetching ? 'Comprobando conexión…' : consulta.isError ? 'No pudimos conectar' : 'Conexión disponible'}</h2><p className="mt-1 text-sm text-oliva">{consulta.isError ? 'Puedes leer el glosario y las fuentes. Para ingresar o guardar tu terreno necesitamos recuperar la conexión.' : 'Para guardar y consultar datos de tu terreno necesitas conexión a Internet.'}</p></div></div><button className="boton-secundario" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>{consulta.isFetching ? 'Comprobando…' : consulta.isError ? 'Reintentar conexión' : 'Volver a comprobar'}</button></section>
  </Marco>;
}
