import type { Prisma } from '../generated/prisma/client.js';

// Sección 10 de PROYECTO.md. Vicia + avena conserva el ID combinado del catálogo.
export const plantillasReferenciales = [
  { id: 'papa-haba-cebada', nombre: 'Papa → Haba → Cebada', secuencia: ['papa', 'haba', 'cebada'] },
  { id: 'papa-chocho-quinua', nombre: 'Papa → Chocho → Quinua', secuencia: ['papa', 'chocho', 'quinua'] },
  { id: 'papa-avena-haba', nombre: 'Papa → Avena → Haba', secuencia: ['papa', 'avena', 'haba'] },
  { id: 'papa-vicia-papa', nombre: 'Papa → Vicia + avena → Papa', secuencia: ['papa', 'vicia_avena', 'papa'] },
  { id: 'maiz-haba-cebada', nombre: 'Maíz suave → Haba → Cebada', secuencia: ['maiz', 'haba', 'cebada'] },
  { id: 'brocoli-haba-avena', nombre: 'Brócoli → Haba → Avena', secuencia: ['brocoli', 'haba', 'avena'] },
  { id: 'oca-haba-cebada', nombre: 'Oca → Haba → Cebada', secuencia: ['oca', 'haba', 'cebada'] },
  { id: 'quinua-chocho-cebada', nombre: 'Quinua → Chocho → Cebada', secuencia: ['quinua', 'chocho', 'cebada'] },
] satisfies Prisma.PlantillaRotacionCreateInput[];

export async function cargarPlantillas(base: Pick<Prisma.TransactionClient, 'plantillaRotacion'>): Promise<void> {
  for (const plantilla of plantillasReferenciales) {
    const existente = await base.plantillaRotacion.findUnique({ where: { id: plantilla.id } });
    if (existente && (existente.nombre !== plantilla.nombre || existente.secuencia.join('|') !== plantilla.secuencia.join('|'))) throw new Error('Una plantilla existente difiere del catálogo original; revisa su definición antes de reemplazarla.');
    await base.plantillaRotacion.upsert({ where: { id: plantilla.id }, create: { ...plantilla, descripcion: null }, update: {} });
  }
}
