import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Marco } from '../components/Marco';
import { MapaDiferido } from '../components/MapaDiferido';
import { EstadoConsulta } from '../components/EstadoConsulta';
import { guardarTerreno, obtenerTerreno } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { DatosTerreno, Terreno } from '../types/api';

function FormularioTerreno({ terreno }: { terreno?: Terreno }) {
  const sesion = useAgricultura();
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const [latitud, establecerLatitud] = useState(terreno ? String(terreno.latitud) : '');
  const [longitud, establecerLongitud] = useState(terreno ? String(terreno.longitud) : '');
  const [errorLocal, establecerError] = useState('');
  const punto = useMemo(() => latitud.trim() && longitud.trim() && Number.isFinite(Number(latitud)) && Number.isFinite(Number(longitud)) && Math.abs(Number(latitud)) <= 90 && Math.abs(Number(longitud)) <= 180 ? { latitud: Number(latitud), longitud: Number(longitud) } : null, [latitud, longitud]);
  const guardar = useMutation({ mutationFn: (datos: DatosTerreno) => sesion.ejecutar((token) => guardarTerreno(token, datos, terreno?.id)), onSuccess: (nuevo) => {
    if (!sesion.sigueActiva()) return;
    void cliente.invalidateQueries({ queryKey: sesion.clave });
    void navegar(`/terrenos/${nuevo.id}`, { replace: true, state: { mensaje: nuevo.altitud_m === null ? 'Terreno guardado. No se pudo obtener la altitud estimada; el campo permanece sin dato.' : 'Terreno guardado correctamente.' } });
  } });
  function manejarGuardado(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const area = String(formulario.get('area') ?? '').trim();
    const tipoSuelo = formulario.get('tipo_suelo');
    if (!punto) { establecerError('Selecciona un punto o introduce coordenadas válidas.'); return; }
    if (tipoSuelo !== 'franco' && tipoSuelo !== 'arenoso' && tipoSuelo !== 'arcilloso' && tipoSuelo !== 'no_se') { establecerError('Selecciona un tipo de suelo.'); return; }
    establecerError('');
    guardar.mutate({ nombre: String(formulario.get('nombre') ?? ''), ...punto, area_ha: area === '' ? null : Number(area), tiene_riego: formulario.get('tiene_riego') === 'on', tipo_suelo: tipoSuelo });
  }
  return <form onSubmit={manejarGuardado} aria-busy={guardar.isPending} className="mt-8">
    <fieldset disabled={guardar.isPending} className="grid min-w-0 items-start gap-7 lg:grid-cols-[1fr_1.1fr]">
      <section className="tarjeta min-w-0 space-y-5 p-6 sm:p-8"><h2 className="text-xl font-semibold">Datos de la parcela</h2>
        <label className="campo">Nombre del terreno *<input name="nombre" required minLength={2} maxLength={120} defaultValue={terreno?.nombre ?? ''} autoComplete="off" /></label>
        <label className="campo">Área declarada (hectáreas)<input name="area" type="number" inputMode="decimal" min="0.01" max="999999.99" step="0.01" defaultValue={terreno?.area_ha ?? ''} aria-describedby="ayuda-area" /></label>
        <p id="ayuda-area" className="text-xs leading-relaxed text-oliva">Opcional. Indica el área que conoces de tu terreno; el mapa no calcula superficies.</p>
        <div className="campo"><label htmlFor="tipo-suelo">Tipo de suelo</label><select id="tipo-suelo" name="tipo_suelo" defaultValue={terreno?.tipo_suelo ?? 'no_se'}><option value="no_se">No sé</option><option value="franco">Franco</option><option value="arenoso">Arenoso</option><option value="arcilloso">Arcilloso</option></select></div>
        <label className="flex min-h-12 items-center gap-3 font-semibold"><input className="casilla-riego" type="checkbox" name="tiene_riego" defaultChecked={terreno?.tiene_riego ?? false} /> Mi terreno tiene riego</label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="campo">Latitud *<input name="latitud" type="number" inputMode="decimal" step="any" min="-90" max="90" required value={latitud} onChange={(evento) => establecerLatitud(evento.target.value)} /></label><label className="campo">Longitud *<input name="longitud" type="number" inputMode="decimal" step="any" min="-180" max="180" required value={longitud} onChange={(evento) => establecerLongitud(evento.target.value)} /></label></div>
        <p className="text-xs leading-relaxed text-oliva">Usa grados decimales. La altitud estimada se consulta al guardar y al cambiar las coordenadas. Fuente: Open-Meteo / Copernicus DEM GLO-90 (resolución de 90 m). No es una medición exacta.</p>
      </section>
      <div className="order-first min-w-0 lg:order-last"><MapaDiferido terrenos={[]} punto={punto} alSeleccionar={(ubicacion) => { if (!guardar.isPending) { establecerLatitud(String(ubicacion.latitud)); establecerLongitud(String(ubicacion.longitud)); } }} /></div>
    </fieldset>
    {(errorLocal || guardar.isError) && <p role="alert" className="aviso-error mt-6">{errorLocal || guardar.error?.message}</p>}
    <div className="mt-7 flex flex-wrap gap-3"><button className="boton-primario" disabled={guardar.isPending} type="submit">{guardar.isPending ? 'Guardando y consultando altitud…' : 'Guardar terreno'}</button><Link className="boton-secundario" to={terreno ? `/terrenos/${terreno.id}` : '/terrenos'}>Cancelar</Link></div>
  </form>;
}

export function EditarTerreno() {
  const { id } = useParams();
  const sesion = useAgricultura();
  const consulta = useQuery({ queryKey: [...sesion.clave, 'terreno', id], enabled: Boolean(id && sesion.usuario), queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerTerreno(token, id ?? '', signal), signal) });
  if (sesion.usuario?.rol !== 'agricultor') return <Navigate to="/terrenos" replace />;
  return <Marco><Link to="/terrenos" className="enlace-nav -ml-3 text-sm">← Mis terrenos</Link><h1 className="mt-4 font-campo text-4xl sm:text-5xl">{id ? 'Editar terreno' : 'Ubica tu terreno'}</h1><p className="mt-4 text-oliva">Un punto en el mapa y los datos de tu parcela. Los campos con * son obligatorios.</p>
    {id ? <><div className="mt-7"><EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} /></div>{consulta.isSuccess && <FormularioTerreno key={consulta.data.id} terreno={consulta.data} />}</> : <FormularioTerreno />}
  </Marco>;
}
