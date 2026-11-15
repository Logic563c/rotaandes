import type { CeldaCalendario, CultivoCalendario, RespuestaCalendario } from '../types/api';

type CultivoParcial = Pick<CultivoCalendario, 'id' | 'nombre'> & Partial<CultivoCalendario>;
type CeldaParcial = Omit<CeldaCalendario, 'resumen'> & Partial<Pick<CeldaCalendario, 'resumen'>>;
type RespuestaParcial = Omit<RespuestaCalendario, 'cultivos' | 'celdas' | 'categorias' | 'version'> & { cultivos: CultivoParcial[]; celdas: CeldaParcial[] } & Partial<Pick<RespuestaCalendario, 'categorias' | 'version'>>;

/** Completa una respuesta sintética con los mismos valores por defecto que aplica la validación ante un servidor anterior. */
export function completarCalendario(parcial: RespuestaParcial): RespuestaCalendario {
  return { ...parcial, categorias: parcial.categorias ?? [], version: parcial.version ?? null,
    celdas: parcial.celdas.map((celda) => ({ ...celda, resumen: celda.resumen ?? null })),
    cultivos: parcial.cultivos.map((cultivo) => ({ altitud_min: null, altitud_max: null, nombre_cientifico: null, nota_denominacion: null, categoria: null, categoria_nombre: null, es_hortaliza: null,
      ciclo_dias_min: null, ciclo_dias_max: null, ciclo_meses_evaluados: null, ciclo_corto: null, establecimiento: null, cosecha: null, origen: null,
      fuentes: [], consideraciones_rotacion: [], pendientes: [], ...cultivo })) };
}
