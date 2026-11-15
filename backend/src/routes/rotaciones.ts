import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { ErrorHttp } from '../middleware/errores.js';
import { filtroTerrenos } from '../services/datosAgricolas.js';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import type { ServicioClima } from '../services/clima.js';
import { validarId } from '../services/validacionAgricola.js';
import { ErrorClima } from '../services/nasaPower.js';
import { validarConsultaCalendario, IDS_CULTIVOS_CALENDARIO } from '../services/calendario.js';
import { compararRotaciones, ErrorRotaciones, obtenerInicioRotacion } from '../services/motorRotacion.js';
import { plantillasReferenciales } from '../data/catalogoPlantillas.js';

export function crearRutasRotaciones(obtenerBase: ObtenerBaseAgricola, autenticar: RequestHandler, consultarClima: ServicioClima, reloj = () => new Date()): Router {
  const rutas = Router();
  const limitar = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas consultas de rotaciones. Espera un minuto.' } });
  rutas.get('/terrenos/:id/rotaciones', autenticar, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    let escenario;
    try { escenario = validarConsultaCalendario(solicitud.query); }
    catch (error: unknown) { throw new ErrorHttp(400, error instanceof Error ? error.message : 'Parámetros de escenario inválidos.'); }
    const base = obtenerBase();
    const terreno = await base.terreno.findFirst({ where: { id, ...filtroTerrenos(obtenerUsuarioActual(solicitud)) }, select: {
      latitud: true, longitud: true, altitudM: true, tieneRiego: true, areaHa: true,
      usuario: { select: { prioridadAgua: true, prioridadSuelo: true, prioridadIngresos: true } },
      siembras: { orderBy: [{ fechaSiembra: 'desc' }, { id: 'desc' }], take: 3, select: { id: true, cultivoId: true, fechaSiembra: true, fechaCosecha: true } },
    } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    const [cultivos, plantillas, fechas] = await Promise.all([
      base.cultivo.findMany({ where: { id: { in: [...IDS_CULTIVOS_CALENDARIO] } }, orderBy: { id: 'asc' } }),
      base.plantillaRotacion.findMany({ where: { id: { in: plantillasReferenciales.map((valor) => valor.id) } }, orderBy: { id: 'asc' } }),
      base.siembra.aggregate({ where: { terrenoId: id, terreno: filtroTerrenos(obtenerUsuarioActual(solicitud)) }, _max: { fechaSiembra: true, fechaCosecha: true } }),
    ]);
    const inicio = obtenerInicioRotacion(reloj(), fechas._max.fechaSiembra?.toISOString().slice(0, 10) ?? null, fechas._max.fechaCosecha?.toISOString().slice(0, 10) ?? null);
    if (!inicio) throw new ErrorHttp(400, 'Las fechas registradas no permiten construir un horizonte mensual válido.');
    let clima: Awaited<ReturnType<ServicioClima>> | null = null;
    try { clima = await consultarClima(terreno.latitud, terreno.longitud, terreno.altitudM); }
    catch (error: unknown) { if (!(error instanceof ErrorClima)) throw error; }
    try {
      const resultado = compararRotaciones({ terreno: { altitudM: terreno.altitudM, tieneRiego: terreno.tieneRiego, areaHa: terreno.areaHa?.toNumber() ?? null },
        prioridades: { agua: terreno.usuario.prioridadAgua, suelo: terreno.usuario.prioridadSuelo, ingresos: terreno.usuario.prioridadIngresos }, cultivos, plantillas,
        historial: terreno.siembras.map((siembra) => ({ id: siembra.id, cultivoId: siembra.cultivoId, fechaSiembra: siembra.fechaSiembra.toISOString().slice(0, 10), fechaCosecha: siembra.fechaCosecha?.toISOString().slice(0, 10) ?? null })),
        inicio, mensual: clima?.mensual ?? [], escenario, elevacionCeldaM: clima?.elevacion_celda_m ?? null });
      respuesta.json({ ...resultado, clima: clima ? { fuente: clima.fuente, resolucion: clima.resolucion, periodo: clima.periodo, actualizado_en: clima.actualizado_en, estado_datos: clima.estado_datos, desactualizado: clima.desactualizado, advertencias: clima.advertencias } : null,
        advertencias: [...(clima ? [] : ['NASA no disponible sin dato fiable del mismo punto: no se determina el ranking.']), ...(cultivos.length < IDS_CULTIVOS_CALENDARIO.length ? ['Catálogo incompleto: no se presuponen características de cultivos ausentes.'] : [])] });
    } catch (error: unknown) { if (error instanceof ErrorRotaciones) throw new ErrorHttp(500, error.message); throw error; }
  });
  return rutas;
}
