import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import type { MapaTerrenosProps } from './MapaTerrenos';

const Mapa = lazy(async () => ({ default: (await import('./MapaTerrenos')).MapaTerrenos }));
class LimiteMapa extends Component<{ children: ReactNode }, { tieneError: boolean }> {
  state = { tieneError: false };
  static getDerivedStateFromError() { return { tieneError: true }; }
  render() {
    return this.state.tieneError ? <p role="status" className="tarjeta p-6">No se pudo abrir el mapa. Puedes utilizar las coordenadas y la lista de terrenos.</p> : this.props.children;
  }
}
export function MapaDiferido(props: MapaTerrenosProps) {
  return <LimiteMapa><Suspense fallback={<p role="status" className="tarjeta p-6">Preparando el mapa…</p>}><Mapa {...props} /></Suspense></LimiteMapa>;
}
