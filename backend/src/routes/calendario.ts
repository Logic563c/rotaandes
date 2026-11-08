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
import { calcularCalendario, ErrorCalendario, IDS_CULTIVOS_CALENDARIO, esquemaCultivosCalendario, validarConsultaCalendario } from '../services/calendario.js';
import type { EscenarioCalendario } from '../services/calendario.js';

export function crearRutasCalendario(obtenerBase: ObtenerBaseAgricola, autenticar: RequestHandler, consultarClima: ServicioClima): Router {
  const rutas = Router();
  const limitar = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas consultas de calendario. Espera un minuto.' } });
  rutas.get('/terrenos/:id/calendario', autenticar, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    let escenario: EscenarioCalendario;
    try { escenario = validarConsultaCalendario(solicitud.query); }
    catch (error: unknown) { throw new ErrorHttp(400, error instanceof Error ? error.message : 'Parámetros de escenario inválidos.'); }
    const terreno = await obtenerBase().terreno.findFirst({ where: { id, ...filtroTerrenos(obtenerUsuarioActual(solicitud)) }, select: { altitudM: true, areaHa: true, tieneRiego: true, latitud: true, longitud: true } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    try {
      const filas = await obtenerBase().cultivo.findMany({ where: { id: { in: [...IDS_CULTIVOS_CALENDARIO] } }, orderBy: { id: 'asc' } });
      const catalogo = esquemaCultivosCalendario.safeParse(filas);
      if (!catalogo.success || catalogo.data.length !== IDS_CULTIVOS_CALENDARIO.length) throw new ErrorCalendario();
      const clima = await consultarClima(terreno.latitud, terreno.longitud, terreno.altitudM);
      const contexto = { altitudM: terreno.altitudM, tieneRiego: terreno.tieneRiego, areaHa: terreno.areaHa?.toNumber() ?? null };
      const celdas = calcularCalendario({ terreno: contexto, cultivos: catalogo.data, mensual: clima.mensual, escenario });
      respuesta.json({ celdas, cultivos: catalogo.data.map((cultivo) => ({ id: cultivo.id, nombre: cultivo.nombre, altitud_min: cultivo.altitudMin, altitud_max: cultivo.altitudMax })),
        terreno: { altitud_m: contexto.altitudM, tiene_riego: contexto.tieneRiego, area_ha: contexto.areaHa }, escenario: { lluvia_pct: escenario.lluviaPct, temp_delta: escenario.tempDelta },
        clima: { fuente: clima.fuente, resolucion: clima.resolucion, periodo: clima.periodo, actualizado_en: clima.actualizado_en, estado_datos: clima.estado_datos, desactualizado: clima.desactualizado, advertencias: clima.advertencias },
        aviso: 'Calendario orientativo con cultivos referenciales, sin validación agronómica local. No reemplaza el criterio del agricultor o del técnico. El área declarada no modifica estas reglas; no se calcula capacidad de riego ni volumen de agua. No es un pronóstico.' });
    } catch (error: unknown) { if (error instanceof ErrorClima || error instanceof ErrorCalendario) throw new ErrorHttp(500, error.message); throw error; }
  });
  return rutas;
}
