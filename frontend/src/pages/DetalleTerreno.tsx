import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Marco } from '../components/Marco';
import { VisorCapas } from '../components/VisorCapas';
import { EstadoConsulta } from '../components/EstadoConsulta';
import { ConfirmarEliminacion } from '../components/ConfirmarEliminacion';
import { SiembrasTerreno } from '../components/SiembrasTerreno';
import { ClimaTerreno } from '../components/ClimaTerreno';
import { PronosticoTerreno } from '../components/PronosticoTerreno';
import { CalendarioSiembra } from '../components/CalendarioSiembra';
import { ComparadorRotaciones } from '../components/ComparadorRotaciones';
import { SimuladorEscenarios } from '../components/SimuladorEscenarios';
import { TendenciaTerreno } from '../components/TendenciaTerreno';
import { obtenerTerreno, eliminarTerreno } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';

export function DetalleTerreno() {
  const { id = '' } = useParams();
  const sesion = useAgricultura();
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estado: unknown = ubicacion.state;
  const mensaje = typeof estado === 'object' && estado !== null && 'mensaje' in estado && typeof estado.mensaje === 'string' ? estado.mensaje : null;
  const [confirmando, establecerConfirmacion] = useState(false);
  const consulta = useQuery({ queryKey: [...sesion.clave, 'terreno', id], queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerTerreno(token, id, signal), signal) });
  const eliminar = useMutation({ mutationFn: () => sesion.ejecutar((token) => eliminarTerreno(token, id)), onSuccess: () => {
    if (!sesion.sigueActiva()) return;
    void cliente.invalidateQueries({ queryKey: sesion.clave });
    void navegar('/terrenos', { replace: true, state: { mensaje: 'El terreno y sus siembras se eliminaron correctamente.' } });
  } });
  const esAgricultor = sesion.usuario?.rol === 'agricultor';
  const terreno = consulta.data;
  const tiposSuelo: Record<string, string> = { franco: 'Franco', arenoso: 'Arenoso', arcilloso: 'Arcilloso', no_se: 'No sé' };
  return <Marco><Link to={esAgricultor ? '/terrenos' : '/tecnico'} className="enlace-nav -ml-3 text-sm">← {esAgricultor ? 'Mis terrenos' : 'Panel técnico'}</Link>
    <div className="mt-7"><EstadoConsulta cargando={consulta.isPending} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} /></div>
    {consulta.isSuccess && terreno && <>
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="etiqueta-seccion">Detalle de la parcela</p><h1 className="mt-3 break-words font-campo text-4xl sm:text-5xl">{terreno.nombre}</h1></div>{esAgricultor && <div className="flex flex-wrap gap-3"><Link className="boton-secundario" to={`/terrenos/${id}/editar`}>Editar terreno</Link><button className="enlace-nav font-semibold text-arcilla" onClick={() => { eliminar.reset(); establecerConfirmacion(true); }}>Eliminar terreno</button></div>}</div>
      {mensaje && <p role="status" className="mt-6 rounded-xl border border-pino/20 bg-white p-4">{mensaje}</p>}
      <div className="mt-8 grid items-start gap-7 lg:grid-cols-2"><div className="tarjeta p-6 sm:p-8"><h2 className="text-xl font-semibold">Datos del terreno</h2><dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6 text-sm">
        <div><dt className="text-oliva">Área declarada</dt><dd className="mt-1 font-semibold">{terreno.area_ha === null ? 'Sin indicar' : `${terreno.area_ha.toLocaleString('es-EC')} ha`}</dd></div>
        <div><dt className="text-oliva">Riego</dt><dd className="mt-1 font-semibold">{terreno.tiene_riego === null ? 'Sin indicar' : terreno.tiene_riego ? 'Sí' : 'No'}</dd></div>
        <div><dt className="text-oliva">Tipo de suelo</dt><dd className="mt-1 font-semibold">{terreno.tipo_suelo ? tiposSuelo[terreno.tipo_suelo] ?? terreno.tipo_suelo : 'Sin indicar'}</dd></div>
        <div><dt className="text-oliva">Altitud estimada</dt><dd className="mt-1 font-semibold">{terreno.altitud_m === null ? 'No disponible' : `${terreno.altitud_m.toLocaleString('es-EC')} m s. n. m.`}</dd></div>
        <div><dt className="text-oliva">Latitud</dt><dd className="mt-1 font-semibold">{terreno.latitud}</dd></div><div><dt className="text-oliva">Longitud</dt><dd className="mt-1 font-semibold">{terreno.longitud}</dd></div>
      </dl><p className="mt-7 text-xs leading-relaxed text-oliva">Fuente de altitud: <a href="https://open-meteo.com/en/docs/elevation-api" target="_blank" rel="noreferrer" className="underline">Open-Meteo</a> / Copernicus DEM GLO-90, resolución de 90 m. Es una estimación, no una medición exacta del terreno.{terreno.altitud_m === null && ' No hay una estimación disponible; no se ha sustituido por un dato inventado.'}</p></div><VisorCapas key={`capas:${sesion.usuario?.id}:${id}`} terrenos={[terreno]} /></div>
      <ClimaTerreno key={`clima:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} altitudM={terreno.altitud_m} />
      <PronosticoTerreno key={`pronostico:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} />
      <TendenciaTerreno key={`tendencia:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} />
      <CalendarioSiembra key={`calendario:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} altitudM={terreno.altitud_m} tieneRiego={terreno.tiene_riego} areaHa={terreno.area_ha} />
      <ComparadorRotaciones key={`rotaciones:${sesion.usuario?.id}:${id}`} terrenoId={id} contexto={[terreno.latitud, terreno.longitud, terreno.altitud_m, terreno.tiene_riego, terreno.area_ha]} />
      <SimuladorEscenarios key={`escenarios:${sesion.usuario?.id}:${id}`} terrenoId={id} contexto={[terreno.latitud, terreno.longitud, terreno.altitud_m, terreno.tiene_riego, terreno.area_ha]} />
      <SiembrasTerreno key={`${sesion.usuario?.id}:${id}`} terrenoId={id} />
      {confirmando && <ConfirmarEliminacion titulo={`¿Eliminar ${terreno.nombre}?`} mensaje="Se eliminarán el terreno y todas sus siembras. Esta acción no se puede deshacer." estaEliminando={eliminar.isPending} error={eliminar.error?.message ?? null} alConfirmar={() => eliminar.mutate()} alCancelar={() => establecerConfirmacion(false)} />}
    </>}
  </Marco>;
}
