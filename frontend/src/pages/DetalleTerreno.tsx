import { useState } from 'react';
import type { ReactNode } from 'react';
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
import { DescargarReporte } from '../components/DescargarReporte';
import { NavegacionTerreno } from '../components/NavegacionTerreno';
import { DelimitacionTerreno } from '../components/DelimitacionTerreno';
import { obtenerTerreno, eliminarTerreno } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import { Icono } from '../components/Iconos';
import type { NombreIcono } from '../components/Iconos';

function Dato({ icono, titulo, children }: { icono: NombreIcono; titulo: string; children: ReactNode }) {
  return <div className="dato-ficha"><Icono nombre={icono} /><div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-oliva">{titulo}</dt><dd className="mt-1 break-words font-semibold">{children}</dd></div></div>;
}
function Grupo({ texto }: { texto: string }) {
  return <p aria-hidden="true" className="mt-12 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-oliva"><span className="h-px flex-1 bg-pino/15" />{texto}<span className="h-px flex-1 bg-pino/15" /></p>;
}

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
      <div className="flex flex-wrap items-end justify-between gap-5"><div className="min-w-0"><p className="etiqueta-seccion">Detalle de la parcela</p><h1 className="mt-3 break-words font-campo text-4xl sm:text-5xl">{terreno.nombre}</h1>
        <ul aria-label="Resumen de la parcela" className="mt-4 flex flex-wrap gap-2"><li className="chip chip--cultivo"><Icono nombre="altitud" className="size-4" />{terreno.altitud_m === null ? 'Altitud no disponible' : `${terreno.altitud_m.toLocaleString('es-EC')} m s. n. m.`}</li><li className="chip chip--cielo"><Icono nombre="riego" className="size-4" />{terreno.tiene_riego === null ? 'Riego sin indicar' : terreno.tiene_riego ? 'Con riego' : 'Sin riego'}</li><li className="chip chip--maiz"><Icono nombre="area" className="size-4" />{terreno.area_ha === null ? 'Área sin indicar' : `${terreno.area_ha.toLocaleString('es-EC')} ha`}</li></ul></div>{esAgricultor && <div className="flex flex-wrap gap-3"><Link className="boton-secundario" to={`/terrenos/${id}/editar`}>Editar terreno</Link><button className="enlace-nav font-semibold text-arcilla" onClick={() => { eliminar.reset(); establecerConfirmacion(true); }}>Eliminar terreno</button></div>}</div>
      {mensaje && <p role="status" className="mt-6 rounded-xl border border-pino/20 bg-white p-4">{mensaje}</p>}
      <NavegacionTerreno />
      <div className="mt-8 grid items-start gap-7 lg:grid-cols-2"><div className="tarjeta tarjeta--acento p-6 sm:p-8"><h2 className="text-xl font-semibold">Datos del terreno</h2><dl className="mt-5 grid grid-cols-1 gap-3 text-sm min-[360px]:grid-cols-2">
        <Dato icono="area" titulo="Área declarada">{terreno.area_ha === null ? 'Sin indicar' : `${terreno.area_ha.toLocaleString('es-EC')} ha`}</Dato>
        <Dato icono="riego" titulo="Riego">{terreno.tiene_riego === null ? 'Sin indicar' : terreno.tiene_riego ? 'Sí' : 'No'}</Dato>
        <Dato icono="suelo" titulo="Tipo de suelo">{terreno.tipo_suelo ? tiposSuelo[terreno.tipo_suelo] ?? terreno.tipo_suelo : 'Sin indicar'}</Dato>
        <Dato icono="altitud" titulo="Altitud estimada">{terreno.altitud_m === null ? 'No disponible' : `${terreno.altitud_m.toLocaleString('es-EC')} m s. n. m.`}</Dato>
        <Dato icono="mapa" titulo="Latitud">{terreno.latitud}</Dato><Dato icono="mapa" titulo="Longitud">{terreno.longitud}</Dato>
      </dl><p className="mt-7 text-xs leading-relaxed text-oliva">Fuente de altitud: <a href="https://open-meteo.com/en/docs/elevation-api" target="_blank" rel="noreferrer" className="underline">Open-Meteo</a> / Copernicus DEM GLO-90, resolución de 90 m. Es una estimación, no una medición exacta del terreno.{terreno.altitud_m === null && ' No hay una estimación disponible; no se ha sustituido por un dato inventado.'}</p></div><VisorCapas key={`capas:${sesion.usuario?.id}:${id}`} terrenos={[terreno]} /></div>
      <div id="delimitacion" tabIndex={-1} className="destino-terreno"><DelimitacionTerreno key={`delimitacion:${sesion.usuario?.id}:${id}`} terreno={terreno} /></div>
      <div id="informe" tabIndex={-1} className="destino-terreno"><DescargarReporte key={`reporte:${sesion.usuario?.id}:${id}`} terrenoId={id} /><p className="mt-3 text-sm leading-relaxed text-oliva">El PDF incluye todas las explicaciones y puede tener muchas páginas. Para una lectura breve, abre «¿Qué puedo sembrar?» y consulta el resumen del calendario; las explicaciones completas siguen disponibles.</p></div>
      <Grupo texto="El clima de tu zona" />
      <ClimaTerreno key={`clima:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} altitudM={terreno.altitud_m} />
      <div id="pronostico" tabIndex={-1} className="destino-terreno"><PronosticoTerreno key={`pronostico:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} /></div>
      <TendenciaTerreno key={`tendencia:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} />
      <Grupo texto="Planificar tus siembras" />
      <div id="calendario" tabIndex={-1} className="destino-terreno"><CalendarioSiembra key={`calendario:${sesion.usuario?.id}:${id}`} terrenoId={id} latitud={terreno.latitud} longitud={terreno.longitud} altitudM={terreno.altitud_m} tieneRiego={terreno.tiene_riego} areaHa={terreno.area_ha} /></div>
      <div id="rotaciones" tabIndex={-1} className="destino-terreno"><ComparadorRotaciones key={`rotaciones:${sesion.usuario?.id}:${id}`} terrenoId={id} contexto={[terreno.latitud, terreno.longitud, terreno.altitud_m, terreno.tiene_riego, terreno.area_ha]} /></div>
      <div id="escenarios" tabIndex={-1} className="destino-terreno"><SimuladorEscenarios key={`escenarios:${sesion.usuario?.id}:${id}`} terrenoId={id} contexto={[terreno.latitud, terreno.longitud, terreno.altitud_m, terreno.tiene_riego, terreno.area_ha]} /></div>
      <Grupo texto="La memoria de tu parcela" />
      <div id="historial" tabIndex={-1} className="destino-terreno"><SiembrasTerreno key={`${sesion.usuario?.id}:${id}`} terrenoId={id} /></div>
      {confirmando && <ConfirmarEliminacion titulo={`¿Eliminar ${terreno.nombre}?`} mensaje="Se eliminarán el terreno y todas sus siembras. Esta acción no se puede deshacer." estaEliminando={eliminar.isPending} error={eliminar.error?.message ?? null} alConfirmar={() => eliminar.mutate()} alCancelar={() => establecerConfirmacion(false)} />}
    </>}
  </Marco>;
}
