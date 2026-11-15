import type { Prisma } from '../generated/prisma/client.js';
import { DIAS_POR_MES, IDS_CULTIVOS_NUEVOS, obtenerPerfil } from './perfilesAgronomicos.js';

type FilaCultivo = [id: string, nombre: string, familia: string, altitudMin: number, altitudMax: number,
  cicloMeses: number, mesesSiembra: number[], lluviaMinMensualMm: number, demandaAgua: number,
  toleranciaHelada: number, toleranciaSequia: number, fijaNitrogeno: boolean,
  aporteMateriaOrganica: number, proteccionErosion: number, valorForraje: number, valorMercado: number];

// Transcripción de la sección 10. Valores referenciales pendientes de validación local.
const filas: FilaCultivo[] = [
  ['papa', 'Papa', 'Solanaceae', 2700, 3800, 6, [10, 11, 12, 1], 60, 4, 2, 2, false, 2, 2, 1, 5],
  ['haba', 'Haba', 'Fabaceae', 2500, 3600, 6, [10, 11, 12], 50, 3, 3, 2, true, 3, 3, 3, 4],
  ['chocho', 'Chocho', 'Fabaceae', 2800, 3500, 7, [11, 12, 1], 35, 2, 3, 4, true, 4, 3, 2, 4],
  ['quinua', 'Quinua', 'Amaranthaceae', 2500, 3800, 6, [11, 12, 1], 35, 2, 4, 4, false, 3, 3, 2, 4],
  ['cebada', 'Cebada', 'Poaceae', 2800, 3600, 5, [12, 1, 2], 40, 2, 3, 3, false, 3, 4, 4, 3],
  ['maiz', 'Maíz suave', 'Poaceae', 2200, 3000, 8, [9, 10, 11], 70, 4, 1, 2, false, 3, 3, 4, 4],
  ['avena', 'Avena forrajera', 'Poaceae', 2800, 3800, 5, [10, 11, 12, 1, 2], 40, 2, 4, 3, false, 4, 5, 5, 2],
  ['brocoli', 'Brócoli', 'Brassicaceae', 2600, 3200, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 80, 5, 2, 1, false, 2, 2, 1, 5],
  ['oca', 'Oca', 'Oxalidaceae', 3000, 3900, 7, [10, 11, 12], 50, 3, 4, 2, false, 2, 2, 1, 2],
  ['vicia_avena', 'Vicia + avena (abono verde)', 'Fabaceae/Poaceae', 2700, 3800, 4, [10, 11, 12, 1, 2], 40, 2, 4, 3, true, 5, 5, 5, 1],
];

export const cultivosReferenciales: Prisma.CultivoCreateInput[] = filas.map(([id, nombre, familia, altitudMin, altitudMax, cicloMeses,
  mesesSiembra, lluviaMinMensualMm, demandaAgua, toleranciaHelada, toleranciaSequia, fijaNitrogeno,
  aporteMateriaOrganica, proteccionErosion, valorForraje, valorMercado]) => ({
  id, nombre, familia, altitudMin, altitudMax, cicloMeses, mesesSiembra, lluviaMinMensualMm, demandaAgua,
  toleranciaHelada, toleranciaSequia, fijaNitrogeno, aporteMateriaOrganica, proteccionErosion, valorForraje, valorMercado, descripcion: null,
}));

// Ampliación solicitada por el cliente (15-11-2026). Solo se guardan valores con fuente o derivados de ella:
// familia botánica, ciclo en meses (máximo documentado / 30,44 días), ventana anual cuando INIAP (2011) indica que la
// hortaliza puede sembrarse todo el año, rango de altitud documentado (melloco) y fijación de nitrógeno de la leguminosa.
// Los índices de rotación (agua, helada, sequía, materia orgánica, erosión, forraje y mercado) no tienen fuente: quedan
// en NULL y el comparador de rotaciones los muestra como no determinados. No se inventan puntuaciones.
export const cultivosAmpliados: Prisma.CultivoCreateInput[] = IDS_CULTIVOS_NUEVOS.map((id) => {
  const perfil = obtenerPerfil(id);
  if (!perfil) throw new Error(`Falta el perfil agronómico de ${id}.`);
  return {
    id, nombre: perfil.nombre, familia: perfil.familia_botanica,
    altitudMin: perfil.altitud_documentada_m?.min ?? null, altitudMax: perfil.altitud_documentada_m?.max ?? null,
    cicloMeses: Math.min(12, Math.ceil(perfil.ciclo_dias.max / DIAS_POR_MES)),
    mesesSiembra: perfil.siembra_todo_el_anio_iniap ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [],
    lluviaMinMensualMm: null, demandaAgua: null, toleranciaHelada: null, toleranciaSequia: null,
    fijaNitrogeno: perfil.familia_botanica === 'Fabaceae',
    aporteMateriaOrganica: null, proteccionErosion: null, valorForraje: null, valorMercado: null,
    descripcion: `${perfil.nombre_cientifico}. Parámetros agronómicos con fuente en el perfil del calendario; índices de rotación sin fuente verificada (no determinados).`,
  };
});

/** Catálogo completo autorizado: los 10 cultivos originales y los 19 de la ampliación. */
export const catalogoCompleto: Prisma.CultivoCreateInput[] = [...cultivosReferenciales, ...cultivosAmpliados];

export async function cargarCultivos(base: Pick<Prisma.TransactionClient, 'cultivo'>): Promise<void> {
  for (const cultivo of catalogoCompleto) {
    await base.cultivo.upsert({ where: { id: cultivo.id }, create: cultivo, update: cultivo });
  }
}
