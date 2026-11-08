import { Link } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { Marco } from '../components/Marco';
export function EspacioPersonal() {
  const { usuario } = useSesion();
  if (!usuario) return null;
  return <Marco><p className="etiqueta-seccion">Mi espacio · {usuario.rol === 'tecnico' ? 'Técnico agrícola' : 'Agricultor'}</p><h1 className="mt-4 break-words font-campo text-4xl sm:text-5xl">Bienvenido, {usuario.nombre}.</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-oliva">Tu cuenta está lista. Empieza por revisar tu perfil y elegir las prioridades que representan lo que buscas para tu tierra.</p><section className="tarjeta mt-9 max-w-2xl p-7 sm:p-10"><p className="etiqueta-seccion">Un primer paso importante</p><h2 className="mt-4 font-campo text-3xl">Lo que más valoras</h2><p className="mt-4 leading-relaxed text-oliva">Agua, suelo e ingresos. Puedes ajustar la importancia de cada prioridad y actualizar tus datos de contacto.</p><Link to="/perfil" className="boton-primario mt-6 inline-flex">Revisar mi perfil <span aria-hidden="true" className="ml-3">↗</span></Link></section></Marco>;
}
