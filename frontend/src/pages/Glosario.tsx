import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Marco } from '../components/Marco';
import { glosario } from '../data/glosario';
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function Glosario() {
  const [busqueda, establecerBusqueda] = useState('');
  const campoBusqueda = useRef<HTMLInputElement>(null);
  const terminos = glosario.filter((entrada) => normalizar(`${entrada.termino} ${entrada.definicion} ${entrada.ejemplo}`).includes(normalizar(busqueda.trim())));
  return <Marco><p className="etiqueta-seccion">Palabras para comprender y decidir</p><h1 className="mt-4 font-campo text-4xl sm:text-5xl">Glosario agrícola y climático</h1>
    <p className="mt-5 max-w-2xl leading-relaxed text-oliva">Definiciones breves, con ejemplos para tu terreno. Son explicaciones; no reemplazan una evaluación agrícola local.</p>
    <label className="campo mt-7 max-w-xl">Buscar una palabra<input ref={campoBusqueda} type="search" value={busqueda} onChange={(evento) => establecerBusqueda(evento.target.value)} maxLength={100} placeholder="Por ejemplo: helada, lluvia o NDVI" /></label>
    <p role="status" className="mt-3 text-sm text-oliva">{terminos.length} de {glosario.length} términos.</p>
    {!terminos.length && <div className="tarjeta mt-6 p-5"><p>No encontramos esa palabra. Prueba con otra o revisa la lista completa.</p><button className="boton-secundario mt-4" onClick={() => { establecerBusqueda(''); campoBusqueda.current?.focus(); }}>Mostrar todos los términos</button></div>}
    <dl className="mt-7 grid gap-5 md:grid-cols-2">{terminos.map((entrada) => <div className="tarjeta min-w-0 p-6" key={entrada.id} id={entrada.id}><dt className="font-campo text-2xl font-semibold">{entrada.termino}</dt><dd className="mt-3 leading-relaxed text-oliva">{entrada.definicion}<p className="mt-3 text-sm"><span className="font-semibold text-pino">En tu terreno: </span>{entrada.ejemplo}</p></dd></div>)}</dl>
    <p className="mt-8 leading-relaxed text-oliva">Consulta <Link to="/fuentes" className="enlace-nav underline">las fuentes y sus limitaciones</Link>. Para ampliar conceptos: <a className="enlace-nav underline" href="https://www.fao.org/4/X0490E/x0490e04.htm">FAO: evapotranspiración</a>, <a className="enlace-nav underline" href="https://www.fao.org/conservation-agriculture/in-practice/soil-organic-cover/en">FAO: cobertura del suelo</a> y <a className="enlace-nav underline" href="https://wmo.int/themes/weather">OMM: tiempo y clima</a>.</p>
  </Marco>;
}
