import { Link } from 'react-router-dom';
export function NavegacionTerreno() {
  return <nav aria-label="Qué quieres consultar de tu terreno" className="tarjeta mt-7 p-5 sm:p-6"><h2 className="font-campo text-2xl">¿Qué quieres consultar?</h2><p className="mt-2 text-sm leading-relaxed text-oliva">Elige una pregunta. Cada apartado explica sus datos y permite abrir más detalles.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
      ['calendario', '¿Qué puedo sembrar?'], ['pronostico', '¿Cómo estará el clima?'], ['rotaciones', '¿Qué cultivo puedo sembrar después?'], ['escenarios', '¿Y si llueve menos?'], ['historial', 'Mis siembras e historial'], ['informe', 'Descargar informe'],
    ].map(([destino, texto]) => <a className="boton-secundario justify-start text-left" key={destino} href={`#${destino}`}>{texto}</a>)}</div>
    <p className="mt-3 text-sm text-oliva"><Link className="enlace-nav underline" to="/glosario">Entender las palabras del campo</Link> · <Link className="enlace-nav underline" to="/fuentes">Fuentes y límites</Link></p>
  </nav>;
}
