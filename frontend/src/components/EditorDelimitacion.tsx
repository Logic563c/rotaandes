// Editor de la zona de cultivo sobre Leaflet, sin bibliotecas de dibujo adicionales.
// Funciona con clic, toque o teclado (mover el mapa con las flechas y añadir el punto del centro).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import type { LatLngTuple, Map as MapaLeaflet } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PoligonoGeoJson } from '../types/api';
import { aPoligono, areaVerticesM2, compararConDeclarada, desdePoligono, formatearSuperficie, LIMITES_DELIMITACION, problemaDelimitacion } from '../lib/geometria';
import type { Vertice } from '../lib/geometria';

export type ModoDelimitacion = 'ver' | 'dibujar' | 'editar';
export interface EditorDelimitacionProps {
  terreno: { latitud: number; longitud: number; nombre: string; area_ha: number | null; poligono: PoligonoGeoJson | null };
  modoInicial: ModoDelimitacion; puedeEditar: boolean; estaGuardando: boolean; error: string | null;
  alGuardar: (poligono: PoligonoGeoJson) => void; alSolicitarEliminacion: () => void; alCambiarModo?: (modo: ModoDelimitacion) => void;
}

const MUNDO: LatLngTuple[] = [[-85, -179.9], [-85, 179.9], [85, 179.9], [85, -179.9]];
const icono = (texto: string, clase: string) => divIcon({ className: `vertice-delimitacion ${clase}`, html: `<span>${texto}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
const aTupla = (punto: Vertice): LatLngTuple => [punto.latitud, punto.longitud];
const redondear6 = (valor: number) => Number(valor.toFixed(6));

function EventosMapa({ modo, alTocar, alListo }: { modo: ModoDelimitacion; alTocar: (punto: Vertice) => void; alListo: (mapa: MapaLeaflet) => void }) {
  const mapa = useMap();
  useEffect(() => { alListo(mapa); }, [mapa, alListo]);
  useMapEvents({ click: (evento) => { if (modo !== 'dibujar') return; const punto = evento.latlng.wrap(); alTocar({ latitud: redondear6(punto.lat), longitud: redondear6(punto.lng) }); } });
  return null;
}
function Encuadre({ vertices, terreno }: { vertices: Vertice[]; terreno: Vertice }) {
  const mapa = useMap(); const primeraVez = useRef(true);
  useEffect(() => {
    if (!primeraVez.current) return; primeraVez.current = false;
    if (vertices.length >= 3) mapa.fitBounds(latLngBounds(vertices.map(aTupla)), { padding: [30, 30], maxZoom: 18, animate: false });
    else mapa.setView([terreno.latitud, terreno.longitud], 17, { animate: false });
  }, [mapa, vertices, terreno]);
  return null;
}

/** Campo de coordenada: conserva lo que se escribe (también vacío o con coma) y solo aplica valores válidos. */
function CampoCoordenada({ etiqueta, valor, limite, alCambiar }: { etiqueta: string; valor: number; limite: number; alCambiar: (valor: number) => void }) {
  const [texto, establecerTexto] = useState(String(valor));
  const [editando, establecerEditando] = useState(false);
  const textoVisible = editando ? texto : String(valor);
  const numero = Number(textoVisible.trim().replace(',', '.'));
  const valido = textoVisible.trim() !== '' && Number.isFinite(numero) && Math.abs(numero) <= limite;
  return <label className="campo">{etiqueta}<input type="text" inputMode="decimal" autoComplete="off" value={textoVisible} aria-invalid={!valido}
    onFocus={() => { establecerTexto(String(valor)); establecerEditando(true); }} onBlur={() => establecerEditando(false)}
    onChange={(evento) => { const nuevo = evento.currentTarget.value; establecerTexto(nuevo); establecerEditando(true); const convertido = Number(nuevo.trim().replace(',', '.')); if (nuevo.trim() !== '' && Number.isFinite(convertido) && Math.abs(convertido) <= limite) alCambiar(convertido); }} /></label>;
}

export function EditorDelimitacion({ terreno, modoInicial, puedeEditar, estaGuardando, error, alGuardar, alSolicitarEliminacion, alCambiarModo }: EditorDelimitacionProps) {
  const guardados = useMemo(() => desdePoligono(terreno.poligono), [terreno.poligono]);
  const [modo, establecerModoInterno] = useState<ModoDelimitacion>(modoInicial);
  const [vertices, establecerVertices] = useState<Vertice[]>(modoInicial === 'dibujar' ? [] : guardados);
  const [seleccionado, establecerSeleccionado] = useState<number | null>(null);
  const [aviso, establecerAviso] = useState('');
  const [mapa, establecerMapa] = useState<MapaLeaflet | null>(null);
  const [errorMapa, establecerErrorMapa] = useState(false);
  const idAyuda = useId();
  const punto = { latitud: terreno.latitud, longitud: terreno.longitud };
  function establecerModo(nuevo: ModoDelimitacion) { establecerModoInterno(nuevo); establecerSeleccionado(null); establecerAviso(''); alCambiarModo?.(nuevo); }

  const cerrada = modo !== 'dibujar' && vertices.length >= 3;
  const area = vertices.length >= 3 ? areaVerticesM2(vertices) : 0;
  const problema = modo === 'ver' ? null : problemaDelimitacion(vertices, punto);
  const superficie = formatearSuperficie(area);
  const comparacion = vertices.length >= 3 ? compararConDeclarada(area, terreno.area_ha) : null;
  const cambiado = JSON.stringify(vertices) !== JSON.stringify(guardados);

  function agregar(nuevo: Vertice) {
    if (vertices.length >= LIMITES_DELIMITACION.maximoVertices) { establecerAviso(`La zona admite hasta ${LIMITES_DELIMITACION.maximoVertices} puntos.`); return; }
    establecerVertices([...vertices, nuevo]); establecerAviso(`Punto ${vertices.length + 1} añadido.`);
  }
  function agregarCentro() {
    if (!mapa) return; const centro = mapa.getCenter().wrap(); const nuevo = { latitud: redondear6(centro.lat), longitud: redondear6(centro.lng) };
    if (modo === 'dibujar') agregar(nuevo);
    else { establecerVertices([...vertices, nuevo]); establecerAviso(`Punto ${vertices.length + 1} añadido al final del contorno.`); }
  }
  function cerrarZona() {
    if (vertices.length < LIMITES_DELIMITACION.minimoVertices) { establecerAviso('Marca al menos 3 puntos antes de cerrar la zona.'); return; }
    establecerModo('editar'); establecerAviso('Zona cerrada. Revisa el área, mueve los puntos si hace falta y guarda.');
  }
  function mover(indice: number, nuevo: Vertice) { establecerVertices(vertices.map((valor, i) => (i === indice ? nuevo : valor))); }
  function eliminarPunto(indice: number) {
    if (modo === 'editar' && vertices.length <= LIMITES_DELIMITACION.minimoVertices) { establecerAviso('Una zona necesita al menos 3 puntos. Para empezar de nuevo usa «Volver a dibujar».'); return; }
    establecerVertices(vertices.filter((_valor, i) => i !== indice)); establecerSeleccionado(null); establecerAviso(`Punto ${indice + 1} eliminado.`);
  }
  function insertarIntermedio(indice: number) {
    const a = vertices[indice]; const b = vertices[(indice + 1) % vertices.length];
    if (!a || !b || vertices.length >= LIMITES_DELIMITACION.maximoVertices) return;
    const nuevo = { latitud: redondear6((a.latitud + b.latitud) / 2), longitud: redondear6((a.longitud + b.longitud) / 2) };
    establecerVertices([...vertices.slice(0, indice + 1), nuevo, ...vertices.slice(indice + 1)]); establecerSeleccionado(indice + 1); establecerAviso(`Punto añadido entre ${indice + 1} y ${((indice + 1) % vertices.length) + 1}. Arrástralo a su lugar.`);
  }
  function cancelar() { establecerVertices(guardados); establecerModo('ver'); }

  const intermedios = modo === 'editar' && vertices.length >= 3 && vertices.length < LIMITES_DELIMITACION.maximoVertices ? vertices.map((a, indice) => {
    const b = vertices[(indice + 1) % vertices.length] as Vertice; return { indice, posicion: [(a.latitud + b.latitud) / 2, (a.longitud + b.longitud) / 2] as LatLngTuple };
  }) : [];

  return <div className="min-w-0">
    <div className={`editor-delimitacion editor-delimitacion--${modo}`} role="region" aria-label={`Mapa de la zona de cultivo de ${terreno.nombre}`} aria-describedby={idAyuda}>
      <MapContainer className="mapa-delimitacion" center={[terreno.latitud, terreno.longitud]} zoom={17} scrollWheelZoom={false} zoomAnimation={false} doubleClickZoom={modo !== 'dibujar'}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => establecerErrorMapa(true), load: () => establecerErrorMapa(false) }} />
        <EventosMapa modo={modo} alTocar={agregar} alListo={establecerMapa} />
        <Encuadre vertices={guardados} terreno={punto} />
        {cerrada && <Polygon positions={[MUNDO, vertices.map(aTupla)]} interactive={false} pathOptions={{ stroke: false, fillColor: '#1d2a22', fillOpacity: 0.35 }} />}
        {cerrada && <Polygon positions={vertices.map(aTupla)} interactive={false} pathOptions={{ color: '#1d4636', weight: 3, fillColor: '#2f7d43', fillOpacity: 0.3, dashArray: modo === 'editar' ? '6 4' : undefined }} />}
        {modo === 'dibujar' && vertices.length >= 2 && <Polyline positions={vertices.map(aTupla)} interactive={false} pathOptions={{ color: '#a3492a', weight: 3 }} />}
        {modo === 'dibujar' && vertices.length >= 3 && <Polyline positions={[aTupla(vertices[vertices.length - 1] as Vertice), aTupla(vertices[0] as Vertice)]} interactive={false} pathOptions={{ color: '#a3492a', weight: 2, dashArray: '4 6', opacity: 0.8 }} />}
        <CircleMarker center={[terreno.latitud, terreno.longitud]} radius={6} interactive={false} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#1f6391', fillOpacity: 1 }} />
        {modo !== 'ver' && vertices.map((vertice, indice) => <Marker key={`${indice}-${vertice.latitud}-${vertice.longitud}`} position={aTupla(vertice)} draggable={modo === 'editar'} keyboard={false}
          icon={icono(String(indice + 1), `${indice === 0 ? 'vertice-delimitacion--primero' : ''} ${seleccionado === indice ? 'vertice-delimitacion--seleccionado' : ''}`)}
          eventHandlers={{
            click: () => { if (modo === 'dibujar' && indice === 0 && vertices.length >= 3) cerrarZona(); else establecerSeleccionado(indice); },
            dragend: (evento) => { const nuevo = (evento.target as { getLatLng: () => { lat: number; lng: number } }).getLatLng(); mover(indice, { latitud: redondear6(nuevo.lat), longitud: redondear6(nuevo.lng) }); establecerSeleccionado(indice); },
          }}>
          {modo === 'dibujar' && indice === 0 && vertices.length >= 3 && <Tooltip direction="top" offset={[0, -16]} permanent>Toca aquí para cerrar</Tooltip>}
        </Marker>)}
        {intermedios.map(({ indice, posicion }) => <Marker key={`intermedio-${indice}`} position={posicion} keyboard={false} icon={icono('+', 'vertice-delimitacion--intermedio')} eventHandlers={{ click: () => insertarIntermedio(indice) }} />)}
      </MapContainer>
      {modo !== 'ver' && <span aria-hidden="true" className="mira-delimitacion" />}
    </div>
    {errorMapa && <p role="status" className="mt-2 text-sm text-oliva">No se pudo cargar parte del mapa base. Puedes seguir usando la lista de coordenadas.</p>}

    <div id={idAyuda} className="mt-4 text-sm leading-relaxed">
      {modo === 'ver' && (guardados.length >= 3
        ? <p>La zona verde es tu zona de cultivo guardada; lo oscurecido queda fuera. El punto azul es la ubicación del terreno.</p>
        : <p>Este terreno no tiene una zona delimitada. El punto azul es su ubicación.</p>)}
      {modo === 'dibujar' && <ol className="list-decimal space-y-1 pl-5"><li>Toca o haz clic en cada esquina de tu zona de cultivo, siguiendo el borde.</li><li>Para cerrar, toca el punto 1 o usa «Cerrar zona».</li><li>Con teclado: mueve el mapa con las flechas, acerca con + y usa «Añadir punto en el centro» (la mira marca el centro).</li></ol>}
      {modo === 'editar' && <p>Arrastra los puntos numerados para corregirlos. Toca un «+» para añadir un punto entre dos esquinas. Selecciona un punto para eliminarlo.</p>}
    </div>

    {(modo !== 'ver' || guardados.length >= 3) && <dl className="mt-4 grid gap-3 text-sm min-[420px]:grid-cols-3" aria-live="polite">
      <div className="dato-ficha"><div><dt className="text-xs font-semibold uppercase tracking-wide text-oliva">Puntos</dt><dd className="mt-1 font-semibold">{vertices.length}</dd></div></div>
      <div className="dato-ficha"><div><dt className="text-xs font-semibold uppercase tracking-wide text-oliva">Área aproximada</dt><dd className="mt-1 font-semibold">{vertices.length >= 3 ? <><span className="block">{superficie.ha}</span><span className="block text-xs font-normal text-oliva">{superficie.m2}</span></> : 'Faltan puntos'}</dd></div></div>
      <div className="dato-ficha"><div><dt className="text-xs font-semibold uppercase tracking-wide text-oliva">Frente al área declarada</dt><dd className="mt-1 font-semibold">{comparacion ?? (terreno.area_ha === null ? 'No declaraste un área' : 'Faltan puntos')}</dd></div></div>
    </dl>}
    {aviso && <p role="status" className="mt-3 text-sm font-semibold">{aviso}</p>}
    {modo !== 'ver' && problema && vertices.length > 0 && <p className="panel-aviso mt-3 text-sm">{problema}</p>}
    {error && <p role="alert" className="aviso-error mt-3">{error}</p>}

    {puedeEditar && <div className="mt-4 flex flex-wrap gap-3">
      {modo === 'ver' && (guardados.length >= 3
        ? <><button type="button" className="boton-primario" onClick={() => { establecerVertices(guardados); establecerModo('editar'); }}>Editar vértices</button><button type="button" className="boton-secundario" onClick={() => { establecerVertices([]); establecerModo('dibujar'); }}>Volver a dibujar</button><button type="button" className="boton-secundario text-arcilla" onClick={alSolicitarEliminacion}>Eliminar delimitación</button></>
        : <button type="button" className="boton-primario" onClick={() => { establecerVertices([]); establecerModo('dibujar'); }}>Delimitar zona de cultivo</button>)}
      {modo === 'dibujar' && <><button type="button" className="boton-primario" disabled={vertices.length < 3} onClick={cerrarZona}>Cerrar zona</button><button type="button" className="boton-secundario" disabled={!mapa} onClick={agregarCentro}>Añadir punto en el centro</button><button type="button" className="boton-secundario" disabled={vertices.length === 0} onClick={() => eliminarPunto(vertices.length - 1)}>Deshacer último punto</button><button type="button" className="boton-secundario" onClick={cancelar}>Cancelar</button></>}
      {modo === 'editar' && <><button type="button" className="boton-primario" disabled={Boolean(problema) || estaGuardando || (!cambiado && guardados.length >= 3)} onClick={() => alGuardar(aPoligono(vertices))}>{estaGuardando ? 'Guardando…' : 'Guardar delimitación'}</button>{seleccionado !== null && <button type="button" className="boton-secundario" onClick={() => eliminarPunto(seleccionado)}>Eliminar punto {seleccionado + 1}</button>}<button type="button" className="boton-secundario" disabled={!mapa} onClick={agregarCentro}>Añadir punto en el centro</button><button type="button" className="boton-secundario" disabled={estaGuardando} onClick={cancelar}>Cancelar cambios</button></>}
    </div>}

    {modo !== 'ver' && vertices.length > 0 && <details className="mt-5 rounded-2xl border border-pino/20 bg-white/70 p-4 text-sm"><summary className="font-semibold">Coordenadas de los puntos (ajuste fino o uso con teclado)</summary>
      <ol className="mt-3 space-y-3">{vertices.map((vertice, indice) => <li key={indice} className="grid grid-cols-[2rem_1fr_1fr_auto] items-end gap-2">
        <span className="pb-3 font-semibold">{indice + 1}.</span>
        <CampoCoordenada etiqueta="Latitud" valor={vertice.latitud} limite={90} alCambiar={(latitud) => mover(indice, { ...vertice, latitud })} />
        <CampoCoordenada etiqueta="Longitud" valor={vertice.longitud} limite={180} alCambiar={(longitud) => mover(indice, { ...vertice, longitud })} />
        <button type="button" className="boton-secundario px-3" aria-label={`Eliminar punto ${indice + 1}`} onClick={() => eliminarPunto(indice)}>×</button>
      </li>)}</ol>
    </details>}
  </div>;
}
