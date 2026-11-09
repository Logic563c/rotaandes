import { describe, expect, it, vi } from 'vitest';
import { obtenerPanelTecnico } from './api';
import { esquemaPanelTecnico } from './validarPanelTecnico';
import { panelTecnicoPrueba } from '../tests/panelTecnicoPruebas';

describe('API técnica: validación y privacidad', () => {
  it('envía filtros codificados por GET autenticado y valida la respuesta', async () => {
    const solicitar = vi.fn().mockResolvedValue(Response.json(panelTecnicoPrueba())); vi.stubGlobal('fetch', solicitar);
    await obtenerPanelTecnico('token-prueba', { parroquia: 'Pujilí', cultivo: 'papa', pagina: 1 });
    expect(solicitar).toHaveBeenCalledWith(new URL('http://localhost:3000/api/tecnico/terrenos?pagina=1&parroquia=Pujil%C3%AD&cultivo=papa'), expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer token-prueba' }) }));
  });
  it.each(['correo', 'cobertura', 'umbral', 'estado', 'total'])('rechaza incoherencias o dato privado: %s', (caso) => {
    const datos = panelTecnicoPrueba(); const terreno = datos.terrenos[0]; if (!terreno) throw new Error();
    if (caso === 'correo') Reflect.set(terreno, 'email', 'privado@example.invalid');
    if (caso === 'cobertura') terreno.helada.dias_evaluados = 0;
    if (caso === 'umbral') terreno.helada.alertas.forEach((a) => { a.t_min = 3; });
    if (caso === 'estado') terreno.helada.estado = 'sin_alertas';
    if (caso === 'total') datos.paginacion.total = 0;
    expect(esquemaPanelTecnico.safeParse(datos).success).toBe(false);
  });
  it('rechaza otra página y propaga 403 sin presentar datos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(panelTecnicoPrueba())).mockResolvedValueOnce(Response.json({ error: 'Acceso restringido.' }, { status: 403 })));
    await expect(obtenerPanelTecnico('token', { parroquia: '', cultivo: '', pagina: 2 })).rejects.toThrow('página');
    await expect(obtenerPanelTecnico('token', { parroquia: '', cultivo: '', pagina: 1 })).rejects.toThrow('Acceso restringido');
  });
});
