import { describe, expect, it } from 'vitest';
import { calcularCalendario } from '../src/services/calendario.js';
import { construirMensual } from '../src/services/nasaPower.js';
import { cultivosReferenciales } from '../src/data/catalogoCultivos.js';
import { crearBasePrueba } from './fixtures/nasaPruebas.js';

describe('Auditoría independiente de las 120 celdas con respuesta NASA archivada', () => {
  it('coincide con una matriz esperada revisada manualmente, sin derivarla del motor', () => {
    // Altitud de escenario de prueba, no afirmación sobre una parcela. R=recomendado, C=cuidado, N=no.
    const esperado: Record<string, string> = {
      papa: 'C N N N N N N N N C C C', haba: 'N N N N N N N N N R R R',
      chocho: 'R N N N N N N N N N R R', quinua: 'R N N N N N N N N N R R',
      cebada: 'R R N N N N N N N N N R', maiz: 'N N N N N N N N C C C N',
      avena: 'R R N N N N N N N R R R', brocoli: 'N N N N N N N N N N N N',
      oca: 'N N N N N N N N N R R R', vicia_avena: 'R R N N N N N N N R R R',
    };
    const celdas = calcularCalendario({ terreno: { altitudM: 3000, tieneRiego: false, areaHa: null }, cultivos: cultivosReferenciales, mensual: construirMensual(crearBasePrueba(), 3000) });
    const codigos = { recomendado: 'R', posible_con_cuidado: 'C', no_recomendado: 'N', no_determinado: '?' };
    expect(celdas).toHaveLength(120);
    for (const [id, fila] of Object.entries(esperado)) expect(celdas.filter((celda) => celda.cultivo_id === id).map((celda) => codigos[celda.estado]).join(' '), id).toBe(fila);
    expect(celdas.filter((celda) => celda.estado === 'recomendado')).toHaveLength(25);
    expect(celdas.filter((celda) => celda.estado === 'posible_con_cuidado')).toHaveLength(7);
    expect(celdas.filter((celda) => celda.estado === 'no_recomendado')).toHaveLength(88);
  });
});
