import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icono } from './Iconos';
import type { NombreIcono } from './Iconos';

const ACCESOS: [string, string, NombreIcono, string, string][] = [
  ['delimitacion', 'Delimitar mi zona de cultivo', 'area', '#2f7d43', '#e3f1e1'],
  ['calendario', '¿Qué puedo sembrar?', 'calendario', '#2f7d43', '#e3f1e1'],
  ['pronostico', '¿Cómo estará el clima?', 'nube', '#1f6391', '#e2eff8'],
  ['rotaciones', '¿Qué cultivo puedo sembrar después?', 'rotacion', '#a3492a', '#f8e6dc'],
  ['escenarios', '¿Y si llueve menos?', 'deslizador', '#7a5410', '#fbf0d0'],
  ['historial', 'Mis siembras e historial', 'brote', '#1d4636', '#ece5d3'],
  ['informe', 'Descargar informe', 'documento', '#1d4636', '#ece5d3'],
];
export function NavegacionTerreno() {
  return <nav aria-label="Qué quieres consultar de tu terreno" className="tarjeta mt-7 p-5 sm:p-6"><h2 className="font-campo text-2xl">¿Qué quieres consultar?</h2><p className="mt-2 text-sm leading-relaxed text-oliva">Elige una pregunta. Cada apartado explica sus datos y permite abrir más detalles.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ACCESOS.map(([destino, texto, icono, acento, claro]) => <a className="acceso-rapido" style={{ '--acento': acento, '--acento-claro': claro } as CSSProperties} key={destino} href={`#${destino}`}><span className="acceso-rapido__icono"><Icono nombre={icono} /></span>{texto}</a>)}</div>
    <p className="mt-3 text-sm text-oliva"><Link className="enlace-nav underline" to="/glosario">Entender las palabras del campo</Link> · <Link className="enlace-nav underline" to="/fuentes">Fuentes y límites</Link></p>
  </nav>;
}
