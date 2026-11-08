import { useQuery } from '@tanstack/react-query';
import { obtenerEstadoServicio } from '../lib/api';
import { Link } from 'react-router-dom';

export function Inicio() {
  const consultaSalud = useQuery({
    queryKey: ['estadoServicio'],
    queryFn: ({ signal }) => obtenerEstadoServicio(signal),
  });

  const tituloEstado = consultaSalud.isFetching
    ? 'Comprobando conexión…'
    : consultaSalud.isError ? 'No pudimos conectar' : 'Conexión disponible';

  return (
    <div className="flex min-h-screen flex-col bg-crema text-pino">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:p-4">Saltar al contenido</a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-7 sm:px-10">
        <div className="flex items-center gap-3" aria-label="RotaAndes">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-pino text-crema" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 22 13 5l4 8 3-4 5 13H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="m9 13 4 2 3-3M5 25h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight">RotaAndes</span>
        </div>
        <Link to="/login" className="enlace-nav text-sm font-semibold">Ingresar</Link>
      </header>

      <main id="contenido" className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <div>
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold tracking-[0.16em] text-oliva uppercase">
            <span className="h-px w-8 bg-arcilla" aria-hidden="true" /> Desde los Andes, para nuestra tierra
          </p>
          <h1 className="font-campo text-5xl leading-[1.08] tracking-tight sm:text-6xl">
            Nuestra tierra.<br />Un futuro <span className="text-arcilla">más resiliente.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-oliva">
            Un espacio para acompañar a los agricultores de Cotopaxi en el cuidado de su tierra y sus cultivos.
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-oliva">
            Registra tus terrenos y siembras. Consulta el clima histórico de NASA POWER, el pronóstico de Open-Meteo y un calendario de siembra orientativo con datos referenciales.
          </p>
          <Link to="/registro" className="boton-primario mt-6 inline-flex">Registrarme <span aria-hidden="true" className="ml-3">↗</span></Link>

          <section aria-labelledby="titulo-conexion" className="mt-9 rounded-2xl border border-pino/15 bg-white/65 p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold tracking-widest text-oliva uppercase">Estado de RotaAndes</p>
            <div role="status" aria-live="polite" aria-atomic="true">
              <h2 id="titulo-conexion" className="flex items-center gap-3 text-lg font-semibold">
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${consultaSalud.isFetching ? 'bg-oliva' : consultaSalud.isError ? 'bg-arcilla' : 'bg-pino'}`} />
                {tituloEstado}
              </h2>
              {consultaSalud.isError && <p className="mt-3 text-sm leading-relaxed text-oliva">{consultaSalud.error.message}</p>}
              {consultaSalud.isSuccess && !consultaSalud.isFetching && (
                <p className="mt-2 text-sm text-oliva">El servicio está respondiendo correctamente.</p>
              )}
            </div>
            <button type="button" disabled={consultaSalud.isFetching} onClick={() => { void consultaSalud.refetch(); }}
              className="mt-5 min-h-12 w-full rounded-xl bg-pino px-5 py-3 text-sm font-semibold text-white transition hover:bg-pino/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pino disabled:cursor-wait disabled:opacity-60 sm:w-auto">
              {consultaSalud.isFetching ? 'Comprobando…' : consultaSalud.isError ? 'Reintentar conexión' : 'Volver a comprobar'}
            </button>
          </section>
        </div>

        <div className="paisaje relative mx-auto w-full max-w-lg overflow-hidden rounded-t-[45%] rounded-b-3xl border border-pino/10 bg-arena" aria-hidden="true">
          <svg viewBox="0 0 480 540" className="block h-auto w-full" fill="none">
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
          </svg>
          <div className="absolute inset-x-0 bottom-0 bg-pino/95 px-7 py-5 text-crema">
            <p className="font-campo text-2xl">Raíces andinas. Nuevas posibilidades.</p>
            <p className="mt-1 text-xs tracking-widest text-crema/75 uppercase">Latacunga · Cotopaxi</p>
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-pino/15 px-6 py-6 text-xs leading-relaxed text-oliva sm:px-10 md:flex-row md:items-start md:justify-between">
        <p>RotaAndes · Cuidamos lo que nos da la tierra.</p>
        <p className="max-w-md">Herramienta de apoyo. No reemplaza la experiencia del agricultor ni el criterio de un técnico agrícola.</p>
      </footer>
    </div>
  );
}
