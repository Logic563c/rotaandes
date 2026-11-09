import type { ObtenerCacheClima } from './clima.js';
import { crearClienteHistoricoNasa, ErrorTendencia, esquemaBaseMensual, esquemaBaseDiaria, esMensualCoherente, esDiarioCoherente, obtenerUrlHistorico } from './nasaHistorico.js';
import type { BaseMensual, BaseDiaria, TipoHistorico, MetadatosHistoricos } from './nasaHistorico.js';
import { buscarRespaldoDiario, buscarRespaldoMensual } from '../data/respaldosTendencia.js';
import { construirAnual, calcularTendencia, describirCoberturaDiaria } from './analisisTendencia.js';

export const VIGENCIA_TENDENCIA_MS = 30 * 86400000;
type EstadoHistorico = 'nasa' | 'cache' | 'desactualizado' | 'respaldo';
interface ResultadoHistorico<T> { base: T; estado: EstadoHistorico }
export function claveTendencia(tipo: TipoHistorico, latitud: number, longitud: number): string {
  obtenerUrlHistorico(tipo, latitud, longitud);
  return `power_hist_v1_${tipo}_2005_2024_${tipo === 'mensual' ? 'PRECTOTCORR_T2M_MIN_GWETTOP' : 'T2M_MIN_LST'}_${latitud}_${longitud}`;
}
function coincideBase(base: MetadatosHistoricos, latitud: number, longitud: number, ahora: number) {
  return base.latitud === latitud && base.longitud === longitud && Date.parse(base.consultado_en) <= ahora;
}
export function validarMensualGuardado(entrada: unknown, latitud: number, longitud: number, ahora: number): BaseMensual | null {
  const resultado = esquemaBaseMensual.safeParse(entrada);
  return resultado.success && coincideBase(resultado.data, latitud, longitud, ahora) && esMensualCoherente(resultado.data) ? resultado.data : null;
}
export function validarDiarioGuardado(entrada: unknown, latitud: number, longitud: number, ahora: number): BaseDiaria | null {
  const resultado = esquemaBaseDiaria.safeParse(entrada);
  return resultado.success && coincideBase(resultado.data, latitud, longitud, ahora) && esDiarioCoherente(resultado.data) ? resultado.data : null;
}
function crearResolver<T extends MetadatosHistoricos>(tipo: TipoHistorico, obtenerCache: ObtenerCacheClima,
  consultar: (lat: number, lon: number) => Promise<T>, validar: (entrada: unknown, lat: number, lon: number, ahora: number) => T | null, reloj: () => Date,
  buscarRespaldo: (lat: number, lon: number) => T | null) {
  const pendientes = new Map<string, Promise<ResultadoHistorico<T>>>(); const fallos = new Map<string, number>();
  return (latitud: number, longitud: number): Promise<ResultadoHistorico<T>> => {
    const clave = claveTendencia(tipo, latitud, longitud); const pendiente = pendientes.get(clave); if (pendiente) return pendiente;
    if (pendientes.size >= 16) return Promise.reject(new ErrorTendencia());
    const accion = Promise.resolve().then(async (): Promise<ResultadoHistorico<T>> => {
      try {
        const fila = await obtenerCache().findUnique({ where: { clave } });
        const candidato = fila ? validar(fila.datos, latitud, longitud, reloj().getTime()) : null;
        const anterior = candidato && fila?.actualizadoEn?.getTime() === Date.parse(candidato.consultado_en) ? candidato : null;
        if (anterior && reloj().getTime() - Date.parse(anterior.consultado_en) < VIGENCIA_TENDENCIA_MS) return { base: anterior, estado: 'cache' };
        try {
          if ((fallos.get(clave) ?? 0) > reloj().getTime()) throw new ErrorTendencia();
          const base = validar(await consultar(latitud, longitud), latitud, longitud, reloj().getTime());
          if (!base) throw new ErrorTendencia();
          // Los dos esquemas normalizados son JSON puro; no se persisten estimaciones anuales como observaciones.
          const datos = tipo === 'mensual' ? esquemaBaseMensual.parse(base) : esquemaBaseDiaria.parse(base);
          await obtenerCache().upsert({ where: { clave }, create: { clave, datos, actualizadoEn: new Date(base.consultado_en) }, update: { datos, actualizadoEn: new Date(base.consultado_en) } });
          fallos.delete(clave); return { base, estado: 'nasa' };
        } catch (error: unknown) {
          if (!(error instanceof ErrorTendencia)) throw error;
          for (const [id, instante] of fallos) if (instante <= reloj().getTime()) fallos.delete(id);
          if (fallos.size >= 128) { const primero = fallos.keys().next().value; if (primero) fallos.delete(primero); }
          fallos.set(clave, reloj().getTime() + 60000);
          if (anterior) return { base: anterior, estado: 'desactualizado' };
          // Respaldo NASA archivado de la misma celda MERRA-2; no se guarda como consulta nueva.
          const respaldo = buscarRespaldo(latitud, longitud);
          const verificado = respaldo ? validar(respaldo, latitud, longitud, reloj().getTime()) : null;
          if (verificado) return { base: verificado, estado: 'respaldo' };
          throw error;
        }
      } finally { pendientes.delete(clave); }
    });
    pendientes.set(clave, accion); return accion;
  };
}
export function crearServicioTendencia(obtenerCache: ObtenerCacheClima, cliente = crearClienteHistoricoNasa(), reloj: () => Date = () => new Date(),
  respaldos: { mensual: (lat: number, lon: number) => BaseMensual | null; diario: (lat: number, lon: number) => BaseDiaria | null } = { mensual: buscarRespaldoMensual, diario: buscarRespaldoDiario }) {
  const mensual = crearResolver('mensual', obtenerCache, cliente.mensual, validarMensualGuardado, reloj, respaldos.mensual);
  const diario = crearResolver('diario', obtenerCache, cliente.diario, validarDiarioGuardado, reloj, respaldos.diario);
  return async (latitud: number, longitud: number) => {
    const resultados = await Promise.allSettled([mensual(latitud, longitud), diario(latitud, longitud)]);
    for (const resultado of resultados) if (resultado.status === 'rejected' && !(resultado.reason instanceof ErrorTendencia)) throw resultado.reason;
    const lecturaMensual = resultados[0]; const lecturaDiaria = resultados[1];
    const meses = lecturaMensual.status === 'fulfilled' ? lecturaMensual.value : null;
    const dias = lecturaDiaria.status === 'fulfilled' ? lecturaDiaria.value : null;
    if (!meses && !dias) throw new ErrorTendencia();
    const anual = construirAnual(meses?.base ?? null, dias?.base ?? null);
    const describir = (resultado: ResultadoHistorico<MetadatosHistoricos> | null, tipo: TipoHistorico) => ({
      estado_datos: resultado?.estado ?? 'no_disponible' as const, actualizado_en: resultado?.base.consultado_en ?? null,
      desactualizado: resultado ? reloj().getTime() - Date.parse(resultado.base.consultado_en) >= VIGENCIA_TENDENCIA_MS : false,
      version_api: resultado?.base.version_api ?? null, fuentes: resultado?.base.fuentes ?? [], periodo_declarado: resultado?.base.periodo_declarado ?? null,
      url: obtenerUrlHistorico(tipo, latitud, longitud).href,
    });
    const advertencias = [...(meses?.base.advertencias ?? ['Serie mensual no disponible: lluvia, mínima mensual y humedad anual se conservan nulas.']),
      ...(dias?.base.advertencias ?? ['Serie diaria no disponible: no se pueden contar días de helada a partir de promedios mensuales.']),
      ...(!anual.every((a) => a.lluvia_mm !== null && a.t_min !== null && a.dias_helada !== null) ? ['Hay años incompletos: no se suman parcialmente ni se extrapolan. Revisa la cobertura por variable en la tabla.'] : [])];
    return { anual, fuente: 'NASA POWER' as const, periodo: { inicio: 2005 as const, fin: 2024 as const },
      coordenadas: { latitud, longitud }, resolucion: 'Meteorología MERRA-2: 0,5° × 0,625° (aprox. 50–70 km). Representa la zona, no el microclima del terreno.',
      unidades: { lluvia_mm: 'mm/año' as const, t_min: '°C' as const, humedad_suelo: 'índice 0–1' as const, dias_helada: 'días/año' as const },
      fuentes: { mensual: describir(meses, 'mensual'), diario: describir(dias, 'diario') }, cobertura_diaria: describirCoberturaDiaria(dias?.base ?? null),
      tendencias: { lluvia_mm: calcularTendencia(anual, 'lluvia_mm'), t_min: calcularTendencia(anual, 't_min'), dias_helada: calcularTendencia(anual, 'dias_helada'), humedad_suelo: calcularTendencia(anual, 'humedad_suelo') },
      advertencias, metodologia: { lluvia: 'PRECTOTCORR mensual (mm/día) × días reales del mes; suma de los doce meses, incluidos bisiestos. Sin doce meses válidos: null.',
        temperatura: 'Menor T2M_MIN mensual del año, solo con doce meses válidos. NASA define T2M_MIN como extremo; no es la media de mínimas diarias ni una medición absoluta de la parcela.',
        humedad: 'GWETTOP: media de los doce índices mensuales ponderada por días del mes; adimensional, no contenido volumétrico SMAP ni humedad relativa.',
        heladas: 'Recuento de días con T2M_MIN diaria modelada ≤0 °C, solo con 365/366 registros válidos. Estándar NASA LST (hora solar local), sin convertir fechas. No es el umbral preventivo ≤2 °C del pronóstico.',
        estadistica: 'Pendiente OLS por año y década con al menos 15 años completos por variable. Diferencia 2024−2005 únicamente si ambos extremos son válidos. Análisis descriptivo, sin prueba de significancia ni atribución causal.' },
      aviso: 'Series históricas regionales de un modelo de reanálisis; no son pronósticos, mediciones del lote ni garantía agrícola. Cero días modelados no descarta heladas locales. Confirma decisiones con el criterio del agricultor o técnico.',
    };
  };
}
export type ServicioTendencia = ReturnType<typeof crearServicioTendencia>;
