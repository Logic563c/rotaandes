import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import { Link } from 'react-router-dom';
import type { Terreno } from '../types/api';
import 'leaflet/dist/leaflet.css';

export interface PuntoTerreno { latitud: number; longitud: number }
export interface MapaTerrenosProps {
  terrenos: Terreno[];
  punto?: PuntoTerreno | null;
  alSeleccionar?: (punto: PuntoTerreno) => void;
}

function InteraccionesMapa({ terrenos, punto, alSeleccionar }: MapaTerrenosProps) {
  const mapa = useMap();
  useMapEvents({ click: (evento) => {
    const ubicacion = evento.latlng.wrap();
    alSeleccionar?.({ latitud: Number(ubicacion.lat.toFixed(6)), longitud: Number(ubicacion.lng.toFixed(6)) });
  } });
  useEffect(() => {
    // Evita transiciones pendientes que accedan al mapa después de navegar y desmontarlo.
    if (punto) mapa.panTo([punto.latitud, punto.longitud], { animate: false });
    else if (terrenos.length > 0) mapa.fitBounds(latLngBounds(terrenos.map((terreno) => [terreno.latitud, terreno.longitud])), { padding: [35, 35], maxZoom: 14, animate: false });
  }, [mapa, punto, terrenos]);
  return null;
}

export function MapaTerrenos({ terrenos, punto, alSeleccionar }: MapaTerrenosProps) {
  const [estaCargando, establecerCarga] = useState(true);
  const [hayError, establecerError] = useState(false);
  const [version, establecerVersion] = useState(0);
  return (
    <section aria-label="Mapa de terrenos" className="overflow-hidden rounded-2xl border border-pino/20 bg-arena">
      <MapContainer className="mapa-terrenos" center={[-0.93, -78.62]} zoom={12} scrollWheelZoom={false} zoomAnimation={false}>
        <TileLayer key={version} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ loading: () => establecerCarga(true), load: () => establecerCarga(false), tileerror: () => { establecerError(true); establecerCarga(false); } }} />
        <InteraccionesMapa terrenos={terrenos} {...(punto !== undefined && { punto })} {...(alSeleccionar && { alSeleccionar })} />
        {terrenos.map((terreno, indice) => <Marker key={terreno.id} position={[terreno.latitud, terreno.longitud]}
          title={terreno.nombre} alt={`Terreno ${terreno.nombre}`} icon={divIcon({ className: 'marcador-terreno', html: String(indice + 1), iconSize: [32, 32], iconAnchor: [16, 16] })}>
          <Popup><strong>{terreno.nombre}</strong><p>{terreno.area_ha === null ? 'Área sin indicar' : `${terreno.area_ha} ha`}</p><Link to={`/terrenos/${terreno.id}`}>Ver detalle de {terreno.nombre}</Link></Popup>
        </Marker>)}
        {punto && <Marker position={[punto.latitud, punto.longitud]} title="Ubicación seleccionada" alt="Ubicación seleccionada"
          icon={divIcon({ className: 'marcador-terreno marcador-terreno--seleccionado', html: '+', iconSize: [34, 34], iconAnchor: [17, 17] })} />}
      </MapContainer>
      <div className="bg-white/90 px-4 py-3 text-xs leading-relaxed text-oliva">
        <p>{alSeleccionar ? 'Toca el mapa para ubicar tu terreno. También puedes escribir las coordenadas en el formulario.' : 'Selecciona un marcador para consultar el terreno.'}</p>
        {estaCargando && !hayError && <p role="status" className="mt-2">Cargando mapa base…</p>}
        {hayError && <div className="mt-2" role="status">No se pudo cargar parte del mapa base. Puedes usar las coordenadas y la lista de terrenos.
          <button className="enlace-nav underline" type="button" onClick={() => { establecerError(false); establecerCarga(true); establecerVersion(version + 1); }}>Reintentar mapa</button></div>}
      </div>
    </section>
  );
}
