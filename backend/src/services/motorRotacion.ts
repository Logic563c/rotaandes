import { z } from 'zod';
import { aplicarEscenarioCalendario, calcularCalendario, esquemaEscenarioCalendario, IDS_CULTIVOS_CALENDARIO } from './calendario.js';
import type { EstadoCalendario, MesCalendario } from './calendario.js';
import { plantillasReferenciales } from '../data/catalogoPlantillas.js';

export class ErrorRotaciones extends Error { constructor() { super('No se pueden evaluar las rotaciones con estos datos. Revisa catálogo, historial y plantillas.'); } }
const numero = z.number().finite();
const escala = numero.int().min(1).max(5).nullable().default(null);
const cultivo = z.object({ id: z.enum(IDS_CULTIVOS_CALENDARIO), nombre: z.string().min(1), familia: z.string().min(1).nullable().default(null),
  altitudMin: numero.int().nullable().default(null), altitudMax: numero.int().nullable().default(null), cicloMeses: numero.int().min(1).max(36).nullable().default(null),
  mesesSiembra: z.array(numero.int().min(1).max(12)).max(12).refine((meses) => new Set(meses).size === meses.length).nullable().default(null),
  lluviaMinMensualMm: numero.min(0).nullable().default(null), toleranciaHelada: escala, toleranciaSequia: escala, demandaAgua: escala,
  fijaNitrogeno: z.boolean().nullable().default(null), aporteMateriaOrganica: escala, proteccionErosion: escala, valorMercado: escala,
}).refine((valor) => valor.altitudMin === null || valor.altitudMax === null || valor.altitudMin <= valor.altitudMax);
const mes = z.object({ mes: numero.int().min(1).max(12), t_min: numero.min(-100).max(70).nullable(), t_max: numero.min(-100).max(70).nullable(), t_med: numero.min(-100).max(70).nullable().default(null),
  lluvia_mm: numero.min(0).max(62000).nullable(), riesgo_helada: z.enum(['alto', 'medio', 'bajo']).nullable() }).refine((valor) => valor.t_min === null || valor.t_max === null || valor.t_min <= valor.t_max);
const fecha = z.iso.date().refine((valor) => !valor.startsWith('0000'));
const esquemaEntrada = z.object({
  terreno: z.object({ altitudM: numero.int().min(-12000).max(9000).nullable(), tieneRiego: z.boolean().nullable(), areaHa: numero.positive().max(999999.99).nullable() }),
  prioridades: z.object({ agua: escala, suelo: escala, ingresos: escala }),
  cultivos: z.array(cultivo).max(IDS_CULTIVOS_CALENDARIO.length).refine((valores) => new Set(valores.map((valor) => valor.id)).size === valores.length),
  plantillas: z.array(z.object({ id: z.string(), nombre: z.string().min(1), secuencia: z.array(z.string()).length(3) })).max(8).refine((valores) => new Set(valores.map((valor) => valor.id)).size === valores.length),
  historial: z.array(z.object({ id: z.string().min(1), cultivoId: z.string().min(1), fechaSiembra: fecha, fechaCosecha: fecha.nullable() }).refine((valor) => valor.fechaCosecha === null || valor.fechaCosecha >= valor.fechaSiembra)).max(10000),
  mensual: z.array(mes).max(12).refine((valores) => new Set(valores.map((valor) => valor.mes)).size === valores.length),
  inicio: fecha.refine((valor) => valor.endsWith('-01')), escenario: esquemaEscenarioCalendario.default({ lluviaPct: 0, tempDelta: 0 }),
  elevacionCeldaM: numero.min(-500).max(9000).nullable().default(null),
});
type CultivoRotacion = z.infer<typeof cultivo>;
export interface PasoRotacion { cultivo_id: string; nombre: string; inicio_estimado: string | null; fin_estimado: string | null; ciclo_meses: number | null; espera_meses: number | null; estado: EstadoCalendario; motivo: string }
export interface EstrategiaRotacion {
  id: string | null; nombre: string; es_actual: boolean; secuencia: string[]; planificacion: PasoRotacion[]; estado: EstadoCalendario;
  puntajes: { agua: number | null; suelo: number | null; riesgo: number | null; ingresos: number | null; total: number | null };
  por_que: string; evidencia: string[]; beneficios: string[]; vacios_informacion: string[]; riesgos: string[]; aviso: string;
}
const AVISO = 'Comparación heurística referencial, sin validación agronómica local. No estima rendimientos, ahorro de agua ni dinero. Confírmala con un técnico agrícola o con tu experiencia. No es un pronóstico ni modifica tus siembras.';
const nulos = () => ({ agua: null, suelo: null, riesgo: null, ingresos: null, total: null });
const normalizar = (valor: number) => 25 * (valor - 1);
const promedio = (valores: (number | null)[]): number | null => valores.length && valores.every((valor) => valor !== null) ? valores.reduce<number>((suma, valor) => suma + (valor ?? 0), 0) / valores.length : null;
const redondear = (valor: number | null) => valor === null ? null : Math.round(valor * 100) / 100;

export function sumarMesesRotacion(inicio: string, cantidad: number): string | null {
  const absoluto = Number(inicio.slice(0, 4)) * 12 + Number(inicio.slice(5, 7)) - 1 + cantidad;
  const anio = Math.floor(absoluto / 12);
  return anio > 9999 || anio < 1 ? null : `${String(anio).padStart(4, '0')}-${String(absoluto % 12 + 1).padStart(2, '0')}-01`;
}
export function obtenerInicioRotacion(ahora: Date, siembra: string | null, cosecha: string | null): string | null {
  const hoy = new Date(ahora.getTime() - 5 * 3600000).toISOString().slice(0, 10);
  const ultima = [hoy, siembra ?? '', cosecha ?? ''].sort().at(-1) ?? hoy;
  return sumarMesesRotacion(`${ultima.slice(0, 7)}-01`, 1);
}
function coberturaAgua(cultivo: CultivoRotacion, clima: MesCalendario | undefined, riego: boolean | null): number | null {
  if (riego === true) return 1;
  if (cultivo.lluviaMinMensualMm === null) return null;
  if (cultivo.lluviaMinMensualMm === 0) return 1;
  const lluvia = clima?.lluvia_mm;
  if (lluvia == null) return null;
  const proporcion = Math.min(1, lluvia / cultivo.lluviaMinMensualMm);
  return proporcion >= 1 || riego === false ? proporcion : null;
}
function familiasCoinciden(primera: string, segunda: string): boolean { return primera.split('/').some((familia) => segunda.split('/').includes(familia)); }

export function compararRotaciones(entrada: unknown) {
  const lectura = esquemaEntrada.safeParse(entrada); if (!lectura.success) throw new ErrorRotaciones();
  const datos = lectura.data;
  for (const plantilla of datos.plantillas) {
    const original = plantillasReferenciales.find((valor) => valor.id === plantilla.id);
    if (!original || plantilla.secuencia.join('|') !== original.secuencia.join('|') || plantilla.nombre !== original.nombre) throw new ErrorRotaciones();
  }
  const catalogo = new Map<string, CultivoRotacion>(datos.cultivos.map((valor) => [valor.id, valor]));
  const historial = [...datos.historial].sort((a, b) => a.fechaSiembra.localeCompare(b.fechaSiembra) || a.id.localeCompare(b.id));
  const ultimas = historial.slice(-3); const patronActual = ultimas.map((valor) => valor.cultivoId);
  while (patronActual.length > 0 && patronActual.length < 3) { const ultimo = patronActual.at(-1); if (ultimo) patronActual.push(ultimo); }
  const mensual = aplicarEscenarioCalendario(datos.mensual, datos.terreno.altitudM, datos.escenario);
  const meses = new Map(mensual.map((valor) => [valor.mes, valor]));
  // El calendario es la única autoridad de ventanas/altitud/heladas sensibles/brócoli.
  // Todos los cultivos con ciclo y ventana pasan al calendario; los datos ausentes se resuelven allí como no determinados.
  const evaluables = datos.cultivos.filter((valor) => valor.cicloMeses !== null && valor.mesesSiembra !== null);
  const calendario = evaluables.length ? calcularCalendario({ terreno: datos.terreno, cultivos: evaluables, mensual: datos.mensual, escenario: datos.escenario, elevacionCeldaM: datos.elevacionCeldaM }) : [];
  const vaciosBase = ['No hay análisis de suelo, caudal de riego ni validación agronómica local. Climatología regional, sin observación del microclima.',
    'El horizonte es hipotético: ciclos del catálogo, no cosechas futuras observadas; no se confirma disponibilidad de la parcela.'];
  if (ultimas.length < 3) vaciosBase.push(ultimas.length ? `Solo hay ${ultimas.length} siembras: se repite el último cultivo para completar el patrón actual; no se inventan registros históricos.` : 'Historial vacío: no se conoce la estrategia actual ni su cultivo predecesor.');
  if (historial.some((valor) => valor.fechaCosecha === null)) vaciosBase.push('Hay cosechas sin registrar; no se asume que el terreno esté desocupado.');
  if (!datos.plantillas.length) vaciosBase.push('No hay plantillas originales cargadas; la consulta no ejecuta semillas.');
  if (datos.prioridades.agua === null || datos.prioridades.suelo === null || datos.prioridades.ingresos === null) vaciosBase.push('Faltan prioridades del propietario: no se calcula el total ni se determina un ranking.');

  function evaluar(id: string, nombre: string, secuencia: string[], esActual: boolean): { estrategia: EstrategiaRotacion; total: number | null } {
    let siguiente: string | null = datos.inicio;
    const pasos: PasoRotacion[] = [];
    const vacios = [...vaciosBase]; const riesgos: string[] = [];
    for (const cultivoId of secuencia) {
      const valor = catalogo.get(cultivoId);
      let elegido: { fecha: string; espera: number; celda: typeof calendario[number] } | undefined;
      const celdas = calendario.filter((celda) => celda.cultivo_id === cultivoId);
      // Primero el mes recomendado más cercano (12 meses); solo si no existe, el más cercano con precaución.
      if (siguiente && valor?.cicloMeses) for (const aceptado of ['recomendado', 'posible_con_cuidado'] as const) {
        for (let espera = 0; espera < 12 && !elegido; espera++) {
          const candidata = sumarMesesRotacion(siguiente, espera); if (!candidata) break;
          const celda = celdas.find((valorCelda) => valorCelda.mes === Number(candidata.slice(5, 7)));
          if (celda?.estado === aceptado) elegido = { fecha: candidata, espera, celda };
        }
        if (elegido) break;
      }
      const bloqueado = celdas.length === 12 && celdas.every((celda) => celda.estado === 'no_recomendado');
      const fin = elegido && valor?.cicloMeses ? sumarMesesRotacion(elegido.fecha, valor.cicloMeses) : null;
      const motivo = elegido?.celda.motivo ?? (bloqueado ? `${valor?.nombre ?? cultivoId}: todos los meses están excluidos por el calendario en estas condiciones. ${celdas[0]?.resumen ?? ''}`.trim() : `${valor?.nombre ?? cultivoId}: faltan datos verificables o el paso anterior no puede programarse; no se asignan fechas.`);
      pasos.push({ cultivo_id: cultivoId, nombre: valor?.nombre ?? cultivoId, inicio_estimado: elegido?.fecha ?? null, fin_estimado: fin, ciclo_meses: valor?.cicloMeses ?? null,
        espera_meses: elegido?.espera ?? null, estado: elegido?.celda.estado ?? (bloqueado ? 'no_recomendado' : 'no_determinado'), motivo });
      siguiente = fin;
      if (!elegido || !fin) vacios.push(motivo);
      if (elegido?.celda.estado === 'posible_con_cuidado') riesgos.push(`${valor?.nombre}: calendario con precaución en ${elegido.fecha}; revisar agua y heladas según su explicación.`);
    }
    const valores = secuencia.map((cultivoId) => catalogo.get(cultivoId));
    const anterior = catalogo.get(historial.at(-1)?.cultivoId ?? '');
    const familias = [...(anterior ? [anterior] : []), ...valores];
    const repeticiones = familias.slice(1).map((valor, indice) => valor?.familia && familias[indice]?.familia ? Number(familiasCoinciden(familias[indice]?.familia ?? '', valor.familia)) : null);
    const proporcionRepetida = promedio(repeticiones);
    const sueloBase = promedio(valores.map((valor) => valor && valor.fijaNitrogeno !== null && valor.aporteMateriaOrganica !== null && valor.proteccionErosion !== null
      ? ((valor.fijaNitrogeno ? 100 : 0) + normalizar(valor.aporteMateriaOrganica) + normalizar(valor.proteccionErosion)) / 3 : null));
    const suelo = sueloBase === null || proporcionRepetida === null ? null : Math.max(0, sueloBase - 25 * proporcionRepetida);
    if (proporcionRepetida !== null && proporcionRepetida > 0) riesgos.push('Hay familias compartidas en transiciones consecutivas, incluido el predecesor si se conoce; penalización heurística, no diagnóstico de plagas.');
    const ingresos = promedio(valores.map((valor) => valor?.valorMercado == null ? null : normalizar(valor.valorMercado)));
    const aguas: (number | null)[] = []; const protecciones: (number | null)[] = [];
    for (const [indice, valor] of valores.entries()) {
      const paso = pasos[indice];
      if (!valor?.cicloMeses || !paso?.inicio_estimado) { aguas.push(null); protecciones.push(null); continue; }
      const coberturas: (number | null)[] = []; const riesgosMensuales: (number | null)[] = [];
      for (let desplazamiento = 0; desplazamiento < valor.cicloMeses; desplazamiento++) {
        const numeroMes = (Number(paso.inicio_estimado.slice(5, 7)) - 1 + desplazamiento) % 12 + 1;
        const clima = meses.get(numeroMes); const agua = coberturaAgua(valor, clima, datos.terreno.tieneRiego); coberturas.push(agua);
        const severidad = clima?.riesgo_helada === 'alto' ? 1 : clima?.riesgo_helada === 'medio' ? 0.5 : clima?.riesgo_helada === 'bajo' ? 0 : null;
        riesgosMensuales.push(agua === null || severidad === null || valor.toleranciaHelada === null || valor.toleranciaSequia === null ? null
          : (100 * (1 - severidad * (1 - normalizar(valor.toleranciaHelada) / 100)) + 100 * (1 - (1 - agua) * (1 - normalizar(valor.toleranciaSequia) / 100))) / 2);
      }
      const cobertura = promedio(coberturas);
      aguas.push(cobertura === null || valor.demandaAgua === null || valor.toleranciaSequia === null ? null : (100 - normalizar(valor.demandaAgua) + normalizar(valor.toleranciaSequia) + 100 * cobertura) / 3);
      protecciones.push(promedio(riesgosMensuales));
    }
    const agua = promedio(aguas); const riesgo = promedio(protecciones);
    const { agua: pesoAgua, suelo: pesoSuelo, ingresos: pesoIngresos } = datos.prioridades;
    const completo = secuencia.length === 3 && pasos.every((paso) => paso.inicio_estimado !== null && paso.fin_estimado !== null);
    const total = completo && agua !== null && suelo !== null && riesgo !== null && ingresos !== null && pesoAgua !== null && pesoSuelo !== null && pesoIngresos !== null
      ? (agua * pesoAgua + suelo * pesoSuelo + riesgo * 3 + ingresos * pesoIngresos) / (pesoAgua + pesoSuelo + pesoIngresos + 3) : null;
    if (total === null) vacios.push('Información insuficiente para un puntaje total y ranking comparables; los indicadores ausentes no se convierten en cero.');
    const estado: EstadoCalendario = pasos.some((paso) => paso.estado === 'no_recomendado') ? 'no_recomendado' : total === null ? 'no_determinado' : pasos.some((paso) => paso.estado === 'posible_con_cuidado') ? 'posible_con_cuidado' : 'recomendado';
    return { total, estrategia: { id, nombre, es_actual: esActual, secuencia, planificacion: pasos, estado,
      puntajes: { agua: redondear(agua), suelo: redondear(suelo), riesgo: redondear(riesgo), ingresos: redondear(ingresos), total: redondear(total) },
      por_que: esActual ? 'Patrón de las últimas tres siembras en orden cronológico, evaluado hipotéticamente bajo las mismas condiciones iniciales que las alternativas; no reescribe el pasado.' : 'Plantilla original evaluada con calendario, clima y prioridades del propietario; selección por mayor total entre alternativas evaluables y compatibles.',
      evidencia: [`Altitud estimada: ${datos.terreno.altitudM ?? 'desconocida'} m. Riego: ${datos.terreno.tieneRiego === null ? 'desconocido' : datos.terreno.tieneRiego ? 'declarado' : 'no'}.`,
        `Calendario reutilizado: ${pasos.filter((paso) => paso.inicio_estimado !== null).length}/3 pasos programables desde ${datos.inicio}.`,
        ...pasos.filter((paso) => paso.inicio_estimado).map((paso) => `Lluvia climatológica NASA del mes ${Number(paso.inicio_estimado?.slice(5, 7))}: ${meses.get(Number(paso.inicio_estimado?.slice(5, 7)))?.lluvia_mm ?? 'sin dato'} mm/mes, aplicada al inicio hipotético ${paso.inicio_estimado} de ${paso.nombre}; no es un pronóstico para ese año.`),
        `Suelo: penalización ${proporcionRepetida === null ? 'no determinada' : redondear(25 * proporcionRepetida)} puntos por familias compartidas. Ingresos: índice de valor_mercado referencial, estimación, validar localmente; no dinero.`],
      beneficios: valores.filter((valor) => valor?.fijaNitrogeno).map((valor) => `${valor?.nombre}: atributo fija_nitrogeno del catálogo; sin cuantificar un aporte real al suelo.`),
      vacios_informacion: [...new Set(vacios)], riesgos, aviso: AVISO } };
  }
  const actual = evaluar('actual', 'Actual: patrón del historial', patronActual, true).estrategia;
  const candidatas = datos.plantillas.map((plantilla) => evaluar(plantilla.id, plantilla.nombre, plantilla.secuencia, false));
  const elegibles = candidatas.filter((valor) => valor.total !== null && valor.estrategia.estado !== 'no_recomendado' && valor.estrategia.secuencia.join('|') !== patronActual.join('|'))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0) || (a.estrategia.id ?? '').localeCompare(b.estrategia.id ?? '', 'en'));
  const sugeridas = elegibles.slice(0, 2).map((valor) => valor.estrategia);
  while (sugeridas.length < 2) sugeridas.push({ id: null, nombre: `Sugerida ${sugeridas.length + 1}: no determinada`, es_actual: false, secuencia: [], planificacion: [], estado: 'no_determinado', puntajes: nulos(),
    por_que: 'No existe otra plantilla original con un total verificable y sin exclusiones del calendario. No se inventa una alternativa ni un puntaje.', evidencia: [], beneficios: [], riesgos: [], vacios_informacion: [...vaciosBase, 'Revisa altitud, catálogo, clima, riego y prioridades.'], aviso: AVISO });
  return { estrategias: [actual, ...sugeridas], candidatas: candidatas.map((valor) => ({ id: valor.estrategia.id, estado: valor.estrategia.estado, total: valor.estrategia.puntajes.total })),
    inicio_comun: datos.inicio, escenario: { lluvia_pct: datos.escenario.lluviaPct, temp_delta: datos.escenario.tempDelta },
    metodologia: { version: 'heuristica_rotaciones_v1', peso_riesgo: 3, prioridades: datos.prioridades, aviso: AVISO }, aviso: AVISO };
}
