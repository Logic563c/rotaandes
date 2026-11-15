// Comparación verificable del calendario antes (v1, commit 69f925b) y después (v2), con las mismas condiciones:
// respuestas NASA POWER archivadas en el repositorio (controladas, verificadas por SHA-256) y terrenos ficticios.
// No consulta servicios externos ni bases de datos. Uso: npx tsx scripts/compararCalendario.ts [--json]
import latacunga from '../src/data/clima/latacunga.json' with { type: 'json' };
import paramo from '../src/data/clima/paramo.json' with { type: 'json' };
import { construirMensual, procesarRespuestaNasa } from '../src/services/nasaPower.js';
import { calcularCalendarioV1 } from '../src/services/calendarioV1.js';
import { calcularCalendario, IDS_CULTIVOS_CALENDARIO } from '../src/services/calendario.js';
import type { EstadoCalendario } from '../src/services/calendario.js';
import { catalogoCompleto, cultivosReferenciales } from '../src/data/catalogoCultivos.js';
import { IDS_CULTIVOS_ORIGINALES } from '../src/data/perfilesAgronomicos.js';

const ESTADOS: EstadoCalendario[] = ['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado'];
const celdaLatacunga = procesarRespuestaNasa(latacunga, -0.93, -78.62, '2026-11-08T03:53:14.301Z');
const celdaParamo = procesarRespuestaNasa(paramo, -0.75, -78.55, '2026-11-08T03:56:43.527Z');
// Terrenos ficticios representativos (no son parcelas reales). Latacunga, Pujilí, Saquisilí y Salcedo comparten la
// misma celda NASA; las altitudes cubren valle, zona media, zona alta y páramo.
export const ESCENARIOS_TERRENO = [
  { nombre: 'Valle (Latacunga, ficticio)', altitudM: 2750, celda: celdaLatacunga },
  { nombre: 'Zona media (Salcedo, ficticio)', altitudM: 2900, celda: celdaLatacunga },
  { nombre: 'Zona media alta (Pujilí, ficticio)', altitudM: 3150, celda: celdaLatacunga },
  { nombre: 'Zona alta (Saquisilí, ficticio)', altitudM: 3400, celda: celdaLatacunga },
  { nombre: 'Páramo (celda NASA de páramo, ficticio)', altitudM: 3650, celda: celdaParamo },
] as const;

type Conteo = Record<EstadoCalendario, number>;
const vacio = (): Conteo => ({ recomendado: 0, posible_con_cuidado: 0, no_recomendado: 0, no_determinado: 0 });
function contar(celdas: { estado: EstadoCalendario }[]): Conteo { const conteo = vacio(); for (const celda of celdas) conteo[celda.estado]++; return conteo; }
function sumar(total: Conteo, parcial: Conteo): void { for (const estado of ESTADOS) total[estado] += parcial[estado]; }

export function compararCalendarios() {
  const filas = []; const totales = { antes: vacio(), despues_originales: vacio(), despues_todos: vacio() };
  const razones: Record<string, number> = {};
  for (const terreno of ESCENARIOS_TERRENO) for (const tieneRiego of [false, true]) {
    const mensual = construirMensual(terreno.celda, terreno.altitudM);
    const contexto = { altitudM: terreno.altitudM, tieneRiego, areaHa: 1 };
    const antes = calcularCalendarioV1({ terreno: contexto, cultivos: cultivosReferenciales, mensual });
    const despues = calcularCalendario({ terreno: contexto, cultivos: catalogoCompleto, mensual, elevacionCeldaM: terreno.celda.elevacion_celda_m ?? null });
    const despuesOriginales = despues.filter((celda) => (IDS_CULTIVOS_ORIGINALES as readonly string[]).includes(celda.cultivo_id));
    for (const celda of despues) {
      const motivo = celda.resumen.split(': ').slice(1).join(': ').replace(/\.$/, '');
      if (celda.estado !== 'recomendado') for (const razon of motivo.split('; ')) razones[`${celda.estado} · ${razon}`] = (razones[`${celda.estado} · ${razon}`] ?? 0) + 1;
    }
    const fila = { terreno: terreno.nombre, altitud_m: terreno.altitudM, elevacion_celda_m: terreno.celda.elevacion_celda_m ?? null, riego: tieneRiego,
      antes: contar(antes), despues_originales: contar(despuesOriginales), despues_todos: contar(despues),
      cultivos_con_algun_mes_viable: [...new Set(despues.filter((celda) => celda.estado === 'recomendado' || celda.estado === 'posible_con_cuidado').map((celda) => celda.cultivo_id))].length };
    sumar(totales.antes, fila.antes); sumar(totales.despues_originales, fila.despues_originales); sumar(totales.despues_todos, fila.despues_todos);
    filas.push(fila);
  }
  return { cultivos_antes: cultivosReferenciales.length, cultivos_despues: IDS_CULTIVOS_CALENDARIO.length, filas, totales,
    razones: Object.entries(razones).sort((a, b) => b[1] - a[1]).map(([razon, celdas]) => ({ razon, celdas })) };
}

if (process.argv[1]?.endsWith('compararCalendario.ts')) {
  const resultado = compararCalendarios();
  if (process.argv.includes('--json')) console.info(JSON.stringify(resultado, null, 2));
  else {
    const corto = (c: Conteo) => `R ${c.recomendado} · C ${c.posible_con_cuidado} · N ${c.no_recomendado} · ? ${c.no_determinado}`;
    for (const fila of resultado.filas) console.info(`${fila.terreno.padEnd(42)} ${String(fila.altitud_m).padStart(4)} m riego=${fila.riego ? 'sí' : 'no'} | antes ${corto(fila.antes)} | después (10) ${corto(fila.despues_originales)} | después (29) ${corto(fila.despues_todos)} | cultivos viables ${fila.cultivos_con_algun_mes_viable}`);
    console.info('TOTALES', JSON.stringify(resultado.totales));
    for (const razon of resultado.razones.slice(0, 25)) console.info(String(razon.celdas).padStart(5), razon.razon);
  }
}
