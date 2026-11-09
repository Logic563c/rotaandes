import { describe, expect, it, vi } from 'vitest';
import { obtenerTendencia } from './api';
import { esquemaTendencia } from './validarTendencia';
import { tendenciaPrueba } from '../tests/tendenciaPruebas';

describe('Contrato y cliente de tendencias', () => {
  it('consulta GET autenticado sin coordenadas manipulables y acepta el contrato completo', async () => {
    const solicitar = vi.fn().mockResolvedValue(Response.json(tendenciaPrueba())); vi.stubGlobal('fetch', solicitar);
    const datos = await obtenerTendencia('token-prueba', 'terreno-prueba', { latitud: -0.93, longitud: -78.62 }); expect(datos.anual).toHaveLength(20);
    expect(solicitar).toHaveBeenCalledWith(new URL('http://localhost:3000/api/terrenos/terreno-prueba/tendencia'), expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer token-prueba' }) }));
  });
  it('rechaza una respuesta que pertenece a las coordenadas anteriores del terreno', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(tendenciaPrueba())));
    await expect(obtenerTendencia('token-prueba', 'terreno-prueba', { latitud: -1, longitud: -78.62 })).rejects.toThrow();
  });
  it.each(['anio', 'unidad', 'cobertura', 'conteo', 'estadistica', 'proveedor', 'extremo'])('rechaza incoherencia de %s', (caso) => {
    const datos = tendenciaPrueba(); const primero = datos.anual[0]; if (!primero) throw new Error('Fixture vacía');
    if (caso === 'anio') primero.anio = 2006;
    if (caso === 'unidad') Reflect.set(datos.unidades, 'lluvia_mm', 'mm/día');
    if (caso === 'cobertura') primero.cobertura.meses_lluvia = 11;
    if (caso === 'conteo') primero.dias_helada = 366;
    if (caso === 'estadistica') datos.tendencias.lluvia_mm.n = 19;
    if (caso === 'proveedor') datos.fuentes.mensual.url = 'https://ejemplo.invalid/datos';
    if (caso === 'extremo') primero.lluvia_mm = Infinity;
    expect(esquemaTendencia.safeParse(datos).success).toBe(false);
  });
  it('acepta ausencia diaria conservando nulos y cero años disponibles, sin convertirlos a cero', () => {
    const datos = esquemaTendencia.parse(tendenciaPrueba(true)); expect(datos.anual.every((a) => a.dias_helada === null)).toBe(true); expect(datos.tendencias.dias_helada.n).toBe(0);
  });
});
