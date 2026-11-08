import { cultivosReferenciales } from '../../src/data/catalogoCultivos.js';
import { plantillasReferenciales } from '../../src/data/catalogoPlantillas.js';
import { construirMensual } from '../../src/services/nasaPower.js';
import { crearBasePrueba } from './nasaPruebas.js';

// Condiciones sintéticas explícitas para comprobar fórmulas; no son mediciones nuevas.
export function crearEntradaRotaciones() {
  return { terreno: { altitudM: 3000 as number | null, tieneRiego: false as boolean | null, areaHa: 1 }, prioridades: { agua: 3 as number | null, suelo: 3 as number | null, ingresos: 3 as number | null },
    cultivos: structuredClone(cultivosReferenciales), plantillas: structuredClone(plantillasReferenciales),
    historial: [{ id: 'siembra-1', cultivoId: 'papa', fechaSiembra: '2025-01-01', fechaCosecha: '2025-07-01' as string | null }],
    mensual: construirMensual(crearBasePrueba(), 3000).map((mes) => ({ ...mes, t_min: 10 as number | null, t_med: 15, t_max: 20 as number | null, lluvia_mm: 100 as number | null, riesgo_helada: 'bajo' as 'bajo' | 'medio' | 'alto' | null })),
    inicio: '2030-12-01', escenario: { lluviaPct: 0, tempDelta: 0 } };
}
