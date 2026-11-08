import { createHash } from 'node:crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import type { UsuarioPublico, TipoCapa } from '../types/api';
import type { MapaTerrenosProps } from './MapaTerrenos';
import { bytesCapaPrueba, crearCapaPrueba } from '../tests/capasPruebas';
import { VisorCapas } from './VisorCapas';

vi.mock('./MapaDiferido', () => ({ MapaDiferido: ({ imagenSatelital, terrenos, mostrarMapaBase }: MapaTerrenosProps) => <div aria-label="Mapa controlado"><p>Terrenos autorizados: {terrenos.length}. Base: {String(mostrarMapaBase)}</p>{imagenSatelital?.url && <img src={imagenSatelital.url} alt={imagenSatelital.nombre} />}</div> }));
const clientes: QueryClient[] = [];
const hash = createHash('sha256').update(bytesCapaPrueba).digest('hex');
beforeEach(() => {
  if (!Blob.prototype.arrayBuffer) Object.defineProperty(Blob.prototype, 'arrayBuffer', { configurable: true, value: function (this: Blob) { return new Promise<ArrayBuffer>((resolver, rechazar) => { const lector = new FileReader(); lector.onload = () => { if (lector.result instanceof ArrayBuffer) resolver(lector.result); else rechazar(new Error('Blob de prueba inválido.')); }; lector.onerror = () => rechazar(new Error('No se pudo leer el Blob de prueba.')); lector.readAsArrayBuffer(this); }); } });
  // Adaptador SHA real de Node para BufferSource de la ventana jsdom; el navegador usa Web Crypto nativo.
  vi.stubGlobal('crypto', { subtle: { digest: async (_algoritmo: string, bytes: ArrayBuffer) => Uint8Array.from(createHash('sha256').update(new Uint8Array(bytes)).digest()).buffer } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: vi.fn(() => 'blob:imagen-de-prueba') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; vi.unstubAllGlobals(); });
function mostrar() {
  let activo = 'token-a';
  const usuario: UsuarioPublico = { id: 'a', nombre: 'Prueba', email: 'fixture@example.invalid', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clientes.push(cliente);
  const contenido = (id = 'a', token = 'token-a') => <QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { ...usuario, id }, token, estaValidando: false, error: null, confirmarSesion: async () => {}, reintentar: () => {}, guardarPerfil: () => {}, cerrarSesion: () => { activo = ''; }, esSesionActual: (actual) => actual === activo }}><VisorCapas key={id} terrenos={[]} /></ContextoSesion.Provider></QueryClientProvider>;
  const vista = render(contenido()); return { cerrar: () => { activo = ''; }, cambiar: () => { activo = 'token-b'; vista.rerender(contenido('b', 'token-b')); } };
}
function respuesta(entrada: URL | RequestInfo) {
  const url = new URL(String(entrada));
  if (url.pathname.endsWith('/imagen')) return new Response(bytesCapaPrueba, { headers: { 'Content-Type': 'image/png' } });
  const datos = crearCapaPrueba(url.pathname.includes('humedad_suelo') ? 'humedad_suelo' : 'ndvi', Number(url.searchParams.get('anio')), Number(url.searchParams.get('mes')), url.searchParams.get('fecha') ?? undefined); datos.sha256 = hash;
  return new Response(JSON.stringify(datos));
}
async function activar(tipo: TipoCapa = 'ndvi') {
  await userEvent.click(screen.getByRole('button', { name: 'Explorar capas NASA' }));
  await userEvent.click(screen.getByRole('radio', { name: tipo === 'ndvi' ? 'Vegetación NDVI (MODIS)' : 'Humedad superficial (SMAP)' }));
}
describe('Visor: fechas, activación, procedencia, ausencia y sesión', () => {
  it('activa y desactiva capas, muestra límites/leyenda y libera la imagen al cerrar', async () => {
    const solicitar = vi.fn(async (entrada: URL | RequestInfo) => respuesta(entrada)); vi.stubGlobal('fetch', solicitar); mostrar(); expect(solicitar).not.toHaveBeenCalled(); await activar();
    expect(await screen.findByAltText('Vegetación NDVI')).toBeInTheDocument(); expect(screen.getByRole('list', { name: 'Leyenda Vegetación NDVI' })).toBeVisible(); expect(screen.getByText(/Sin|sin GeoJSON ni agregación mensual/)).toBeVisible();
    expect(solicitar).toHaveBeenCalledTimes(2); expect(solicitar).toHaveBeenLastCalledWith(expect.any(URL), expect.objectContaining({ headers: { Accept: 'image/png', Authorization: 'Bearer token-a' } }));
    await userEvent.click(screen.getByRole('radio', { name: 'Humedad superficial (SMAP)' })); await screen.findByAltText('Humedad superficial SMAP'); expect(screen.queryByAltText('Vegetación NDVI')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mostrar cartografía debajo de la capa' })); expect(screen.getByText(/Base: false/)).toBeVisible();
    await userEvent.click(screen.getByRole('radio', { name: 'Solo mapa base' })); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it('selecciona año y mes con claves nuevas y sin mostrar imágenes de fechas anteriores', async () => {
    const solicitar = vi.fn(async (entrada: URL | RequestInfo) => respuesta(entrada)); vi.stubGlobal('fetch', solicitar); mostrar(); await activar(); await screen.findByAltText('Vegetación NDVI');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Año' }), '2024'); await waitFor(() => expect(String(solicitar.mock.calls.at(-1)?.[0])).toContain('anio=2024'));
    await screen.findByAltText('Vegetación NDVI'); await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mes' }), '2');
    await waitFor(() => expect(String(solicitar.mock.calls.at(-1)?.[0])).toContain('mes=2')); await screen.findByAltText('Vegetación NDVI');
    expect(screen.getByRole('combobox', { name: 'Mes' })).toHaveValue('2'); expect(screen.getByText(/No es un promedio de febrero/)).toBeVisible();
  });
  it('una imagen sin píxeles visibles no se transforma en cero ni se solicita el PNG', async () => {
    const datos = crearCapaPrueba('humedad_suelo'); datos.estado_imagen = 'sin_pixeles_visibles'; const solicitar = vi.fn(async () => new Response(JSON.stringify(datos))); vi.stubGlobal('fetch', solicitar); mostrar(); await activar('humedad_suelo');
    expect(await screen.findByText(/Sin píxeles visibles/)).toHaveTextContent('No significa humedad o vegetación igual a cero'); expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(solicitar).toHaveBeenCalledOnce();
  });
  it('errores externos no muestran una imagen inventada y permiten reintentar', async () => {
    let falla = true; vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => falla ? new Response('{}', { status: 503 }) : respuesta(entrada))); mostrar(); await activar(); await screen.findByRole('alert'); expect(screen.queryByRole('img')).not.toBeInTheDocument();
    falla = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByAltText('Vegetación NDVI')).toBeInTheDocument();
  });
  it.each(['producto', 'geometria', 'formato', 'fecha', 'hash'])('rechaza metadatos o imagen %s incompatibles', async (caso) => {
    vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => {
      if (String(entrada).includes('/imagen')) return respuesta(entrada);
      const datos = crearCapaPrueba(); if (caso === 'producto') datos.resolucion_m = 9000;
      const modificado = caso === 'geometria' ? { ...datos, limites: [0, 0, 1, 1] } : caso === 'formato' ? { ...datos, formato: 'GeoJSON' } : caso === 'fecha' ? { ...datos, anio: 2024, fecha: '2024-01-01', fechas_disponibles: ['2024-01-01'] } : datos;
      return new Response(JSON.stringify(modificado));
    })); mostrar(); await activar(); expect(await screen.findByRole('alert')).toBeVisible(); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it.each(['cerrar', 'cambiar'] as const)('no muestra respuestas tardías al %s sesión', async (accion) => {
    const pendiente = Promise.withResolvers<Response>(); let primera = true;
    vi.stubGlobal('fetch', vi.fn(async (entrada: URL | RequestInfo) => { if (primera) { primera = false; return pendiente.promise; } return respuesta(entrada); }));
    const vista = mostrar(); await activar(); vista[accion]();
    if (accion === 'cambiar') await activar('humedad_suelo');
    await act(async () => { const datos = crearCapaPrueba(); datos.sha256 = hash; pendiente.resolve(new Response(JSON.stringify(datos))); });
    expect(screen.queryByAltText('Vegetación NDVI')).not.toBeInTheDocument();
    if (accion === 'cambiar') expect(await screen.findByAltText('Humedad superficial SMAP')).toBeInTheDocument();
  });
});
