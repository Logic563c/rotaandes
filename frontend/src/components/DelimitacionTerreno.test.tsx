import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextoSesion } from '../lib/useSesion';
import type { Terreno, UsuarioPublico } from '../types/api';
import { DelimitacionTerreno } from './DelimitacionTerreno';

// jsdom no implementa showModal; se simula igual que en las demás pruebas de diálogos.
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
// Datos sintéticos de prueba; no son terrenos ni personas reales.
const PROPIETARIO = '00000000-0000-4000-8000-000000000001';
const zona = { type: 'Polygon' as const, coordinates: [[[-78.6205, -0.9305], [-78.6195, -0.9305], [-78.6195, -0.9295], [-78.6205, -0.9295], [-78.6205, -0.9305]] as [number, number][]] };
const base: Terreno = { id: '00000000-0000-4000-8000-0000000000aa', usuario_id: PROPIETARIO, nombre: 'Lote de prueba', latitud: -0.93, longitud: -78.62, altitud_m: 2800, area_ha: 1.5, tiene_riego: false, tipo_suelo: 'franco', creado_en: null, poligono: null, area_poligono_m2: null };
const clientes: QueryClient[] = [];
function mostrar(terreno: Terreno, usuario: Partial<UsuarioPublico> = {}) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clientes.push(cliente);
  render(<QueryClientProvider client={cliente}><ContextoSesion.Provider value={{ usuario: { id: PROPIETARIO, email: 'fixture@example.invalid', nombre: 'Prueba', rol: 'agricultor', parroquia: null, telefono: null, prioridad_agua: 3, prioridad_suelo: 3, prioridad_ingresos: 3, creado_en: null, ...usuario }, token: 'token-solo-prueba', estaValidando: false, error: null, confirmarSesion: async () => {}, cerrarSesion: () => {}, reintentar: () => {}, guardarPerfil: () => {}, esSesionActual: () => true }}><DelimitacionTerreno terreno={terreno} /></ContextoSesion.Provider></QueryClientProvider>);
}
async function escribirCoordenadas(puntos: [number, number][]) {
  const filas = screen.getAllByRole('listitem').filter((fila) => within(fila).queryByLabelText('Latitud'));
  for (const [indice, [latitud, longitud]] of puntos.entries()) {
    const fila = filas[indice]; if (!fila) throw new Error('Falta la fila');
    const campoLat = within(fila).getByLabelText('Latitud'); await userEvent.clear(campoLat); await userEvent.click(campoLat); await userEvent.paste(String(latitud));
    const campoLon = within(fila).getByLabelText('Longitud'); await userEvent.clear(campoLon); await userEvent.click(campoLon); await userEvent.paste(String(longitud));
  }
}
afterEach(() => { clientes.forEach((cliente) => cliente.clear()); clientes.length = 0; });

describe('Delimitación de la zona de cultivo', () => {
  it('un terreno antiguo sin polígono muestra la opción y no carga el mapa hasta activarla', () => {
    mostrar(base);
    expect(screen.getByText('Este terreno todavía no tiene una zona delimitada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delimitar zona de cultivo' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Mapa de la zona/ })).not.toBeInTheDocument();
  });
  it('crea una zona con el teclado (punto central y coordenadas), muestra el área y la guarda como GeoJSON cerrado', async () => {
    const guardado = { ...base, poligono: zona, area_poligono_m2: 12390.4 };
    const solicitar = vi.fn().mockResolvedValue(new Response(JSON.stringify(guardado))); vi.stubGlobal('fetch', solicitar);
    mostrar(base);
    await userEvent.click(screen.getByRole('button', { name: 'Delimitar zona de cultivo' }));
    const centro = await screen.findByRole('button', { name: 'Añadir punto en el centro' }, { timeout: 15000 });
    expect(screen.getByRole('button', { name: 'Cerrar zona' })).toBeDisabled();
    for (let i = 0; i < 4; i += 1) await userEvent.click(centro);
    await userEvent.click(screen.getByText('Coordenadas de los puntos (ajuste fino o uso con teclado)'));
    await escribirCoordenadas([[-0.9305, -78.6205], [-0.9305, -78.6195], [-0.9295, -78.6195], [-0.9295, -78.6205]]);
    expect(screen.getByText('1,24 ha')).toBeInTheDocument();
    expect(screen.getByText(/−0,26 ha \(−17,4 %\) respecto al área declarada de 1,5 ha/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar zona' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar delimitación' }));
    expect(await screen.findByText(/Delimitación guardada/)).toBeInTheDocument();
    const [url, opciones] = solicitar.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain(`/terrenos/${base.id}/delimitacion`); expect(opciones.method).toBe('PUT');
    const cuerpo = JSON.parse(String(opciones.body)) as { poligono: typeof zona };
    expect(cuerpo.poligono.type).toBe('Polygon'); expect(cuerpo.poligono.coordinates[0]).toHaveLength(5);
    expect(cuerpo.poligono.coordinates[0]?.[0]).toEqual(cuerpo.poligono.coordinates[0]?.[4]);
    expect(screen.getByText(/Zona delimitada: 1,24 ha/)).toBeInTheDocument();
  }, 20000);
  it('no permite guardar un contorno que se cruza y lo explica', async () => {
    mostrar(base);
    await userEvent.click(screen.getByRole('button', { name: 'Delimitar zona de cultivo' }));
    const centro = await screen.findByRole('button', { name: 'Añadir punto en el centro' }, { timeout: 15000 });
    for (let i = 0; i < 4; i += 1) await userEvent.click(centro);
    await userEvent.click(screen.getByText('Coordenadas de los puntos (ajuste fino o uso con teclado)'));
    await escribirCoordenadas([[-0.9305, -78.6205], [-0.9295, -78.6195], [-0.9305, -78.6195], [-0.9295, -78.6205]]);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar zona' }));
    expect(screen.getByText(/Los lados de la zona se cruzan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar delimitación' })).toBeDisabled();
  }, 20000);
  it('muestra una zona guardada, permite editar vértices (eliminar un punto) y muestra el error del servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Los lados del polígono se cruzan entre sí.' }), { status: 400 })));
    mostrar({ ...base, poligono: zona, area_poligono_m2: 12390.4 });
    expect(screen.getByText(/Zona delimitada: 1,24 ha \(12\.390 m²\)/)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar vértices' }, { timeout: 15000 }));
    expect(screen.getByRole('button', { name: 'Guardar delimitación' })).toBeDisabled();
    await userEvent.click(screen.getByText('Coordenadas de los puntos (ajuste fino o uso con teclado)'));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar punto 4' }));
    expect(screen.getByText('Punto 4 eliminado.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar punto 3' }));
    expect(screen.getByText(/necesita al menos 3 puntos/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar delimitación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Los lados del polígono se cruzan entre sí.');
  }, 20000);
  it('elimina la delimitación tras confirmar, sin tocar el área declarada', async () => {
    const solicitar = vi.fn().mockResolvedValue(new Response(JSON.stringify(base))); vi.stubGlobal('fetch', solicitar);
    mostrar({ ...base, poligono: zona, area_poligono_m2: 12390.4 });
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar delimitación' }, { timeout: 15000 }));
    expect(screen.getByText(/El terreno, su área declarada y sus siembras no cambian/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(await screen.findByText(/Delimitación eliminada/)).toBeInTheDocument();
    expect((solicitar.mock.calls[0] as [string, RequestInit])[1].method).toBe('DELETE');
    expect(screen.getByRole('button', { name: 'Delimitar zona de cultivo' })).toBeInTheDocument();
  }, 20000);
  it('el técnico y otros usuarios solo pueden ver la zona, sin botones de edición', async () => {
    mostrar({ ...base, poligono: zona, area_poligono_m2: 12390.4 }, { id: '00000000-0000-4000-8000-000000000002', rol: 'tecnico' });
    expect(await screen.findByRole('region', { name: /Mapa de la zona de cultivo/ }, { timeout: 15000 })).toBeInTheDocument();
    for (const nombre of ['Editar vértices', 'Eliminar delimitación', 'Volver a dibujar', 'Delimitar zona de cultivo']) expect(screen.queryByRole('button', { name: nombre })).not.toBeInTheDocument();
  }, 20000);
});
