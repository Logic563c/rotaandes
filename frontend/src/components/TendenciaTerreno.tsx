import { lazy, Suspense, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerTendencia } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import { EstadoConsulta } from './EstadoConsulta';
import type { EstadisticaTendencia } from '../types/tendencia';
import { CabeceraModulo } from './Iconos';

const Graficas = lazy(async () => ({ default: (await import('./GraficasTendencia')).GraficasTendencia }));
const ESTADOS = { nasa: 'Consulta reciente a NASA', cache: 'Caché verificada', desactualizado: 'Datos anteriores: NASA no disponible', respaldo: 'Respaldo verificado: serie NASA archivada de la misma celda (NASA no respondió)', no_disponible: 'No disponible' };
const mostrar = (valor: number | null, decimales = 3) => valor === null ? 'No disponible' : valor.toLocaleString('es-EC', { maximumFractionDigits: decimales });
function ResumenVariable({ titulo, unidad, resumen }: { titulo: string; unidad: string; resumen: EstadisticaTendencia }) {
  const direccion = { ascendente: 'Ascendente', descendente: 'Descendente', sin_cambio: 'Sin cambio apreciable con la precisión publicada', no_determinada: 'No determinada: menos de 15 años completos' };
  return <article className="tarjeta min-w-0 p-5"><h3 className="font-semibold">{titulo}</h3><p className="mt-3 text-sm">{resumen.n} de 20 años completos{resumen.inicio !== null && resumen.fin !== null ? `, ${resumen.inicio}–${resumen.fin}` : ''}.</p>
    <p className="mt-2 text-sm font-semibold">Dirección descriptiva: {direccion[resumen.direccion]}.</p>
    <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-oliva">Pendiente por década</dt><dd className="font-semibold">{mostrar(resumen.pendiente_decada, 4)}{resumen.pendiente_decada !== null ? ` ${unidad}/década` : ''}</dd></div>
      <div><dt className="text-oliva">Diferencia 2024 − 2005</dt><dd className="font-semibold">{mostrar(resumen.diferencia_2005_2024)}{resumen.diferencia_2005_2024 !== null ? ` ${unidad}` : ' (faltan extremos completos)'}</dd></div></dl>
    {resumen.anios_excluidos.length > 0 && <p className="mt-3 text-xs text-oliva">Años excluidos para esta variable: {resumen.anios_excluidos.join(', ')}.</p>}
  </article>;
}
export function TendenciaTerreno({ terrenoId, latitud, longitud }: { terrenoId: string; latitud: number; longitud: number }) {
  const sesion = useAgricultura(); const id = useId(); const [abierto, establecerAbierto] = useState(false);
  const consulta = useQuery({ queryKey: [...sesion.clave, 'tendencia', terrenoId, latitud, longitud, 2005, 2024], enabled: abierto && Boolean(sesion.token), retry: false, staleTime: 60000, refetchOnWindowFocus: false,
    queryFn: ({ signal }) => sesion.ejecutar((token) => obtenerTendencia(token, terrenoId, { latitud, longitud }, signal), signal) });
  const datos = consulta.isSuccess && sesion.sigueActiva() ? consulta.data : undefined;
  return <section aria-labelledby={`${id}-titulo`} className="modulo modulo--cielo">
    <CabeceraModulo icono="tendencia" etiqueta="Mirar nuestra historia climática"><h2 id={`${id}-titulo`} className="mt-1 break-words font-campo text-2xl sm:text-4xl">¿Cómo ha cambiado el clima?</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Compara años de 2005 a 2024 con NASA POWER. Son datos históricos regionales; no predicen el tiempo futuro ni atribuyen los cambios a una causa.</p>
    <button type="button" className="boton-secundario mt-5" aria-expanded={abierto} aria-controls={`${id}-contenido`} onClick={() => establecerAbierto(!abierto)}>{abierto ? 'Ocultar tendencias históricas' : 'Ver tendencias 2005–2024'}</button>
    {abierto && <div id={`${id}-contenido`} className="mt-6">
      <EstadoConsulta cargando={consulta.isPending || consulta.isFetching} error={consulta.error} alReintentar={() => { void consulta.refetch(); }} />
      {consulta.isError && <p className="mt-3 text-sm text-oliva">No hay una serie fiable disponible para esta ubicación. Los datos ausentes no se han reemplazado por valores inventados.</p>}
      {datos && !consulta.isFetching && <>
        <div className="panel-fuente text-sm leading-relaxed"><p className="font-semibold">Fuente: <a href="https://power.larc.nasa.gov/docs/" target="_blank" rel="noreferrer" className="underline">NASA POWER</a> · Periodo solicitado 2005–2024</p>
          <p className="mt-2">{datos.resolucion}</p>
          {([{ clave: 'mensual', nombre: 'Serie mensual' }, { clave: 'diario', nombre: 'Serie diaria para heladas' }] as const).map(({ clave, nombre }) => <p key={clave} className="mt-3"><strong>{nombre}:</strong> {ESTADOS[datos.fuentes[clave].estado_datos]}{datos.fuentes[clave].desactualizado ? ' · Desactualizada (30 días o más)' : ''}. Consulta: {datos.fuentes[clave].actualizado_en ? new Date(datos.fuentes[clave].actualizado_en).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' }) : 'no disponible'}.</p>)}
          <p className="mt-3">Cobertura diaria válida: {datos.cobertura_diaria.dias_validos} de {datos.cobertura_diaria.dias_esperados} días{datos.cobertura_diaria.inicio && datos.cobertura_diaria.fin ? ` (${datos.cobertura_diaria.inicio} a ${datos.cobertura_diaria.fin})` : ''}.</p>
          <button type="button" className="enlace-nav mt-4 underline" onClick={() => { void consulta.refetch(); }}>Volver a comprobar tendencias</button>
        </div>
        {datos.advertencias.length > 0 && <div className="panel-aviso mt-5 text-sm"><h3 className="font-semibold">Cobertura y limitaciones</h3><ul className="mt-2 list-disc space-y-2 pl-5">{datos.advertencias.map((aviso, indice) => <li key={indice}>{aviso}</li>)}</ul></div>}
        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-3"><ResumenVariable titulo="Precipitación anual" unidad="mm" resumen={datos.tendencias.lluvia_mm} /><ResumenVariable titulo="Menor mínima mensual" unidad="°C" resumen={datos.tendencias.t_min} /><ResumenVariable titulo="Días de helada modelados" unidad="días" resumen={datos.tendencias.dias_helada} /></div>
        <p className="mt-5 rounded-xl border border-pino/15 bg-white p-4 text-sm leading-relaxed">Las pendientes describen los datos disponibles. No se evaluó significancia estadística ni se demuestra una causa. La diferencia entre dos extremos puede ser distinta de la dirección del ajuste de todos los años.</p>
        <Suspense fallback={<p role="status" className="mt-6">Preparando gráficas históricas…</p>}><Graficas anual={datos.anual} tendencias={datos.tendencias} fuente={`Fuente: NASA POWER · años ${datos.periodo.inicio}–${datos.periodo.fin} · dato regional (aprox. 50 km)`} /></Suspense>
        <div role="region" aria-label="Tabla anual de tendencias" tabIndex={0} className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-pino/20">
          <table className="w-full min-w-[800px] text-left text-sm"><caption className="bg-white p-4 text-left font-semibold">Valores anuales y cobertura. Un año incompleto no se usa como total ni para ajustar su tendencia.</caption><thead className="bg-arena"><tr>{['Año', 'Lluvia mm', 'Menor mínima °C', 'GWETTOP 0–1', 'Heladas ≤0 °C', 'Meses válidos lluvia / mín. / humedad', 'Días válidos / esperados'].map((nombre) => <th scope="col" className="p-3" key={nombre}>{nombre}</th>)}</tr></thead>
            <tbody>{datos.anual.map((anio) => <tr key={anio.anio} className="border-t border-pino/10 bg-white/70"><th scope="row" className="p-3">{anio.anio}</th><td className="p-3">{mostrar(anio.lluvia_mm)}</td><td className="p-3">{mostrar(anio.t_min)}</td><td className="p-3">{mostrar(anio.humedad_suelo)}</td><td className="p-3">{mostrar(anio.dias_helada)}</td><td className="p-3">{anio.cobertura.meses_lluvia} / {anio.cobertura.meses_temperatura} / {anio.cobertura.meses_humedad}</td><td className="p-3">{anio.cobertura.dias_temperatura} / {anio.cobertura.dias_esperados}</td></tr>)}</tbody>
          </table>
        </div>
        <details className="mt-6 rounded-2xl border border-pino/20 bg-white p-5 text-sm leading-relaxed"><summary className="cursor-pointer font-semibold">Cómo se calculan y qué significan estos datos</summary><div className="mt-4 space-y-3">{Object.values(datos.metodologia).map((texto) => <p key={texto}>{texto}</p>)}</div></details>
        <p className="panel-aviso mt-5 text-sm leading-relaxed">{datos.aviso}</p>
      </>}
    </div>}
  </section>;
}
