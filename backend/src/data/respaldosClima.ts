import latacunga from './clima/latacunga.json' with { type: 'json' };
import pujili from './clima/pujili.json' with { type: 'json' };
import saquisili from './clima/saquisili.json' with { type: 'json' };
import salcedo from './clima/salcedo.json' with { type: 'json' };
import paramo from './clima/paramo.json' with { type: 'json' };
import procedencia from './clima/procedencia.json' with { type: 'json' };
import { procesarRespuestaNasa } from '../services/nasaPower.js';
import type { ClimatologiaBase } from '../services/nasaPower.js';

const respuestas: Record<string, unknown> = { latacunga, pujili, saquisili, salcedo, paramo };
export function buscarRespaldoClima(latitud: number, longitud: number): ClimatologiaBase | null {
  const registro = procedencia.find((punto) => punto.latitud === latitud && punto.longitud === longitud);
  if (!registro) return null;
  try { return procesarRespuestaNasa(respuestas[registro.lugar], latitud, longitud, registro.consultado_en); }
  catch { return null; }
}
