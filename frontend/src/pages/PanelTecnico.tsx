import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Marco } from '../components/Marco';
import { MapaDiferido } from '../components/MapaDiferido';
import { EstadoConsulta } from '../components/EstadoConsulta';
import { listarCultivos, obtenerPanelTecnico } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import type { HeladaTecnico } from '../types/tecnico';
import type { CSSProperties } from 'react';
import { Icono } from '../components/Iconos';
import { BannerFoto } from '../components/Fotografia';
import { FOTOS } from '../lib/fotografias';

const fecha = (valor: string) => new Date(`${valor}T12:00:00-05:00`).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });
function heladaVisible(helada: HeladaTecnico, ahora: number): HeladaTecnico {
  return helada.vigente_hasta && (ahora >= Date.parse(helada.vigente_hasta) || (helada.actualizado_en && ahora < Date.parse(helada.actualizado_en)))
    ? { ...helada, estado: 'desconocido', alertas: [], dias_evaluados: 0, motivo: 'El pronóstico guardado ha vencido o no es vigente. Abre el detalle para consultarlo de nuevo.' } : helada;
}
export function PanelTecnico() {
  const sesion = useAgricultura(); const [parroquia, establecerParroquia] = useState(''); const [cultivo, establecerCultivo] = useState(''); const [pagina, establecerPagina] = useState(1); const [ahora, establecerAhora] = useState(Date.now);
  const autorizado = sesion.usuario?.rol === 'tecnico';
  const consulta = useQuery({ queryKey: [...sesion.clave, 'panel-tecnico', parroquia, cultivo, pagina], enabled: autorizado, staleTime: 30000, refetchInterval: 60000, retry: false,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerPanelTecnico(token, { parroquia, cultivo, pagina }, signal), signal) });
  const catalogo = useQuery({ queryKey: ['cultivos'], queryFn: ({ signal }) => listarCultivos(signal), enabled: autorizado });
  const datos = consulta.isSuccess && sesion.sigueActiva() ? consulta.data : undefined;
  useEffect(() => { const actualizar = () => establecerAhora(Date.now()); const intervalo = window.setInterval(actualizar, 10000); window.addEventListener('focus', actualizar);
    return () => { window.clearInterval(intervalo); window.removeEventListener('focus', actualizar); }; }, []);
  useEffect(() => {
    const vencimientos = datos?.terrenos.flatMap((t) => t.helada.vigente_hasta && Date.parse(t.helada.vigente_hasta) > ahora ? [Date.parse(t.helada.vigente_hasta)] : []) ?? [];
    if (!vencimientos.length) return;
    const temporizador = window.setTimeout(() => establecerAhora(Date.now()), Math.max(0, Math.min(...vencimientos) - Date.now())); return () => window.clearTimeout(temporizador);
  }, [datos, ahora]);
  if (!autorizado) return <Marco><h1 className="font-campo text-3xl">Acceso restringido</h1><p role="alert" className="mt-4">Este panel está disponible exclusivamente para técnicos agrícolas.</p><Link className="boton-secundario mt-5 inline-flex" to="/inicio">Volver a mi espacio</Link></Marco>;
  const terrenos = datos?.terrenos.map((t) => ({ ...t, helada: heladaVisible(t.helada, Math.max(ahora, consulta.dataUpdatedAt)) })) ?? [];
  const actualizar = () => { establecerAhora(Date.now()); void consulta.refetch(); };
  return <Marco><BannerFoto foto={FOTOS.parcelas}><div className="flex items-center gap-4"><span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-cielo-claro text-cielo"><Icono nombre="tecnico" className="size-8" /></span><div><p className="etiqueta-seccion">Acompañamiento agrícola · Solo lectura</p><h1 className="mt-2 font-campo text-4xl sm:text-5xl">Panel del técnico agrícola</h1></div></div>
    <p className="mt-5 max-w-3xl leading-relaxed text-crema/90">Consulta terrenos registrados y su historial, sin cambiar información de los agricultores. La parroquia corresponde al perfil del propietario y puede no ser la ubicación del lote.</p></BannerFoto>
    <form aria-label="Filtros de terrenos" className="tarjeta tarjeta--acento mt-7 grid items-end gap-4 p-5 sm:grid-cols-2" onSubmit={(evento) => { evento.preventDefault(); actualizar(); }}>
      <div className="min-w-0"><label htmlFor="parroquia-tecnico" className="block text-sm font-semibold">Parroquia del perfil</label><select id="parroquia-tecnico" className="mt-2 w-full" value={parroquia} onChange={(e) => { establecerParroquia(e.target.value); establecerPagina(1); }}><option value="">Todas las parroquias</option>{(datos?.parroquias ?? (parroquia ? [parroquia] : [])).map((p) => <option key={p}>{p}</option>)}</select></div>
      <div className="min-w-0"><label htmlFor="cultivo-tecnico" className="block text-sm font-semibold">Cultivo en el historial</label><select id="cultivo-tecnico" className="mt-2 w-full" value={cultivo} disabled={catalogo.isPending || catalogo.isError} onChange={(e) => { establecerCultivo(e.target.value); establecerPagina(1); }}><option value="">Todos los cultivos</option>{catalogo.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
      <button type="button" className="boton-secundario" onClick={() => { establecerParroquia(''); establecerCultivo(''); establecerPagina(1); }}>Limpiar filtros</button><button className="boton-primario" disabled={consulta.isFetching} type="submit">Revisar datos guardados</button>
    </form>
    {catalogo.isError && <div className="mt-3 text-sm"><p role="alert">No se pudo cargar el catálogo para filtrar.</p><button className="enlace-nav underline" onClick={() => { void catalogo.refetch(); }}>Reintentar catálogo</button></div>}
    <div className="mt-5"><EstadoConsulta cargando={consulta.isPending || consulta.isFetching} error={consulta.error} alReintentar={actualizar} /></div>
    {datos && !consulta.isFetching && <>
      <div aria-label="Resumen de consulta" className="mt-6 grid gap-4 sm:grid-cols-3">{[{ valor: datos.paginacion.total, etiqueta: 'Terrenos que coinciden' }, { valor: terrenos.filter((t) => t.helada.estado === 'posible_helada').length, etiqueta: 'Con posible helada en esta página' }, { valor: terrenos.filter((t) => t.helada.estado === 'desconocido').length, etiqueta: 'Estado desconocido en esta página' }].map((r) => <p key={r.etiqueta} className="tarjeta p-5"><strong className="block font-campo text-3xl">{r.valor}</strong><span className="mt-2 block text-sm">{r.etiqueta}</span></p>)}</div>
      <div className="panel-fuente mt-6 text-sm leading-relaxed"><p><strong>Leyenda:</strong> ❄ Posible helada · ✓ Sin alertas previstas · ? Desconocido. Ninguno confirma lo que ocurrirá en el terreno.</p><p className="mt-2">Alertas calculadas por RotaAndes con pronósticos de <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Se usa la caché vigente (hasta 30 minutos); abrir el pronóstico en el detalle permite consultar el proveedor. El panel no lanza consultas externas masivas.</p><p className="mt-2">{datos.metodologia}</p></div>
      {terrenos.length > 0 ? <><div className="mt-6"><MapaDiferido terrenos={datos.terrenos} /></div><section aria-labelledby="lista-tecnica" className="mt-7"><h2 id="lista-tecnica" className="font-campo text-3xl">Terrenos y alertas</h2>
        <ol className="mt-5 grid gap-5 lg:grid-cols-2">{terrenos.map((t, i) => <li key={t.id} className="tarjeta tarjeta--acento min-w-0 p-5" style={{ '--acento': t.helada.estado === 'posible_helada' ? '#a3492a' : t.helada.estado === 'sin_alertas' ? '#2f7d43' : '#8a8a80' } as CSSProperties}><h3 className="break-words font-campo text-2xl">{i + 1}. {t.nombre}</h3><p className="mt-2 text-sm">Parroquia del perfil: {t.parroquia_perfil ?? 'Sin indicar'}</p><p className="mt-2 text-xs text-oliva">Ubicación: {t.latitud}, {t.longitud} · {t.area_ha === null ? 'Área sin indicar' : `${t.area_ha} ha`}</p>
          <p className="mt-4 text-sm font-semibold">Última siembra: {t.ultima_siembra ? `${t.ultima_siembra.cultivo_nombre} · ${fecha(t.ultima_siembra.fecha_siembra)}` : 'Sin siembras registradas'}</p>
          <p className="mt-4 font-semibold">{t.helada.estado === 'posible_helada' ? '❄ Posible helada' : t.helada.estado === 'sin_alertas' ? '✓ Sin alertas previstas' : '? Estado desconocido'}</p><p className="mt-2 text-sm leading-relaxed">{t.helada.motivo}</p>
          {t.helada.vigente_hasta && t.helada.actualizado_en && <p className="mt-3 text-xs text-oliva">Fuente: {t.helada.fuente}. Consulta: {new Date(t.helada.actualizado_en).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}. Mínima ≤{t.helada.umbral_helada_c} °C; {t.helada.dias_evaluados}/7 días evaluados.</p>}
          <ul className="mt-3 space-y-2 text-sm">{t.helada.alertas.map((a) => <li key={a.fecha} className="rounded-xl border border-arcilla/30 bg-arcilla-claro p-3"><time dateTime={a.fecha}>{fecha(a.fecha)}</time> · Mínima prevista {a.t_min.toLocaleString('es-EC')} °C<p className="mt-1">{a.mensaje}</p></li>)}</ul>
          <Link className="boton-secundario mt-5 inline-flex" to={`/terrenos/${t.id}`}>Consultar {t.nombre}</Link>
        </li>)}</ol></section></> : <p role="status" className="tarjeta mt-6 p-6">No hay terrenos para estos filtros o esta página. Puedes limpiar los filtros o volver a la página anterior.</p>}
      <nav aria-label="Páginas de terrenos" className="mt-6 flex flex-wrap items-center gap-4"><button type="button" className="boton-secundario" disabled={pagina <= 1} onClick={() => establecerPagina(pagina - 1)}>Página anterior</button><p className="text-sm">Página {pagina} de {Math.max(1, datos.paginacion.paginas)} · Hasta 50 terrenos por página</p><button type="button" className="boton-secundario" disabled={pagina >= datos.paginacion.paginas} onClick={() => establecerPagina(pagina + 1)}>Página siguiente</button></nav>
      <p className="mt-6 text-sm leading-relaxed text-oliva">{datos.aviso}</p>
    </>}
  </Marco>;
}
