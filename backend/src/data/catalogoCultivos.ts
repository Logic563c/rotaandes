import type { Prisma } from '../generated/prisma/client.js';

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

export async function cargarCultivos(base: Pick<Prisma.TransactionClient, 'cultivo'>): Promise<void> {
  for (const cultivo of cultivosReferenciales) {
    await base.cultivo.upsert({ where: { id: cultivo.id }, create: cultivo, update: cultivo });
  }
}
