import { Component, lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eliminarDelimitacion, guardarDelimitacion } from '../lib/api';
import { useAgricultura } from '../lib/useAgricultura';
import { compararConDeclarada, formatearSuperficie } from '../lib/geometria';
import type { PoligonoGeoJson, Terreno } from '../types/api';
import { CabeceraModulo, Icono } from './Iconos';
import { ConfirmarEliminacion } from './ConfirmarEliminacion';
import type { ModoDelimitacion } from './EditorDelimitacion';

const Editor = lazy(async () => ({ default: (await import('./EditorDelimitacion')).EditorDelimitacion }));
class LimiteEditor extends Component<{ children: ReactNode }, { tieneError: boolean }> {
  state = { tieneError: false };
  static getDerivedStateFromError() { return { tieneError: true }; }
  render() { return this.state.tieneError ? <p role="status" className="tarjeta mt-5 p-5">No se pudo abrir el mapa de la zona. Los demás datos del terreno siguen disponibles.</p> : this.props.children; }
}

export function DelimitacionTerreno({ terreno: recibido }: { terreno: Terreno }) {
  const sesion = useAgricultura(); const cliente = useQueryClient();
  // La respuesta del servidor se muestra al instante; si el padre recarga el terreno, manda su versión.
  const [respuesta, establecerRespuesta] = useState<{ de: Terreno; valor: Terreno } | null>(null);
  const terreno = respuesta && respuesta.de === recibido ? respuesta.valor : recibido;
  const puedeEditar = sesion.usuario?.rol === 'agricultor' && sesion.usuario.id === terreno.usuario_id;
  const [modoInicial, establecerModoInicial] = useState<ModoDelimitacion | null>(terreno.poligono ? 'ver' : null);
  const [confirmando, establecerConfirmacion] = useState(false);
  const [mensaje, establecerMensaje] = useState('');
  function actualizar(nuevo: Terreno, texto: string) {
    if (!sesion.sigueActiva()) return;
    establecerRespuesta({ de: recibido, valor: nuevo });
    cliente.setQueryData([...sesion.clave, 'terreno', terreno.id], nuevo);
    void cliente.invalidateQueries({ queryKey: [...sesion.clave, 'terrenos'] });
    establecerModoInicial(nuevo.poligono ? 'ver' : null); establecerMensaje(texto);
  }
  const guardar = useMutation({ mutationFn: (poligono: PoligonoGeoJson) => sesion.ejecutar((token) => guardarDelimitacion(token, terreno.id, poligono)), onSuccess: (nuevo) => actualizar(nuevo, 'Delimitación guardada. Se verá cada vez que abras este terreno.') });
  const eliminar = useMutation({ mutationFn: () => sesion.ejecutar((token) => eliminarDelimitacion(token, terreno.id)), onSuccess: (nuevo) => { establecerConfirmacion(false); actualizar(nuevo, 'Delimitación eliminada. El terreno sigue representado por su punto.'); } });
  const superficie = terreno.area_poligono_m2 === null ? null : formatearSuperficie(terreno.area_poligono_m2);
  const comparacion = terreno.area_poligono_m2 === null ? null : compararConDeclarada(terreno.area_poligono_m2, terreno.area_ha);
  return <section aria-labelledby="titulo-delimitacion" className="modulo">
    <CabeceraModulo icono="area" etiqueta="Tu parcela en el mapa"><h2 id="titulo-delimitacion" className="mt-1 break-words font-campo text-2xl sm:text-4xl">Zona de cultivo</h2></CabeceraModulo>
    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-oliva">Opcional. Marca en el mapa el contorno de la zona que cultivas para verla siempre y conocer su superficie aproximada. No reemplaza el área que declaraste ni es una medición catastral.</p>
    {superficie && <ul aria-label="Resumen de la delimitación" className="mt-4 flex flex-wrap gap-2"><li className="chip chip--cultivo"><Icono nombre="area" className="size-4" />Zona delimitada: {superficie.ha} ({superficie.m2})</li>{comparacion && <li className="chip chip--maiz">{comparacion}</li>}</ul>}
    {mensaje && <p role="status" className="mt-4 rounded-xl border border-cultivo/30 bg-cultivo-claro/60 p-3 text-sm font-semibold">{mensaje}</p>}
    {modoInicial === null ? <>
      {!terreno.poligono && <p className="mt-4 text-sm">{puedeEditar ? 'Este terreno todavía no tiene una zona delimitada.' : 'El propietario no ha delimitado una zona de cultivo para este terreno.'}</p>}
      {puedeEditar && <button type="button" className="boton-primario mt-4" onClick={() => { establecerMensaje(''); establecerModoInicial('dibujar'); }}><Icono nombre="mapa" className="size-5" />Delimitar zona de cultivo</button>}
    </> : <LimiteEditor><Suspense fallback={<p role="status" className="tarjeta estado-cargando mt-5 p-5">Preparando el mapa de la zona…</p>}><div className="aparecer mt-5">
      <Editor key={`${modoInicial}:${JSON.stringify(terreno.poligono)}`} terreno={terreno} modoInicial={modoInicial} puedeEditar={puedeEditar} estaGuardando={guardar.isPending} error={guardar.error?.message ?? null}
        alGuardar={(poligono) => { establecerMensaje(''); guardar.mutate(poligono); }} alSolicitarEliminacion={() => { eliminar.reset(); establecerConfirmacion(true); }}
        alCambiarModo={(modo) => { if (modo !== 'ver') { establecerMensaje(''); guardar.reset(); } else if (!terreno.poligono) establecerModoInicial(null); }} />
    </div></Suspense></LimiteEditor>}
    <details className="ayuda-grafica mt-5"><summary className="flex items-center gap-2 font-semibold"><Icono nombre="fuente" className="size-5 shrink-0" />¿Qué tan exacta es la superficie?</summary>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-oliva"><p>RotaAndes calcula el área del contorno sobre una esfera del tamaño de la Tierra (método geodésico de Chamberlain y Duquette). Para parcelas de este tamaño el cálculo difiere menos de un 0,5 % del elipsoide oficial.</p><p>La mayor fuente de error es el propio dibujo: el mapa base y la ubicación de cada clic pueden desplazarse varios metros. Por eso el valor es aproximado y no sustituye un levantamiento topográfico ni un catastro.</p><p>El clima de NASA POWER es regional (celdas de unos 50 km): no describe solo el interior de esta zona.</p></div>
    </details>
    {confirmando && <ConfirmarEliminacion titulo="¿Eliminar la delimitación?" mensaje="Se borrará el contorno dibujado. El terreno, su área declarada y sus siembras no cambian." estaEliminando={eliminar.isPending} error={eliminar.error?.message ?? null} alConfirmar={() => eliminar.mutate()} alCancelar={() => establecerConfirmacion(false)} />}
  </section>;
}
