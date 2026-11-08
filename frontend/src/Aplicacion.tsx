import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Inicio } from './pages/Inicio';
import { Acceso } from './pages/Acceso';
import { Perfil } from './pages/Perfil';
import { EspacioPersonal } from './pages/EspacioPersonal';
import { useSesion } from './lib/useSesion';
import { Marco } from './components/Marco';
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
