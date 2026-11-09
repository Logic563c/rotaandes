import { z } from 'zod';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { ObtenerBaseAgricola } from './datosAgricolas.js';
import type { ObtenerUsuarios } from './autenticacion.js';
import { validarEntrada } from './autenticacion.js';
import { ErrorHttp } from '../middleware/errores.js';
import { validarPronosticoVigente, calcularVigenciaPronostico, obtenerClavePronostico } from './pronostico.js';
import { generarAlertas, obtenerUmbralHelada } from './openMeteo.js';

export const TAMANO_PANEL_TECNICO = 50;
const consultaPanel = z.strictObject({
  parroquia: z.string().trim().max(100).refine((v) => Array.from(v).every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)).optional(),
  cultivo: z.string().max(50).regex(/^(?:[a-z][a-z0-9_]*|)$/).optional(),
  pagina: z.string().regex(/^[1-9]\d{0,4}$/).transform(Number).optional(),
});
export function validarFiltrosTecnico(entrada: unknown) { const datos = validarEntrada(consultaPanel, entrada); return { parroquia: datos.parroquia || null, cultivo: datos.cultivo || null, pagina: datos.pagina ?? 1 }; }
export type FiltrosTecnico = ReturnType<typeof validarFiltrosTecnico>;
export interface EstadoHeladaTecnico {
  estado: 'posible_helada' | 'sin_alertas' | 'desconocido';
  alertas: { fecha: string; tipo: 'helada'; mensaje: string; t_min: number }[];
  fuente: 'Open-Meteo'; actualizado_en: string | null; vigente_hasta: string | null;
  dias_evaluados: number; umbral_helada_c: number; motivo: string;
}
export function resumirHeladaTecnica(datos: unknown, fechaSql: Date | null, latitud: number, longitud: number, ahora = new Date(), umbralC = obtenerUmbralHelada()): EstadoHeladaTecnico {
  generarAlertas([], umbralC);
  const base = validarPronosticoVigente(datos, latitud, longitud, ahora);
  if (!base || fechaSql?.getTime() !== Date.parse(base.consultado_en)) return { estado: 'desconocido', alertas: [], fuente: 'Open-Meteo', actualizado_en: null, vigente_hasta: null, dias_evaluados: 0, umbral_helada_c: umbralC,
    motivo: 'No hay pronóstico vigente verificado en caché para este punto. Abre el detalle y consulta el pronóstico; desconocido no significa sin riesgo.' };
  const dias = base.dias.filter((d) => d.t_min !== null).length;
  const alertas = base.dias.flatMap((dia) => { const minima = dia.t_min; return minima === null ? [] : generarAlertas([dia], umbralC).map((alerta) => ({ ...alerta, t_min: minima })); });
  return { estado: alertas.length ? 'posible_helada' : dias === 7 ? 'sin_alertas' : 'desconocido', alertas, fuente: 'Open-Meteo', actualizado_en: base.consultado_en,
    vigente_hasta: new Date(calcularVigenciaPronostico(base)).toISOString(), dias_evaluados: dias, umbral_helada_c: umbralC,
    motivo: alertas.length ? 'Alerta preventiva basada en pronóstico; no confirma una helada. Revisa los días sin mínima cuando la cobertura sea incompleta.'
      : dias === 7 ? 'Ninguna mínima prevista entra en el umbral en estos siete días. No garantiza ausencia de heladas locales.' : 'Hay días sin mínima válida. No se puede concluir ausencia de riesgo.' };
}
export function crearServicioPanelTecnico(obtenerBase: ObtenerBaseAgricola, obtenerUsuarios: ObtenerUsuarios,
  obtenerCache: () => Pick<PrismaClient['climaCache'], 'findMany'>, reloj = () => new Date(), umbralC = obtenerUmbralHelada()) {
  generarAlertas([], umbralC);
  return async (filtros: FiltrosTecnico) => {
    const base = obtenerBase();
    if (filtros.cultivo && !await base.cultivo.findUnique({ where: { id: filtros.cultivo }, select: { id: true } })) throw new ErrorHttp(400, 'El cultivo seleccionado no pertenece al catálogo.');
    const where: Prisma.TerrenoWhereInput = { ...(filtros.parroquia && { usuario: { parroquia: { equals: filtros.parroquia, mode: 'insensitive' } } }), ...(filtros.cultivo && { siembras: { some: { cultivoId: filtros.cultivo } } }) };
    const [total, terrenos, parroquias] = await Promise.all([
      base.terreno.count({ where }),
      base.terreno.findMany({ where, orderBy: [{ nombre: 'asc' }, { id: 'asc' }], skip: (filtros.pagina - 1) * TAMANO_PANEL_TECNICO, take: TAMANO_PANEL_TECNICO,
        select: { id: true, nombre: true, latitud: true, longitud: true, altitudM: true, areaHa: true, tieneRiego: true, tipoSuelo: true, usuario: { select: { parroquia: true } },
          siembras: { take: 1, orderBy: [{ fechaSiembra: 'desc' }, { creadoEn: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
            select: { id: true, cultivoId: true, fechaSiembra: true, fechaCosecha: true, cultivo: { select: { nombre: true } } } } } }),
      obtenerUsuarios().findMany({ where: { terrenos: { some: {} }, parroquia: { not: null } }, distinct: ['parroquia'], select: { parroquia: true }, orderBy: { parroquia: 'asc' } }),
    ]);
    const claves = [...new Set(terrenos.map((t) => obtenerClavePronostico(t.latitud, t.longitud)))];
    const filas = claves.length ? await obtenerCache().findMany({ where: { clave: { in: claves } }, select: { clave: true, datos: true, actualizadoEn: true } }) : [];
    const cache = new Map(filas.map((fila) => [fila.clave, fila]));
    const ahora = reloj();
    return { terrenos: terrenos.map((t) => {
      const ultima = t.siembras[0]; const guardado = cache.get(obtenerClavePronostico(t.latitud, t.longitud));
      return { id: t.id, nombre: t.nombre, latitud: t.latitud, longitud: t.longitud, altitud_m: t.altitudM, area_ha: t.areaHa?.toNumber() ?? null, tiene_riego: t.tieneRiego, tipo_suelo: t.tipoSuelo,
        parroquia_perfil: t.usuario.parroquia, ultima_siembra: ultima ? { id: ultima.id, cultivo_id: ultima.cultivoId, cultivo_nombre: ultima.cultivo.nombre, fecha_siembra: ultima.fechaSiembra.toISOString().slice(0, 10), fecha_cosecha: ultima.fechaCosecha?.toISOString().slice(0, 10) ?? null } : null,
        helada: resumirHeladaTecnica(guardado?.datos, guardado?.actualizadoEn ?? null, t.latitud, t.longitud, ahora, umbralC) };
    }), paginacion: { pagina: filtros.pagina, tamano: TAMANO_PANEL_TECNICO, total, paginas: Math.ceil(total / TAMANO_PANEL_TECNICO) },
    parroquias: parroquias.flatMap((u) => u.parroquia ? [u.parroquia] : []), consultado_en: ahora.toISOString(),
    metodologia: 'Parroquia del perfil del propietario, sin inferencia geográfica. Cultivo busca en todo el historial. Última siembra por fecha de siembra, luego creación (nulos al final) e ID descendentes; puede estar programada para el futuro. Mapa y alertas corresponden a la página visible.',
    aviso: 'Consulta de solo lectura. Alertas preventivas de Open-Meteo, no confirmaciones de helada ni mediciones exactas del lote. El resumen solo lee caché vigente: no realiza solicitudes externas masivas. Abre el pronóstico del detalle para consultar o actualizar cada punto.' };
  };
}
export type ServicioPanelTecnico = ReturnType<typeof crearServicioPanelTecnico>;
