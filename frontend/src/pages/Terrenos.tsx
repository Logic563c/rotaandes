import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Marco } from '../components/Marco';
import { VisorCapas } from '../components/VisorCapas';
import { ConfirmarEliminacion } from '../components/ConfirmarEliminacion';
import { EstadoConsulta } from '../components/EstadoConsulta';
import { listarTerrenos, eliminarTerreno } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { Terreno } from '../types/api';
import { Icono } from '../components/Iconos';
import { BannerFoto } from '../components/Fotografia';
import { FOTOS } from '../lib/fotografias';

export function Terrenos() {
  const sesion = useAgricultura();
  const cliente = useQueryClient();
  const ubicacion = useLocation();
  const estado: unknown = ubicacion.state;
  const mensajeInicial = typeof estado === 'object' && estado !== null && 'mensaje' in estado && typeof estado.mensaje === 'string' ? estado.mensaje : '';
  const [seleccionado, establecerSeleccionado] = useState<Terreno | null>(null);
  const [mensaje, establecerMensaje] = useState(mensajeInicial);
  const consulta = useQuery({ queryKey: [...sesion.clave, 'terrenos'], enabled: Boolean(sesion.usuario), queryFn: ({ signal }) => sesion.ejecutar((token) => listarTerrenos(token, signal), signal) });
  const eliminar = useMutation({ mutationFn: (id: string) => sesion.ejecutar((token) => eliminarTerreno(token, id)), onSuccess: () => {
    if (!sesion.sigueActiva()) return;
    establecerSeleccionado(null); establecerMensaje('El terreno y sus siembras se eliminaron correctamente.');
    void cliente.invalidateQueries({ queryKey: sesion.clave });
  } });
  const esAgricultor = sesion.usuario?.rol === 'agricultor';
  return <Marco>
    <BannerFoto foto={FOTOS.laderas}><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="etiqueta-seccion">Nuestra tierra, paso a paso</p><h1 className="mt-3 font-campo text-4xl sm:text-5xl">{esAgricultor ? 'Mis terrenos' : 'Consulta de terrenos'}</h1><p className="mt-4 text-crema/90">{esAgricultor ? 'Ubica tus parcelas y conserva su historial de siembra.' : 'Acceso técnico de solo lectura. No permite modificar terrenos ni siembras.'}</p></div>{esAgricultor && <Link className="boton-claro" to="/terrenos/nuevo">Añadir terreno <span aria-hidden="true" className="ml-3">+</span></Link>}</div></BannerFoto>
    {mensaje && <p role="status" className="mt-6 rounded-xl border border-pino/20 bg-white p-4">{mensaje}</p>}
    <div className="mt-8"><EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} /></div>
    {consulta.isSuccess && <div className="mt-7 grid items-start gap-7 lg:grid-cols-[1.1fr_1fr]">
      <VisorCapas key={sesion.usuario?.id} terrenos={consulta.data} />
      <section aria-label="Listado de terrenos" className="space-y-4">
        {consulta.data.length === 0 && <div className="tarjeta tarjeta--acento p-7"><span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-cultivo-claro text-cultivo"><Icono nombre="brote" className="size-8" /></span><h2 className="mt-4 font-campo text-2xl">{esAgricultor ? 'Tu primera parcela empieza aquí' : 'Aún no hay terrenos registrados'}</h2><p className="mt-3 leading-relaxed text-oliva">{esAgricultor ? 'Añade un punto en el mapa, su nombre y el área que declaras. Después podrás registrar tus siembras.' : 'Los terrenos aparecerán cuando los agricultores los registren.'}</p></div>}
        {consulta.data.map((terreno, indice) => <article className="tarjeta tarjeta--acento p-6" key={terreno.id}>
          <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-cultivo-claro text-cultivo"><Icono nombre="mapa" className="size-6" /></span><p className="etiqueta-seccion">Parcela {indice + 1}</p></div><h2 className="mt-2 break-words text-xl font-semibold"><Link className="underline-offset-4 hover:underline" to={`/terrenos/${terreno.id}`}>{terreno.nombre}</Link></h2>
          <p className="mt-3 flex flex-wrap gap-2 text-sm"><span className="chip chip--maiz"><Icono nombre="area" className="size-4" />{terreno.area_ha === null ? 'Área sin indicar' : `${terreno.area_ha.toLocaleString('es-EC')} ha declaradas`}</span><span className="sr-only"> · </span><span className="chip chip--cielo"><Icono nombre="riego" className="size-4" />{terreno.tiene_riego === null ? 'Riego sin indicar' : terreno.tiene_riego ? 'Con riego' : 'Sin riego'}</span>{terreno.altitud_m !== null && <span className="chip chip--cultivo"><Icono nombre="altitud" className="size-4" />{terreno.altitud_m.toLocaleString('es-EC')} m</span>}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Link className="boton-secundario" to={`/terrenos/${terreno.id}`}>Ver detalle</Link>{esAgricultor && <><Link className="enlace-nav text-sm font-semibold" to={`/terrenos/${terreno.id}/editar`}>Editar</Link><button className="enlace-nav text-sm font-semibold text-arcilla" aria-label={`Eliminar ${terreno.nombre}`} onClick={() => { eliminar.reset(); establecerSeleccionado(terreno); }}>Eliminar<span className="sr-only"> {terreno.nombre}</span></button></>}</div>
        </article>)}
      </section>
    </div>}
    {seleccionado && <ConfirmarEliminacion titulo={`¿Eliminar ${seleccionado.nombre}?`} mensaje="También se eliminarán todas sus siembras. Esta acción no se puede deshacer." estaEliminando={eliminar.isPending} error={eliminar.error?.message ?? null} alConfirmar={() => eliminar.mutate(seleccionado.id)} alCancelar={() => establecerSeleccionado(null)} />}
  </Marco>;
}
