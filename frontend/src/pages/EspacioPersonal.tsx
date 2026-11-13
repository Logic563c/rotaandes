import { Link } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { Marco } from '../components/Marco';
import { Icono } from '../components/Iconos';
import { BannerFoto } from '../components/Fotografia';
import { FOTOS } from '../lib/fotografias';
import type { NombreIcono } from '../components/Iconos';
import type { CSSProperties } from 'react';

// Las prioridades se leen del perfil guardado; sin dato se indica explícitamente.
function Prioridad({ nombre, icono, valor, color }: { nombre: string; icono: NombreIcono; valor: number | null; color: string }) {
  return <li className="flex items-center gap-3">
    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-crema" style={{ color }}><Icono nombre={icono} className="size-6" /></span>
    <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm font-semibold"><span>{nombre}</span><span>{valor === null ? 'Sin indicar' : `${valor} de 5`}</span></div>
      <div aria-hidden="true" className="mt-1.5 flex gap-1">{[1, 2, 3, 4, 5].map((nivel) => <span key={nivel} className="h-2 flex-1 rounded-full" style={{ background: valor !== null && nivel <= valor ? color : '#ece5d3' }} />)}</div></div>
  </li>;
}

export function EspacioPersonal() {
  const { usuario } = useSesion();
  if (!usuario) return null;
  const esTecnico = usuario.rol === 'tecnico';
  return <Marco>
    <BannerFoto foto={FOTOS.portada} className="sm:p-10">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.14em] text-maiz-claro">Mi espacio · {esTecnico ? 'Técnico agrícola' : 'Agricultor'}</p>
        <h1 className="mt-4 break-words font-campo text-4xl sm:text-5xl">Bienvenido, {usuario.nombre}.</h1>
        <p className="mt-5 text-lg leading-relaxed text-crema/90">Tu cuenta está lista. Abre tus terrenos para consultar el clima, el calendario y las opciones de siembra. Puedes revisar tus prioridades cuando lo necesites.</p>
      </div>
    </BannerFoto>
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="tarjeta tarjeta--acento p-6 sm:p-8">
        <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-cultivo-claro text-cultivo"><Icono nombre={esTecnico ? 'tecnico' : 'mapa'} className="size-7" /></span><p className="etiqueta-seccion">Acción principal</p></div>
        <h2 className="mt-4 font-campo text-3xl">{esTecnico ? 'Consultar sin modificar' : 'Empieza por tu terreno'}</h2>
        <p className="mt-3 leading-relaxed text-oliva">{esTecnico ? 'Revisa el mapa, los filtros y las alertas disponibles. Los datos de los agricultores son de solo lectura.' : 'Registra una parcela o abre una existente. Dentro encontrarás preguntas sencillas para consultar clima, siembras y alternativas.'}</p>
        <Link className="boton-primario mt-6 px-6 text-base" to={esTecnico ? '/tecnico' : '/terrenos'}>{esTecnico ? 'Abrir panel técnico' : 'Abrir mis terrenos'}</Link>
        {!esTecnico && <ul className="mt-6 grid gap-2 text-sm text-oliva sm:grid-cols-2">{([['nube', 'Clima e historial de lluvias'], ['calendario', 'Qué sembrar cada mes'], ['rotacion', 'Tres rotaciones comparadas'], ['documento', 'Informe PDF para compartir']] as const).map(([icono, texto]) => <li key={texto} className="flex items-center gap-2"><Icono nombre={icono} className="size-5 shrink-0 text-cultivo" />{texto}</li>)}</ul>}
      </section>
      <section className="tarjeta tarjeta--acento p-6 sm:p-8" style={{ '--acento': '#e6b33c' } as CSSProperties}>
        <p className="etiqueta-seccion">Un primer paso importante</p><h2 className="mt-3 font-campo text-3xl">Lo que más valoras</h2>
        <p className="mt-3 leading-relaxed text-oliva">Agua, suelo e ingresos. Puedes ajustar la importancia de cada prioridad y actualizar tus datos de contacto.</p>
        <ul aria-label="Mis prioridades guardadas" className="mt-5 space-y-4">
          <Prioridad nombre="Agua" icono="gota" valor={usuario.prioridad_agua} color="#1f6391" />
          <Prioridad nombre="Suelo" icono="hoja" valor={usuario.prioridad_suelo} color="#2f7d43" />
          <Prioridad nombre="Ingresos" icono="moneda" valor={usuario.prioridad_ingresos} color="#a3492a" />
        </ul>
        <Link to="/perfil" className="boton-secundario mt-6">Revisar mi perfil <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
    <nav aria-label="Accesos de ayuda" className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link className="acceso-rapido" to="/glosario"><span className="acceso-rapido__icono"><Icono nombre="libro" /></span>Consultar palabras del campo</Link>
      <Link className="acceso-rapido" style={{ '--acento': '#1f6391', '--acento-claro': '#e2eff8' } as CSSProperties} to="/fuentes"><span className="acceso-rapido__icono"><Icono nombre="fuente" /></span>Fuentes y límites de los datos</Link>
    </nav>
  </Marco>;
}
