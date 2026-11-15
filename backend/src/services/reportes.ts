import type { UsuarioPublico } from './autenticacion.js';
import { filtroTerrenos } from './datosAgricolas.js';
import type { ObtenerBaseAgricola } from './datosAgricolas.js';
import type { ServicioClima } from './clima.js';
import type { ServicioPronostico } from './pronostico.js';
import type { ServicioTendencia } from './tendencia.js';
import { ErrorClima } from './nasaPower.js';
import { ErrorPronostico } from './openMeteo.js';
import { ErrorTendencia } from './nasaHistorico.js';
import { calcularCalendario, describirCultivos, esquemaCultivosCalendario, IDS_CULTIVOS_CALENDARIO, ErrorCalendario } from './calendario.js';
import { IDS_CULTIVOS_ORIGINALES } from '../data/perfilesAgronomicos.js';
import type { CeldaCalendario } from './calendario.js';
import { compararRotaciones, obtenerInicioRotacion, ErrorRotaciones } from './motorRotacion.js';
import { plantillasReferenciales } from '../data/catalogoPlantillas.js';
import { ErrorHttp } from '../middleware/errores.js';
import { generarPdfTerreno } from './pdfTerreno.js';
import { describirDelimitacion, leerPoligonoGuardado } from './geometriaTerreno.js';
import type { PoligonoGeoJson } from './geometriaTerreno.js';

export interface DatosReporte {
  generadoEn: string;
  terreno: { id: string; nombre: string; latitud: number; longitud: number; altitudM: number | null; areaHa: number | null; tieneRiego: boolean | null; tipoSuelo: string | null;
    /** Delimitación opcional dibujada por el agricultor; ausente o null en terrenos que solo tienen un punto. */
    delimitacion?: { poligono: PoligonoGeoJson; areaM2: number; areaHa: number; vertices: number; diferenciaHa: number | null; diferenciaPct: number | null } | null };
  historial: { cultivo: string; fechaSiembra: string; fechaCosecha: string | null }[];
  clima: Awaited<ReturnType<ServicioClima>> | null;
  pronostico: Awaited<ReturnType<ServicioPronostico>> | null;
  tendencia: Awaited<ReturnType<ServicioTendencia>> | null;
  calendario: CeldaCalendario[] | null;
  cultivos: ReturnType<typeof describirCultivos>;
  rotaciones: ReturnType<typeof compararRotaciones> | null;
  avisos: string[];
}
function delimitacionReporte(valor: unknown, areaDeclaradaHa: number | null): NonNullable<DatosReporte['terreno']['delimitacion']> | null {
  const poligono = leerPoligonoGuardado(valor); const descripcion = describirDelimitacion(poligono, areaDeclaradaHa);
  return poligono && descripcion ? { poligono, ...descripcion } : null;
}
export function crearServicioReportes(obtenerBase: ObtenerBaseAgricola, consultarClima: ServicioClima, consultarPronostico: ServicioPronostico,
  consultarTendencia: ServicioTendencia, reloj = () => new Date(), renderizar = generarPdfTerreno, plazoMs = 25000) {
  if (!Number.isFinite(plazoMs) || plazoMs < 1 || plazoMs > 25000) throw new Error('El plazo interno del informe no es válido.');
  let ocupado = false;
  return async (id: string, usuario: UsuarioPublico, signal?: AbortSignal): Promise<Buffer> => {
    const base = obtenerBase();
    const terreno = await base.terreno.findFirst({ where: { id, ...filtroTerrenos(usuario) }, select: { id: true, nombre: true, latitud: true, longitud: true, altitudM: true, areaHa: true, tieneRiego: true, tipoSuelo: true, poligono: true,
      usuario: { select: { prioridadAgua: true, prioridadSuelo: true, prioridadIngresos: true } },
      siembras: { take: 201, orderBy: [{ fechaSiembra: 'desc' }, { id: 'desc' }], select: { id: true, cultivoId: true, fechaSiembra: true, fechaCosecha: true, cultivo: { select: { nombre: true } } } } } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    if (terreno.siembras.length > 200) throw new ErrorHttp(400, 'El informe admite hasta 200 siembras. El historial excede el límite seguro y no se ha truncado.');
    if (ocupado) throw new ErrorHttp(429, 'Hay otro informe en preparación. Reintenta en un momento.');
    if (signal?.aborted) throw new ErrorHttp(400, 'La descarga fue cancelada.');
    ocupado = true;
    let vencido = false;
    const trabajo = (async () => {
      const [cultivos, plantillas] = await Promise.all([base.cultivo.findMany({ where: { id: { in: [...IDS_CULTIVOS_CALENDARIO] } }, orderBy: { id: 'asc' } }),
        base.plantillaRotacion.findMany({ where: { id: { in: plantillasReferenciales.map((p) => p.id) } }, orderBy: { id: 'asc' } })]);
      const avisos: string[] = [];
      const clima = await Promise.allSettled([Promise.resolve().then(() => consultarClima(terreno.latitud, terreno.longitud, terreno.altitudM)), Promise.resolve().then(() => consultarPronostico(terreno.latitud, terreno.longitud)), Promise.resolve().then(() => consultarTendencia(terreno.latitud, terreno.longitud))]);
      for (const resultado of clima) if (resultado.status === 'rejected' && !(resultado.reason instanceof ErrorClima || resultado.reason instanceof ErrorPronostico || resultado.reason instanceof ErrorTendencia)) throw resultado.reason;
      const historico = clima[0].status === 'fulfilled' ? clima[0].value : null;
      let pronostico = clima[1].status === 'fulfilled' ? clima[1].value : null;
      const tendencia = clima[2].status === 'fulfilled' ? clima[2].value : null;
      const ahora = reloj();
      if (pronostico && Date.parse(pronostico.vigente_hasta) <= ahora.getTime()) pronostico = null;
      if (!historico) avisos.push('Climatología NASA POWER no disponible para este punto; no se inventan valores.');
      if (!pronostico) avisos.push('Pronóstico Open-Meteo vigente no disponible; no se concluye ausencia de riesgo de heladas.');
      if (!tendencia) avisos.push('Tendencias históricas no disponibles; no se deducen conteos diarios de medias mensuales.');
      const contexto = { altitudM: terreno.altitudM, areaHa: terreno.areaHa?.toNumber() ?? null, tieneRiego: terreno.tieneRiego };
      let calendario: CeldaCalendario[] | null = null; let rotaciones: DatosReporte['rotaciones'] = null;
      const catalogo = esquemaCultivosCalendario.safeParse(cultivos);
      if (catalogo.success && IDS_CULTIVOS_ORIGINALES.every((id) => catalogo.data.some((cultivo) => cultivo.id === id))) {
        try { calendario = calcularCalendario({ terreno: contexto, cultivos: catalogo.data, mensual: historico?.mensual ?? [], escenario: { lluviaPct: 0, tempDelta: 0 }, elevacionCeldaM: historico?.elevacion_celda_m ?? null }); }
        catch (error: unknown) { if (!(error instanceof ErrorCalendario)) throw error; avisos.push('El calendario no puede evaluarse con los datos disponibles.'); }
      } else avisos.push('Catálogo incompleto o inválido: calendario no disponible.');
      const historial = terreno.siembras.map((s) => ({ id: s.id, cultivoId: s.cultivoId, fechaSiembra: s.fechaSiembra.toISOString().slice(0, 10), fechaCosecha: s.fechaCosecha?.toISOString().slice(0, 10) ?? null }));
      const inicio = obtenerInicioRotacion(ahora, historial.map((s) => s.fechaSiembra).sort().at(-1) ?? null, historial.flatMap((s) => s.fechaCosecha ? [s.fechaCosecha] : []).sort().at(-1) ?? null);
      if (inicio) {
        try { rotaciones = compararRotaciones({ terreno: contexto, prioridades: { agua: terreno.usuario.prioridadAgua, suelo: terreno.usuario.prioridadSuelo, ingresos: terreno.usuario.prioridadIngresos }, cultivos, plantillas, historial: historial.slice(0, 3), inicio, mensual: historico?.mensual ?? [], escenario: { lluviaPct: 0, tempDelta: 0 }, elevacionCeldaM: historico?.elevacion_celda_m ?? null }); }
        catch (error: unknown) { if (!(error instanceof ErrorRotaciones)) throw error; avisos.push('Rotaciones no evaluables: datos o catálogo insuficientes.'); }
      } else avisos.push('Las fechas registradas no permiten construir un horizonte válido de rotación.');
      if (vencido || signal?.aborted) throw new ErrorHttp(400, 'La descarga fue cancelada o excedió su plazo.');
      return renderizar({ generadoEn: ahora.toISOString(), terreno: { id: terreno.id, nombre: terreno.nombre, latitud: terreno.latitud, longitud: terreno.longitud, ...contexto, tipoSuelo: terreno.tipoSuelo, delimitacion: delimitacionReporte(terreno.poligono, contexto.areaHa) },
        historial: terreno.siembras.map((s) => ({ cultivo: s.cultivo.nombre, fechaSiembra: s.fechaSiembra.toISOString().slice(0, 10), fechaCosecha: s.fechaCosecha?.toISOString().slice(0, 10) ?? null })), clima: historico, pronostico, tendencia, calendario, cultivos: catalogo.success ? describirCultivos(catalogo.data) : [], rotaciones, avisos });
    })().finally(() => { ocupado = false; });
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([trabajo, new Promise<never>((_resolver, rechazar) => { temporizador = setTimeout(() => { vencido = true; rechazar(new ErrorHttp(500, 'El informe excedió el tiempo de preparación. Reintenta más tarde.')); }, plazoMs); })]); }
    finally { if (temporizador) clearTimeout(temporizador); }
  };
}
export type ServicioReportes = ReturnType<typeof crearServicioReportes>;
