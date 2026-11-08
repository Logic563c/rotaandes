import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import type { EstadoCalendario, RespuestaCalendario, UsuarioPublico } from '../types/api';
import { CalendarioSiembra } from './CalendarioSiembra';

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
// Respuesta de interfaz sintética, no representa un cálculo agronómico real.
function datosPrueba(): RespuestaCalendario {
  const estados: EstadoCalendario[] = ['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado'];
  const cultivos = [{ id: 'papa', nombre: 'Papa', altitud_min: 2700, altitud_max: 3800 }, { id: 'vicia_avena', nombre: 'Vicia + avena (abono verde)', altitud_min: 2700, altitud_max: 3800 }];
  return { cultivos, celdas: cultivos.flatMap((cultivo) => Array.from({ length: 12 }, (_valor, indice) => ({ cultivo_id: cultivo.id, mes: indice + 1, estado: estados[indice % 4] ?? 'no_determinado', motivo: `Explicación sintética de prueba para ${cultivo.nombre}, mes ${indice + 1}. NASA y catálogo referencial; no es una garantía.` }))),
    terreno: { altitud_m: 3000, area_ha: 1, tiene_riego: false }, escenario: { lluvia_pct: 0, temp_delta: 0 },
    clima: { fuente: 'NASA POWER', resolucion: 'Cuadrícula regional de prueba.', periodo: { inicio: 2001, fin: 2025 }, actualizado_en: '2026-11-08T05:00:00Z', estado_datos: 'cache', desactualizado: false, advertencias: ['Fixture solo para pruebas.'] },
    aviso: 'No reemplaza el criterio del agricultor ni del técnico. Catálogo referencial sin validación agronómica local.' };
}
const clientes: QueryClient[] = [];
function mostrar() {
  let tokenActivo = 'token-a';
  const usuario: UsuarioPublico = { id: 'usuario-a', nombre: 'Persona de prueba', email: 'fixture@example.invalid', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const contenido = (id = 'usuario-a', token = 'token-a') => <QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { ...usuario, id }, token, estaValidando: false, error: null, confirmarSesion: async () => {}, reintentar: () => {}, guardarPerfil: () => {}, cerrarSesion: () => { tokenActivo = ''; }, esSesionActual: (actual) => actual === tokenActivo }}><CalendarioSiembra key={id} terrenoId="terreno-prueba" latitud={-0.93} longitud={-78.62} altitudM={3000} tieneRiego={false} areaHa={1} /></ContextoSesion.Provider></QueryClientProvider>;
  const vista = render(contenido()); return { cerrar: () => { tokenActivo = ''; }, cambiar: () => { tokenActivo = 'token-b'; vista.rerender(contenido('usuario-b', 'token-b')); } };
}
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; vi.unstubAllGlobals(); });
describe('Calendario: matriz, explicaciones y separación de sesiones', () => {
  it('carga a petición, conserva doce meses y abre/cierra explicación por teclado', async () => {
    const pendiente = Promise.withResolvers<Response>(); const solicitar = vi.fn().mockReturnValue(pendiente.promise); vi.stubGlobal('fetch', solicitar);
    mostrar(); expect(solicitar).not.toHaveBeenCalled(); await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' })); expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    pendiente.resolve(new Response(JSON.stringify(datosPrueba()))); const tabla = await screen.findByRole('table'); expect(within(tabla).getAllByRole('columnheader')).toHaveLength(13);
    expect(within(tabla).getAllByRole('rowheader')).toHaveLength(2); expect(screen.getByRole('list', { name: 'Leyenda del calendario' })).toHaveTextContent('No determinado');
    const boton = screen.getByRole('button', { name: 'Papa, Enero: Recomendado' }); boton.focus(); await userEvent.keyboard('{Enter}');
    const dialogo = await screen.findByRole('dialog', { name: 'Papa · Enero' }); expect(within(dialogo).getByText(/Explicación sintética de prueba para Papa, mes 1/)).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'NASA POWER' })).toBeInTheDocument(); await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar explicación' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(String(solicitar.mock.calls[0]?.[0])).toContain('/calendario?lluvia_pct=0&temp_delta=0');
  });
  it('muestra error y reintento sin una matriz inventada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('red')).mockResolvedValueOnce(new Response(JSON.stringify(datosPrueba())))); mostrar();
    await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' })); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByRole('table')).toBeInTheDocument();
  });
  it('identifica altitud desconocida y dato desactualizado sin confundir incertidumbre con amarillo', async () => {
    const datos = datosPrueba(); datos.terreno.altitud_m = null; datos.clima.desactualizado = true; datos.clima.estado_datos = 'desactualizado'; datos.celdas = datos.celdas.map((celda) => ({ ...celda, estado: 'no_determinado' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(datos)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' }));
    await screen.findByRole('table'); expect(screen.getByText(/Altitud desconocida:/)).toBeInTheDocument(); expect(screen.getByText(/Desactualizado: consultar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Papa, Enero: No determinado' })).toBeInTheDocument();
  });
  it.each(['estado', 'duplicada', 'falta'])('rechaza respuesta %s inválida', async (caso) => {
    const datos = datosPrueba(); const primera = datos.celdas[0]; if (!primera) throw new Error('Fixture vacía.');
    const entrada = caso === 'estado' ? { ...datos, celdas: [{ ...primera, estado: 'inventado' }, ...datos.celdas.slice(1)] } : caso === 'duplicada' ? { ...datos, celdas: [primera, ...datos.celdas.slice(0, -1)] } : { ...datos, celdas: datos.celdas.slice(1) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(entrada)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('formato esperado'); expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('informa que no hay cultivos aptos por altitud sin mostrar una tabla vacía engañosa', async () => {
    const datos = datosPrueba(); datos.terreno.altitud_m = 5000; vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(datos)))); mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' }));
    expect(await screen.findByText(/No hay cultivos del catálogo aptos/)).toBeInTheDocument(); expect(screen.getByText(/Fuera del rango de altitud referencial/)).toHaveTextContent('Papa'); expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('no muestra una respuesta tardía al cerrar sesión', async () => {
    const pendiente = Promise.withResolvers<Response>(); vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendiente.promise)); const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' })); sesion.cerrar();
    await act(async () => { pendiente.resolve(new Response(JSON.stringify(datosPrueba()))); }); expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('cambia la cuenta y nunca abre explicaciones de una respuesta anterior', async () => {
    const pendiente = Promise.withResolvers<Response>(); const nueva = datosPrueba(); nueva.celdas = nueva.celdas.map((celda) => ({ ...celda, motivo: 'Información exclusiva de la segunda sesión de prueba.' }));
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pendiente.promise).mockResolvedValueOnce(new Response(JSON.stringify(nueva)))); const sesion = mostrar(); await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' })); sesion.cambiar();
    await userEvent.click(screen.getByRole('button', { name: 'Ver calendario de siembra' })); await screen.findByRole('table');
    await act(async () => { pendiente.resolve(new Response(JSON.stringify(datosPrueba()))); }); await userEvent.click(screen.getByRole('button', { name: 'Papa, Enero: Recomendado' }));
    expect(within(await screen.findByRole('dialog')).getByText('Información exclusiva de la segunda sesión de prueba.')).toBeInTheDocument(); expect(screen.queryByText(/Explicación sintética/)).not.toBeInTheDocument();
  });
});
