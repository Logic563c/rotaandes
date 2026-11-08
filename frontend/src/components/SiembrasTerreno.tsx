import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listarCultivos, listarSiembras, guardarSiembra, eliminarSiembra } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { DatosSiembra, Siembra } from '../types/api';
import { EstadoConsulta } from './EstadoConsulta';
import { ConfirmarEliminacion } from './ConfirmarEliminacion';

export function SiembrasTerreno({ terrenoId }: { terrenoId: string }) {
  const sesion = useAgricultura();
  const cliente = useQueryClient();
  const [editando, establecerEdicion] = useState<Siembra | null>(null);
  const [eliminando, establecerEliminacion] = useState<Siembra | null>(null);
  const [mensaje, establecerMensaje] = useState('');
  const [errorLocal, establecerError] = useState('');
  const formularioActual = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (editando) {
      formularioActual.current?.scrollIntoView?.({ block: 'center' });
      formularioActual.current?.querySelector('select')?.focus({ preventScroll: true });
    }
  }, [editando]);
  const catalogo = useQuery({ queryKey: ['cultivos'], queryFn: ({ signal }) => listarCultivos(signal), staleTime: 60000 });
  const historial = useQuery({ queryKey: [...sesion.clave, 'siembras', terrenoId], queryFn: ({ signal }) => sesion.ejecutar((token) => listarSiembras(token, terrenoId, signal), signal) });
  function refrescar(mensajeNuevo: string) {
    if (!sesion.sigueActiva()) return;
    establecerEdicion(null); establecerEliminacion(null); establecerMensaje(mensajeNuevo);
    void cliente.invalidateQueries({ queryKey: [...sesion.clave, 'siembras', terrenoId] });
    void cliente.invalidateQueries({ queryKey: [...sesion.clave, 'rotaciones', terrenoId] });
  }
  const guardar = useMutation({ mutationFn: ({ datos, id }: { datos: DatosSiembra; id?: string }) => sesion.ejecutar((token) => guardarSiembra(token, terrenoId, datos, id)), onSuccess: (_respuesta, variables) => {
    if (!sesion.sigueActiva()) return;
    if (!variables.id) formularioActual.current?.reset();
    refrescar('La siembra se guardó correctamente.');
  } });
  const eliminar = useMutation({ mutationFn: (id: string) => sesion.ejecutar((token) => eliminarSiembra(token, id)), onSuccess: () => refrescar('La siembra se eliminó correctamente.') });
  const esAgricultor = sesion.usuario?.rol === 'agricultor';
  function manejarGuardado(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const siembra = String(formulario.get('fecha_siembra') ?? '');
    const cosecha = String(formulario.get('fecha_cosecha') ?? '') || null;
    if (cosecha && cosecha < siembra) { establecerError('La cosecha no puede ser anterior a la siembra.'); return; }
    establecerError(''); establecerMensaje('');
    guardar.mutate({ datos: { cultivo_id: String(formulario.get('cultivo_id') ?? ''), fecha_siembra: siembra, fecha_cosecha: cosecha, notas: String(formulario.get('notas') ?? '').trim() || null }, ...(editando && { id: editando.id }) });
  }
  const nombreCultivo = (id: string) => catalogo.data?.find((cultivo) => cultivo.id === id)?.nombre ?? id;
  return <section aria-labelledby="titulo-siembras" className="mt-12 border-t border-pino/15 pt-9">
    <p className="etiqueta-seccion">La memoria de tu tierra</p><h2 id="titulo-siembras" className="mt-3 font-campo text-3xl sm:text-4xl">Mis siembras</h2>
    <p className="mt-4 text-sm leading-relaxed text-oliva">Catálogo referencial de Cotopaxi, pendiente de validación agronómica local. Los meses de siembra del catálogo no constituyen una recomendación para tu terreno.</p>
    {mensaje && <p role="status" className="mt-5 rounded-xl border border-pino/20 bg-white p-4">{mensaje}</p>}
    <div className="mt-7 grid items-start gap-7 lg:grid-cols-2">
      {esAgricultor && <div className="tarjeta p-6 sm:p-8"><h3 className="text-xl font-semibold">{editando ? 'Editar siembra' : 'Registrar siembra'}</h3>
        <div className="mt-5"><EstadoConsulta cargando={catalogo.isPending} error={catalogo.error} alReintentar={() => { void catalogo.refetch(); }} /></div>
        {catalogo.isSuccess && (catalogo.data.length === 0 ? <p role="status" className="text-sm text-oliva">El catálogo todavía no tiene cultivos. No se puede registrar una siembra hasta que esté preparado.</p> : <form ref={formularioActual} key={editando?.id ?? 'nueva'} onSubmit={manejarGuardado} className="mt-5" aria-busy={guardar.isPending}>
          <fieldset className="min-w-0 space-y-5" disabled={guardar.isPending}>
            <div className="campo"><label htmlFor="cultivo-siembra">Cultivo *</label><select id="cultivo-siembra" name="cultivo_id" required defaultValue={editando?.cultivo_id ?? ''}><option value="" disabled>Selecciona un cultivo</option>{catalogo.data.map((cultivo) => <option key={cultivo.id} value={cultivo.id}>{cultivo.nombre}</option>)}</select></div>
            <label className="campo">Fecha de siembra *<input name="fecha_siembra" type="date" min="0001-01-01" max="9999-12-31" required defaultValue={editando?.fecha_siembra ?? ''} /></label>
            <label className="campo">Fecha de cosecha (opcional)<input name="fecha_cosecha" type="date" min="0001-01-01" max="9999-12-31" defaultValue={editando?.fecha_cosecha ?? ''} /></label>
            <label className="campo">Notas (opcional)<textarea name="notas" maxLength={2000} rows={3} defaultValue={editando?.notas ?? ''} /></label>
            {(errorLocal || guardar.isError) && <p role="alert" className="aviso-error">{errorLocal || guardar.error?.message}</p>}
            <div className="flex flex-wrap gap-3"><button className="boton-primario" type="submit">{guardar.isPending ? 'Guardando siembra…' : 'Guardar siembra'}</button>{editando && <button className="boton-secundario" type="button" onClick={() => { establecerEdicion(null); guardar.reset(); establecerError(''); }}>Cancelar edición</button>}</div>
          </fieldset>
        </form>)}
      </div>}
      <div className={esAgricultor ? '' : 'lg:col-span-2'}><h3 className="mb-5 text-xl font-semibold">Historial de siembras</h3><EstadoConsulta cargando={historial.isPending} error={historial.error} alReintentar={() => { void historial.refetch(); }} />
        {historial.isSuccess && <div className="space-y-4">{historial.data.length === 0 && <p role="status" className="tarjeta p-6 text-oliva">Este terreno aún no tiene siembras registradas.</p>}
          {historial.data.map((siembra) => <article className="tarjeta p-6" key={siembra.id}><h4 className="text-lg font-semibold">{nombreCultivo(siembra.cultivo_id)}</h4><dl className="mt-3 grid gap-2 text-sm"><div><dt className="inline text-oliva">Siembra: </dt><dd className="inline"><time dateTime={siembra.fecha_siembra}>{siembra.fecha_siembra.split('-').reverse().join('/')}</time></dd></div><div><dt className="inline text-oliva">Cosecha: </dt><dd className="inline">{siembra.fecha_cosecha ? siembra.fecha_cosecha.split('-').reverse().join('/') : 'Sin registrar'}</dd></div></dl>
            {siembra.notas && <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-relaxed text-oliva">{siembra.notas}</p>}
            {esAgricultor && <div className="mt-3 flex flex-wrap gap-2"><button className="enlace-nav text-sm font-semibold" disabled={guardar.isPending} onClick={() => { establecerEdicion(siembra); guardar.reset(); establecerError(''); establecerMensaje(''); }} aria-label={`Editar siembra de ${nombreCultivo(siembra.cultivo_id)}`}>Editar</button><button className="enlace-nav text-sm font-semibold text-arcilla" disabled={guardar.isPending} onClick={() => { eliminar.reset(); establecerEliminacion(siembra); }} aria-label={`Eliminar siembra de ${nombreCultivo(siembra.cultivo_id)}`}>Eliminar</button></div>}
          </article>)}
        </div>}
      </div>
    </div>
    {eliminando && <ConfirmarEliminacion titulo="¿Eliminar esta siembra?" mensaje="Se eliminará este registro del historial. Esta acción no se puede deshacer." estaEliminando={eliminar.isPending} error={eliminar.error?.message ?? null} alConfirmar={() => eliminar.mutate(eliminando.id)} alCancelar={() => establecerEliminacion(null)} />}
  </section>;
}
