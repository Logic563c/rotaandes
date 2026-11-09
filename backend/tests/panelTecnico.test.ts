import { describe, expect, it, vi } from 'vitest';
import { resumirHeladaTecnica, validarFiltrosTecnico } from '../src/services/panelTecnico.js';
import { crearBasePronostico } from './fixtures/pronosticoPruebas.js';

const fecha = '2030-01-01T12:00:00.000Z'; const ahora = new Date('2030-01-01T12:01:00Z');
describe('Panel técnico: criterios reutilizados, vigencia y entradas', () => {
  it('umbral inclusivo y configurable, con cobertura incompleta explícita', () => {
    const base = crearBasePronostico(fecha); const datos = resumirHeladaTecnica(base, new Date(fecha), -0.93, -78.62, ahora);
    expect(datos.estado).toBe('posible_helada'); expect(datos.alertas.map((a) => a.t_min)).toEqual([1.5, 2, -1]); expect(datos.dias_evaluados).toBe(6); expect(datos.actualizado_en).toBe(fecha);
    expect(resumirHeladaTecnica(base, new Date(fecha), -0.93, -78.62, ahora, 1).alertas.map((a) => a.t_min)).toEqual([-1]);
  });
  it('solo concluye sin alertas con siete mínimas válidas, sin afirmar ausencia de helada', () => {
    const base = crearBasePronostico(fecha); base.dias.forEach((d) => { d.t_min = 3; });
    const datos = resumirHeladaTecnica(base, new Date(fecha), -0.93, -78.62, ahora); expect(datos.estado).toBe('sin_alertas'); expect(datos.motivo).toContain('No garantiza');
    const primerDia = base.dias[0]; if (!primerDia) throw new Error(); primerDia.t_min = null;
    expect(resumirHeladaTecnica(base, new Date(fecha), -0.93, -78.62, ahora).estado).toBe('desconocido');
  });
  it.each(['ausente', 'corrupto', 'vencido', 'futuro', 'otra_ubicacion', 'fecha_sql'])('%s nunca significa sin riesgo', (caso) => {
    const base = crearBasePronostico(fecha); const lectura = caso === 'ausente' ? null : caso === 'corrupto' ? {} : base;
    const reloj = caso === 'vencido' ? new Date('2030-01-01T12:30:00Z') : caso === 'futuro' ? new Date('2030-01-01T11:59:00Z') : ahora;
    const datos = resumirHeladaTecnica(lectura, caso === 'fecha_sql' ? ahora : new Date(fecha), caso === 'otra_ubicacion' ? -1 : -0.93, -78.62, reloj);
    expect(datos.estado).toBe('desconocido'); expect(datos.alertas).toEqual([]); expect(datos.vigente_hasta).toBeNull();
  });
  it('no consulta proveedores ni modifica la base meteorológica al resumir múltiples terrenos', () => {
    const solicitar = vi.spyOn(globalThis, 'fetch'); const base = crearBasePronostico(fecha); const copia = structuredClone(base);
    for (let i = 0; i < 100; i++) resumirHeladaTecnica(base, new Date(fecha), -0.93, -78.62, ahora);
    expect(solicitar).not.toHaveBeenCalled(); expect(base).toEqual(copia); solicitar.mockRestore();
  });
  it('normaliza filtros vacíos y conserva nombres reales de parroquia', () => {
    expect(validarFiltrosTecnico({ parroquia: '', cultivo: '' })).toEqual({ parroquia: null, cultivo: null, pagina: 1 });
    expect(validarFiltrosTecnico({ parroquia: ' Pujilí ', cultivo: 'vicia_avena', pagina: '2' })).toEqual({ parroquia: 'Pujilí', cultivo: 'vicia_avena', pagina: 2 });
  });
  it.each([{ parroquia: ['Pujilí'] }, { cultivo: '../papa' }, { cultivo: 'papa&rol=tecnico' }, { parroquia: '\0' }, { parroquia: 'a'.repeat(101) }, { usuario_id: 'ajeno' }, { pagina: '0' }, { pagina: '1.5' }, { pagina: '100000' }, { pagina: ['1', '2'] }])('rechaza filtros no permitidos: %j', (datos) => {
    expect(() => validarFiltrosTecnico(datos)).toThrow();
  });
});
