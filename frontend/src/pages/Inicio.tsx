import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { obtenerEstadoServicio } from '../lib/api';
import { Marco } from '../components/Marco';
import { Icono } from '../components/Iconos';
import type { NombreIcono } from '../components/Iconos';
import type { CSSProperties } from 'react';
import { CreditoFoto } from '../components/Fotografia';
import { conjuntoFoto, FOTOS as FOTOS_PORTADA, fuenteFoto } from '../lib/fotografias';

const pasos: { titulo: string; detalle: string; icono: NombreIcono; acento: string; claro: string }[] = [
  { titulo: 'Registra tu terreno', detalle: 'Ubícalo en el mapa y cuenta qué siembras, si tienes riego y qué es importante para ti.', icono: 'mapa', acento: '#2f7d43', claro: '#e3f1e1' },
  { titulo: 'Consulta el clima y tus cultivos', detalle: 'Revisa el clima habitual de tu zona, el pronóstico de siete días y el calendario orientativo.', icono: 'nube', acento: '#1f6391', claro: '#e2eff8' },
  { titulo: 'Compara opciones para tus próximas siembras', detalle: 'Explora tres rotaciones y escenarios de lluvia o temperatura. Lee los motivos antes de decidir.', icono: 'rotacion', acento: '#a3492a', claro: '#f8e6dc' },
];
const funciones: { titulo: string; detalle: string; icono: NombreIcono; acento: string; claro: string }[] = [
  { titulo: 'Clima de tu zona', detalle: 'Lluvia, temperaturas y humedad del suelo por mes, con datos de NASA POWER.', icono: 'termometro', acento: '#1f6391', claro: '#e2eff8' },
  { titulo: 'Pronóstico y heladas', detalle: 'Siete días de Open-Meteo con aviso preventivo cuando la mínima baja de 2 °C.', icono: 'copo', acento: '#1f6391', claro: '#e2eff8' },
  { titulo: 'Calendario de siembra', detalle: '29 cultivos y doce meses, con el motivo de cada recomendación.', icono: 'calendario', acento: '#2f7d43', claro: '#e3f1e1' },
  { titulo: 'Tres rotaciones', detalle: 'Tu patrón actual frente a dos alternativas, con evidencia, riesgos y vacíos.', icono: 'rotacion', acento: '#a3492a', claro: '#f8e6dc' },
  { titulo: 'Simulador de escenarios', detalle: 'Prueba menos lluvia o más calor sin modificar tus datos.', icono: 'deslizador', acento: '#7a5410', claro: '#fbf0d0' },
  { titulo: 'Vista satelital e informe', detalle: 'Imágenes MODIS y SMAP de la región e informe PDF para compartir.', icono: 'satelite', acento: '#1d4636', claro: '#ece5d3' },
];

// Composición fotográfica: campos e invernaderos de Cotopaxi con un contorno de parcela y etiquetas de las funciones.
// Las etiquetas son decorativas (repiten funciones descritas en la página) y no muestran datos inventados.
function ComposicionCampo() {
  const foto = FOTOS_PORTADA.invernaderos;
  return <figure className="composicion-campo mx-auto w-full max-w-md lg:max-w-none">
    <div className="composicion-campo__foto">
      <img src={fuenteFoto(foto)} srcSet={conjuntoFoto(foto)} sizes="(min-width: 1024px) 40vw, 90vw" width={1200} height={900} alt={foto.descripcion} decoding="async" fetchPriority="high" />
      <svg aria-hidden="true" focusable="false" viewBox="0 0 400 300" preserveAspectRatio="none" className="composicion-campo__trazo"><polygon points="70,196 210,182 300,214 236,262 92,256" /><g>{[[70, 196], [210, 182], [300, 214], [236, 262], [92, 256]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />)}</g></svg>
    </div>
    <div aria-hidden="true">
      <span className="tarjeta-flotante tarjeta-flotante--a"><Icono nombre="nube" className="size-4 text-cielo" />Clima con datos NASA</span>
      <span className="tarjeta-flotante tarjeta-flotante--b"><Icono nombre="area" className="size-4 text-cultivo" />Delimita tu parcela</span>
      <span className="tarjeta-flotante tarjeta-flotante--c"><Icono nombre="calendario" className="size-4 text-arcilla" />Calendario de siembra</span>
    </div>
    <figcaption className="mt-3 px-1"><CreditoFoto foto={foto} /></figcaption>
  </figure>;
}

const FOTOS = [
  { archivo: 'laderas-cultivadas-latacunga', alto: 960, texto: 'Laderas de la sierra cubiertas de parcelas de cultivo de distintos colores, con casas y una iglesia al pie, en el valle de Latacunga.', pie: 'Laderas cultivadas en parcelas, valle de Latacunga.', autor: 'Gideoraielgave', original: 'https://commons.wikimedia.org/wiki/File:Valle_en_Latacunga_-_Cotopaxi_-_Ecuador_III.jpg' },
  { archivo: 'parcelas-cotopaxi', alto: 963, texto: 'Lomas con parcelas agrícolas y pajonal; al fondo, el volcán Cotopaxi con nieve, parcialmente cubierto por nubes.', pie: 'Parcelas en las lomas, con el Cotopaxi al fondo.', autor: 'Arabsalam', original: 'https://commons.wikimedia.org/wiki/File:Road_to_Quilotoa_Cotopaxi_view_Ecuador_1614.jpg' },
] as const;

export function Inicio() {
  const consulta = useQuery({ queryKey: ['estadoServicio'], queryFn: ({ signal }) => obtenerEstadoServicio(signal) });
  return <Marco>
    <div className="portada-fotografica fondo-campo relative -mx-4 -mt-8 overflow-hidden border-b border-pino/10 px-4 pb-10 pt-8 sm:-mx-10 sm:-mt-12 sm:rounded-b-[2.5rem] sm:px-10 sm:pb-14 sm:pt-12">
      {/* Fondo fotográfico estático de Cotopaxi y campos, con un velo claro para la lectura. */}
      <div aria-hidden="true" className="portada-foto"><img src={fuenteFoto(FOTOS_PORTADA.portada)} srcSet={conjuntoFoto(FOTOS_PORTADA.portada)} sizes="100vw" alt="" decoding="async" fetchPriority="high" /></div>
      <div aria-hidden="true" className="portada-velo" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div><p className="etiqueta-seccion">Desde los Andes, para nuestra tierra</p>
          <h1 className="mt-5 font-campo text-4xl leading-tight tracking-tight sm:text-5xl">Conoce tu terreno, comprende el clima y explora mejores opciones para sembrar.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-oliva">Un espacio de apoyo para agricultores de Latacunga y Cotopaxi. Tu experiencia del campo, acompañada de información para comparar opciones.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link className="boton-primario px-6 text-base" to="/registro">Crear mi cuenta</Link><Link className="boton-secundario px-6 text-base" to="/login">Iniciar sesión</Link></div>
          <ul aria-label="Fuentes de datos" className="mt-6 flex flex-wrap gap-2">
            <li className="chip chip--cielo"><Icono nombre="nube" className="size-4" />Clima NASA POWER</li>
            <li className="chip chip--cultivo"><Icono nombre="satelite" className="size-4" />Imágenes MODIS y SMAP</li>
            <li className="chip chip--maiz"><Icono nombre="sol" className="size-4" />Pronóstico Open-Meteo</li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2"><a className="enlace-nav underline" href="#como-funciona">Conocer cómo funciona <span aria-hidden="true" className="ml-2">↓</span></a>
          </div>
        </div>
        <ComposicionCampo />
      </div>
      <div className="relative mt-6"><CreditoFoto foto={FOTOS_PORTADA.portada} /></div>
    </div>
    <section id="como-funciona" tabIndex={-1} className="destino-terreno mt-12"><p className="etiqueta-seccion">A tu ritmo, paso a paso</p><h2 className="mt-3 font-campo text-3xl sm:text-4xl">Tu terreno es el punto de partida</h2>
      <ol className="mt-7 grid gap-5 md:grid-cols-3">{pasos.map((paso, indice) => <li className="tarjeta tarjeta--acento tarjeta--interactiva p-6" style={{ '--acento': paso.acento } as CSSProperties} key={paso.titulo}>
        <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl" style={{ background: paso.claro, color: paso.acento }}><Icono nombre={paso.icono} className="size-7" /></span><span className="chip chip--gris">Paso {indice + 1}</span></div>
        <h3 className="mt-4 font-campo text-2xl">{paso.titulo}</h3><p className="mt-3 leading-relaxed text-oliva">{paso.detalle}</p></li>)}</ol>
    </section>
    <section className="mt-12" aria-labelledby="titulo-tierra"><p className="etiqueta-seccion">Nuestra sierra, parcela por parcela</p><h2 id="titulo-tierra" className="mt-3 font-campo text-3xl sm:text-4xl">Cada lote es distinto</h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-oliva">En Cotopaxi las parcelas suben por las laderas y cambian de cultivo de un año a otro. Por eso RotaAndes te deja marcar en el mapa el contorno de tu zona de cultivo, conocer su superficie aproximada y guardar tu historial de siembras.</p>
      <div className="mt-7 grid gap-5 md:grid-cols-2">{FOTOS.map((foto) => <figure key={foto.archivo} className="foto-campo">
        <img src={`/imagenes/${foto.archivo}-720.webp`} srcSet={`/imagenes/${foto.archivo}-720.webp 720w, /imagenes/${foto.archivo}-1280.webp 1280w`} sizes="(min-width: 768px) 45vw, 100vw" width={1280} height={foto.alto} loading="lazy" decoding="async" alt={foto.texto} />
        <figcaption className="px-4 py-3 text-sm"><span className="font-semibold">{foto.pie}</span><span className="mt-1 block text-xs text-oliva">Foto: {foto.autor} · <a className="underline" href={foto.original} target="_blank" rel="noreferrer">Wikimedia Commons</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> (redimensionada)</span></figcaption>
      </figure>)}</div>
    </section>
    <section className="mt-12" aria-labelledby="titulo-funciones"><p className="etiqueta-seccion">Todo sobre tu parcela en un lugar</p><h2 id="titulo-funciones" className="mt-3 font-campo text-3xl sm:text-4xl">Lo que encontrarás</h2>
      <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{funciones.map((funcion) => <li key={funcion.titulo} className="tarjeta tarjeta--interactiva flex gap-4 p-5">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: funcion.claro, color: funcion.acento }}><Icono nombre={funcion.icono} className="size-7" /></span>
        <div><h3 className="text-lg font-semibold">{funcion.titulo}</h3><p className="mt-1 text-sm leading-relaxed text-oliva">{funcion.detalle}</p></div></li>)}</ul>
    </section>
    <section className="mt-12 grid gap-6 overflow-hidden rounded-[2rem] bg-pino p-6 text-crema sm:p-9 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-maiz-claro">Datos con una explicación</p><h2 className="mt-3 font-campo text-3xl">El clima de una zona, tu conocimiento del lote</h2><p className="mt-4 leading-relaxed text-crema/90">NASA POWER ayuda a conocer condiciones históricas. MODIS y SMAP aportan imágenes regionales de vegetación y humedad del suelo mediante NASA GIBS. Open-Meteo aporta el pronóstico.</p><Link className="enlace-nav mt-3 underline hover:text-pino" to="/fuentes">Consultar las fuentes de información</Link></div>
      <div className="rounded-3xl bg-white/10 p-5 sm:p-6"><h3 className="font-campo text-2xl">Orientación, sin promesas de cosecha</h3><p className="mt-4 leading-relaxed text-crema/90">El calendario y las rotaciones combinan datos con reglas y un catálogo agrícola referencial. No garantizan rendimiento, ingresos ni ahorro de agua. Si falta información, se indica.</p><p className="mt-3 font-semibold leading-relaxed text-maiz-claro">RotaAndes no sustituye tu experiencia ni la evaluación de un técnico agrícola.</p><Link className="enlace-nav mt-3 underline hover:text-pino" to="/glosario">¿Una palabra nueva? Abre el glosario</Link></div>
    </section>
    <section className="tarjeta mt-10 flex flex-wrap items-center justify-between gap-4 p-5" aria-label="Estado de conexión"><div role="status" aria-live="polite" aria-atomic="true" className="flex items-start gap-3"><span aria-hidden="true" className={`mt-1 size-3 shrink-0 rounded-full ${consulta.isFetching ? 'bg-maiz' : consulta.isError ? 'bg-arcilla' : 'bg-cultivo'}`} /><div><h2 className="font-semibold">{consulta.isFetching ? 'Comprobando conexión…' : consulta.isError ? 'No pudimos conectar' : 'Conexión disponible'}</h2><p className="mt-1 text-sm text-oliva">{consulta.isError ? 'Puedes leer el glosario y las fuentes. Para ingresar o guardar tu terreno necesitamos recuperar la conexión.' : 'Para guardar y consultar datos de tu terreno necesitas conexión a Internet.'}</p></div></div><button className="boton-secundario" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>{consulta.isFetching ? 'Comprobando…' : consulta.isError ? 'Reintentar conexión' : 'Volver a comprobar'}</button></section>
  </Marco>;
}
