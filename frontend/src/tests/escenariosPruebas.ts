import type { EscenarioCalendario } from '../types/api';
import type { ResultadosEscenario } from '../lib/compararEscenarios';
import { crearRotacionesPrueba } from './rotacionesPruebas';

// Respuestas sintéticas de interfaz: no son observaciones NASA ni cálculos científicos.
export function crearEscenariosPrueba(escenario: EscenarioCalendario = { lluvia_pct: 0, temp_delta: 0 }): ResultadosEscenario {
  const rotaciones = crearRotacionesPrueba(); rotaciones.escenario = escenario;
  if (!rotaciones.clima) throw new Error('Fixture climática ausente.');
  const modificado = escenario.lluvia_pct !== 0 || escenario.temp_delta !== 0;
  rotaciones.estrategias = rotaciones.estrategias.map((estrategia) => ({ ...estrategia, puntajes: { ...estrategia.puntajes, total: modificado ? 50 : 55 }, por_que: modificado ? 'Motivo controlado del escenario simulado.' : 'Motivo controlado del original.' }));
  return { rotaciones, calendario: {
    celdas: Array.from({ length: 12 }, (_, indice) => ({ cultivo_id: 'papa', mes: indice + 1, estado: modificado && indice === 0 ? 'no_recomendado' : 'recomendado', motivo: modificado ? 'Motivo simulado de prueba: lluvia y temperatura modificadas.' : 'Motivo original de prueba: condiciones de referencia.' })),
    cultivos: [{ id: 'papa', nombre: 'Papa', altitud_min: 2700, altitud_max: 3800 }], terreno: { altitud_m: 3000, tiene_riego: false, area_ha: 1 },
    escenario, clima: rotaciones.clima, aviso: 'Fixture referencial, no validada agronómicamente.',
  } };
}
