import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { obtenerEstadoServicio } from '../lib/api';
import { Marco } from '../components/Marco';

const pasos = [
  { titulo: 'Registra tu terreno', detalle: 'Ubícalo en el mapa y cuenta qué siembras, si tienes riego y qué es importante para ti.' },
  { titulo: 'Consulta el clima y tus cultivos', detalle: 'Revisa el clima habitual de tu zona, el pronóstico de siete días y el calendario orientativo.' },
  { titulo: 'Compara opciones para tus próximas siembras', detalle: 'Explora tres rotaciones y escenarios de lluvia o temperatura. Lee los motivos antes de decidir.' },
];
export function Inicio() {
  const consulta = useQuery({ queryKey: ['estadoServicio'], queryFn: ({ signal }) => obtenerEstadoServicio(signal) });
  return <Marco>
    <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div><p className="etiqueta-seccion">Desde los Andes, para nuestra tierra</p>
        <h1 className="mt-5 font-campo text-4xl leading-tight tracking-tight sm:text-5xl">Conoce tu terreno, comprende el clima y explora mejores opciones para sembrar.</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-oliva">Un espacio de apoyo para agricultores de Latacunga y Cotopaxi. Tu experiencia del campo, acompañada de información para comparar opciones.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link className="boton-primario" to="/registro">Crear mi cuenta</Link><Link className="boton-secundario" to="/login">Iniciar sesión</Link></div>
        <a className="enlace-nav mt-4 underline" href="#como-funciona">Conocer cómo funciona <span aria-hidden="true" className="ml-2">↓</span></a>
      </div>
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-t-[45%] rounded-b-3xl bg-arena" aria-hidden="true">          <svg viewBox="0 0 480 540" className="block h-auto w-full" fill="none">
            <circle cx="345" cy="112" r="44" fill="#cf9c66" />
            <path d="m0 320 124-178 62 79L284 68l196 252v220H0Z" fill="#aab4a0" />
            <path d="m223 163 61-95 71 91-46-20-24 12-26-19-36 31Z" fill="#f6f3e8" />
            <path d="m0 332 128-114 100 108 100-105 152 147v172H0Z" fill="#708575" />
            <path d="M0 368c132-63 200-35 283 3s123 36 197-1v170H0V368Z" fill="#446957" />
            <path d="M0 433c108-116 239-100 480 42v65H0V433Z" fill="#bd9770" />
            <path d="M0 433c108-65 213-61 480 77M0 470c127-80 259-44 397 70M0 515c120-67 213-29 290 25" stroke="#f0dfbd" strokeWidth="3" />
            <path d="M0 510c115-38 170-6 201 30H0v-30Z" fill="#23483c" />
            <path d="M340 540c-52-81-69-104-38-161" stroke="#ede6d7" strokeWidth="13" />
            <path d="M49 326v-43m-13 25 13-27 14 27M407 361v-51m-15 30 15-32 15 32" stroke="#23483c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg></div>
    </div>
    <section id="como-funciona" tabIndex={-1} className="destino-terreno mt-14 border-t border-pino/15 pt-9"><p className="etiqueta-seccion">A tu ritmo, paso a paso</p><h2 className="mt-3 font-campo text-3xl">Tu terreno es el punto de partida</h2>
      <ol className="mt-7 grid gap-5 md:grid-cols-3">{pasos.map((paso, indice) => <li className="tarjeta p-6" key={paso.titulo}><span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-pino font-semibold text-white">{indice + 1}</span><h3 className="mt-4 font-campo text-2xl">{paso.titulo}</h3><p className="mt-3 leading-relaxed text-oliva">{paso.detalle}</p></li>)}</ol>
    </section>
    <section className="mt-10 grid gap-6 rounded-3xl border border-pino/15 bg-arena/55 p-6 sm:p-8 lg:grid-cols-2"><div><p className="etiqueta-seccion">Datos con una explicación</p><h2 className="mt-3 font-campo text-3xl">El clima de una zona, tu conocimiento del lote</h2><p className="mt-4 leading-relaxed text-oliva">NASA POWER ayuda a conocer condiciones históricas. MODIS y SMAP aportan imágenes regionales de vegetación y humedad del suelo mediante NASA GIBS. Open-Meteo aporta el pronóstico.</p><Link className="enlace-nav mt-3 underline" to="/fuentes">Consultar las fuentes de información</Link></div>
      <div><h3 className="font-campo text-2xl">Orientación, sin promesas de cosecha</h3><p className="mt-4 leading-relaxed text-oliva">El calendario y las rotaciones combinan datos con reglas y un catálogo agrícola referencial. No garantizan rendimiento, ingresos ni ahorro de agua. Si falta información, se indica.</p><p className="mt-3 font-semibold leading-relaxed">RotaAndes no sustituye tu experiencia ni la evaluación de un técnico agrícola.</p><Link className="enlace-nav mt-3 underline" to="/glosario">¿Una palabra nueva? Abre el glosario</Link></div>
    </section>
    <section className="mt-10 border-t border-pino/15 pt-6" aria-label="Estado de conexión"><div role="status" aria-live="polite" aria-atomic="true"><h2 className="font-semibold">{consulta.isFetching ? 'Comprobando conexión…' : consulta.isError ? 'No pudimos conectar' : 'Conexión disponible'}</h2><p className="mt-2 text-sm text-oliva">{consulta.isError ? 'Puedes leer el glosario y las fuentes. Para ingresar o guardar tu terreno necesitamos recuperar la conexión.' : 'Para guardar y consultar datos de tu terreno necesitas conexión a Internet.'}</p></div><button className="boton-secundario mt-3" disabled={consulta.isFetching} onClick={() => { void consulta.refetch(); }}>{consulta.isFetching ? 'Comprobando…' : consulta.isError ? 'Reintentar conexión' : 'Volver a comprobar'}</button></section>
  </Marco>;
}
