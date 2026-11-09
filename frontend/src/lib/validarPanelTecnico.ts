import { z } from 'zod';
const numero = z.number().finite();
const helada = z.strictObject({ estado: z.enum(['posible_helada', 'sin_alertas', 'desconocido']),
  alertas: z.array(z.strictObject({ fecha: z.iso.date(), tipo: z.literal('helada'), mensaje: z.string().min(1), t_min: numero.min(-100).max(70) })).max(7),
  fuente: z.literal('Open-Meteo'), actualizado_en: z.iso.datetime().nullable(), vigente_hasta: z.iso.datetime().nullable(), dias_evaluados: numero.int().min(0).max(7), umbral_helada_c: numero.min(-10).max(10), motivo: z.string().min(1),
}).refine((h) => h.alertas.every((a) => a.t_min <= h.umbral_helada_c) && h.alertas.length <= h.dias_evaluados
  && (h.estado === 'posible_helada' ? h.alertas.length > 0 : h.alertas.length === 0)
  && (h.estado !== 'sin_alertas' || h.dias_evaluados === 7)
  && (h.vigente_hasta === null ? h.actualizado_en === null && h.dias_evaluados === 0 && h.estado === 'desconocido' : h.actualizado_en !== null && h.vigente_hasta > h.actualizado_en));
export const esquemaPanelTecnico = z.strictObject({ terrenos: z.array(z.strictObject({
  id: z.uuid(), nombre: z.string().min(1), latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180), altitud_m: numero.int().nullable(), area_ha: numero.positive().max(999999.99).nullable(), tiene_riego: z.boolean().nullable(), tipo_suelo: z.enum(['franco', 'arenoso', 'arcilloso', 'no_se']).nullable(),
  parroquia_perfil: z.string().max(100).nullable(), ultima_siembra: z.strictObject({ id: z.uuid(), cultivo_id: z.string().min(1), cultivo_nombre: z.string().min(1), fecha_siembra: z.iso.date(), fecha_cosecha: z.iso.date().nullable() }).nullable(), helada,
})).max(50), paginacion: z.strictObject({ pagina: numero.int().min(1).max(99999), tamano: z.literal(50), total: numero.int().nonnegative(), paginas: numero.int().nonnegative() }),
  parroquias: z.array(z.string().min(1).max(100)), consultado_en: z.iso.datetime(), metodologia: z.string().min(1), aviso: z.string().min(1),
}).refine((d) => d.paginacion.paginas === Math.ceil(d.paginacion.total / 50) && d.terrenos.length === Math.max(0, Math.min(50, d.paginacion.total - (d.paginacion.pagina - 1) * 50))
  && new Set(d.terrenos.map((t) => t.id)).size === d.terrenos.length);
