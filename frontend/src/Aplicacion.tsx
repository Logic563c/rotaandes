import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Inicio } from './pages/Inicio';
import { Acceso } from './pages/Acceso';
import { Perfil } from './pages/Perfil';
import { EspacioPersonal } from './pages/EspacioPersonal';
import { useSesion } from './lib/useSesion';
import { Marco } from './components/Marco';
import { Terrenos } from './pages/Terrenos';
import { EditarTerreno } from './pages/EditarTerreno';
import { DetalleTerreno } from './pages/DetalleTerreno';
const PanelTecnico = lazy(async () => ({ default: (await import('./pages/PanelTecnico')).PanelTecnico }));
function RutaPrivada({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  if (sesion.estaValidando) return <Marco><p role="status">Validando tu sesión…</p></Marco>;
  if (sesion.error) return <Marco><div role="alert" className="aviso-error">{sesion.error}</div><button className="boton-primario mt-5" onClick={sesion.reintentar}>Reintentar</button><button className="enlace-nav ml-3" onClick={() => sesion.cerrarSesion()}>Volver a ingresar</button></Marco>;
  if (!sesion.usuario) return <Navigate to="/login" replace />;
  return children;
}
export function Aplicacion() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<Acceso esRegistro={false} />} />
      <Route path="/registro" element={<Acceso key="registro" esRegistro />} />
      <Route path="/inicio" element={<RutaPrivada><EspacioPersonal /></RutaPrivada>} />
      <Route path="/perfil" element={<RutaPrivada><Perfil /></RutaPrivada>} />
      <Route path="/tecnico" element={<RutaPrivada><Suspense fallback={<Marco><p role="status">Preparando el panel técnico…</p></Marco>}><PanelTecnico /></Suspense></RutaPrivada>} />
      <Route path="/terrenos" element={<RutaPrivada><Terrenos /></RutaPrivada>} />
      <Route path="/terrenos/nuevo" element={<RutaPrivada><EditarTerreno /></RutaPrivada>} />
      <Route path="/terrenos/:id/editar" element={<RutaPrivada><EditarTerreno /></RutaPrivada>} />
      <Route path="/terrenos/:id" element={<RutaPrivada><DetalleTerreno /></RutaPrivada>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
