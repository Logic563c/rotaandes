import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { permitirRoles } from '../middleware/rol.js';
import { ErrorHttp } from '../middleware/errores.js';
import { filtroTerrenos, publicarTerreno } from '../services/datosAgricolas.js';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import type { ObtenerAltitud } from '../services/elevacion.js';
import { camposTerreno, cambiosTerreno, validarDatosAgricolas, validarId } from '../services/validacionAgricola.js';

export function crearRutasTerrenos(obtenerBase: ObtenerBaseAgricola, obtenerAltitud: ObtenerAltitud): Router {
  const rutas = Router();
  const escritura = permitirRoles('agricultor');
  const limitar = rateLimit({ windowMs: 60000, limit: 20, keyGenerator: (solicitud) => obtenerUsuarioActual(solicitud).id,
    standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados cambios de terrenos. Espera un minuto.' } });

  rutas.get('/', async (solicitud, respuesta) => {
    const terrenos = await obtenerBase().terreno.findMany({ where: filtroTerrenos(obtenerUsuarioActual(solicitud)), orderBy: [{ creadoEn: 'desc' }, { id: 'asc' }] });
    respuesta.json(terrenos.map(publicarTerreno));
  });
  rutas.post('/', escritura, limitar, async (solicitud, respuesta) => {
    const entrada: unknown = solicitud.body;
    const datos = validarDatosAgricolas(camposTerreno, entrada);
    const terreno = await obtenerBase().terreno.create({ data: {
      usuarioId: obtenerUsuarioActual(solicitud).id, nombre: datos.nombre, latitud: datos.latitud, longitud: datos.longitud,
      altitudM: await obtenerAltitud(datos.latitud, datos.longitud), areaHa: datos.area_ha ?? null,
      tieneRiego: datos.tiene_riego ?? false, tipoSuelo: datos.tipo_suelo ?? null,
    } });
    respuesta.status(201).json(publicarTerreno(terreno));
  });
  rutas.get('/:id', async (solicitud, respuesta) => {
    const terreno = await obtenerBase().terreno.findFirst({ where: { id: validarId(solicitud.params.id), ...filtroTerrenos(obtenerUsuarioActual(solicitud)) } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    respuesta.json(publicarTerreno(terreno));
  });
  rutas.put('/:id', escritura, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    const usuarioId = obtenerUsuarioActual(solicitud).id;
    const anterior = await obtenerBase().terreno.findFirst({ where: { id, usuarioId } });
    if (!anterior) throw new ErrorHttp(404, 'Terreno no encontrado.');
    const entrada: unknown = solicitud.body;
    const datos = validarDatosAgricolas(cambiosTerreno, entrada);
    const latitud = datos.latitud ?? anterior.latitud;
    const longitud = datos.longitud ?? anterior.longitud;
    const necesitaAltitud = latitud !== anterior.latitud || longitud !== anterior.longitud
      || (anterior.altitudM === null && (datos.latitud !== undefined || datos.longitud !== undefined));
    const altitudM = necesitaAltitud ? await obtenerAltitud(latitud, longitud) : anterior.altitudM;
    const terreno = await obtenerBase().terreno.update({ where: { id, usuarioId }, data: {
      nombre: datos.nombre ?? anterior.nombre, latitud, longitud, altitudM,
      ...(datos.area_ha !== undefined && { areaHa: datos.area_ha }),
      ...(datos.tiene_riego !== undefined && { tieneRiego: datos.tiene_riego }),
      ...(datos.tipo_suelo !== undefined && { tipoSuelo: datos.tipo_suelo }),
    } });
    respuesta.json(publicarTerreno(terreno));
  });
  rutas.delete('/:id', escritura, async (solicitud, respuesta) => {
    await obtenerBase().terreno.delete({ where: { id: validarId(solicitud.params.id), usuarioId: obtenerUsuarioActual(solicitud).id } });
    respuesta.status(204).end();
  });
  return rutas;
}
