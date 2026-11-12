import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Prisma } from '../generated/prisma/client.js';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { permitirRoles } from '../middleware/rol.js';
import { ErrorHttp } from '../middleware/errores.js';
import { filtroTerrenos, publicarTerreno } from '../services/datosAgricolas.js';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import type { ObtenerAltitud } from '../services/elevacion.js';
import { distanciaKm, esquemaDelimitacion, leerPoligonoGuardado, LIMITES_POLIGONO, validarPoligono } from '../services/geometriaTerreno.js';
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
    const cambiaUbicacion = datos.latitud !== undefined || datos.longitud !== undefined;
    const necesitaAltitud = latitud !== anterior.latitud || longitud !== anterior.longitud
      || (anterior.altitudM === null && (datos.latitud !== undefined || datos.longitud !== undefined));
    // Una delimitación guardada debe seguir cerca del punto: no se mueve el terreno lejos de su zona dibujada.
    const delimitacion = leerPoligonoGuardado(anterior.poligono);
    if (cambiaUbicacion && delimitacion && (delimitacion.coordinates[0] ?? []).some(([lonVertice, latVertice]) => distanciaKm({ latitud, longitud }, { latitud: latVertice, longitud: lonVertice }) > LIMITES_POLIGONO.distanciaMaximaKm)) {
      throw new ErrorHttp(400, `La nueva ubicación está a más de ${LIMITES_POLIGONO.distanciaMaximaKm} km de la zona delimitada. Elimina la delimitación antes de mover el terreno.`);
    }
    const altitudM = necesitaAltitud ? await obtenerAltitud(latitud, longitud) : anterior.altitudM;
    try {
      const terreno = await obtenerBase().terreno.update({ where: { id, usuarioId,
        ...(cambiaUbicacion && { latitud: anterior.latitud, longitud: anterior.longitud, altitudM: anterior.altitudM }),
      }, data: {
        ...(datos.nombre !== undefined && { nombre: datos.nombre }),
        ...(cambiaUbicacion && { latitud, longitud, altitudM }),
        ...(datos.area_ha !== undefined && { areaHa: datos.area_ha }),
        ...(datos.tiene_riego !== undefined && { tieneRiego: datos.tiene_riego }),
        ...(datos.tipo_suelo !== undefined && { tipoSuelo: datos.tipo_suelo }),
      } });
      respuesta.json(publicarTerreno(terreno));
    } catch (error: unknown) {
      if (cambiaUbicacion && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
        && await obtenerBase().terreno.count({ where: { id, usuarioId } })) throw new ErrorHttp(400, 'La ubicación del terreno cambió durante el guardado. Recarga sus datos y vuelve a intentarlo.');
      throw error;
    }
  });
  // Delimitación de la zona de cultivo: solo el agricultor propietario. Otro usuario recibe 404, como en el resto de rutas.
  rutas.put('/:id/delimitacion', escritura, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    const usuarioId = obtenerUsuarioActual(solicitud).id;
    const entrada = esquemaDelimitacion.safeParse(solicitud.body);
    if (!entrada.success) throw new ErrorHttp(400, 'Envía solo el campo poligono con la delimitación.');
    const terreno = await obtenerBase().terreno.findFirst({ where: { id, usuarioId } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    const poligono = validarPoligono(entrada.data.poligono, { latitud: terreno.latitud, longitud: terreno.longitud });
    // La condición sobre latitud y longitud evita guardar una zona validada contra una ubicación que cambió entre tanto.
    const actualizados = await obtenerBase().terreno.updateMany({ where: { id, usuarioId, latitud: terreno.latitud, longitud: terreno.longitud }, data: { poligono: poligono as unknown as Prisma.InputJsonValue } });
    if (actualizados.count !== 1) throw new ErrorHttp(400, 'La ubicación del terreno cambió durante el guardado. Recarga sus datos y vuelve a dibujar la zona.');
    const guardado = await obtenerBase().terreno.findFirst({ where: { id, usuarioId } });
    if (!guardado) throw new ErrorHttp(404, 'Terreno no encontrado.');
    respuesta.json(publicarTerreno(guardado));
  });
  rutas.delete('/:id/delimitacion', escritura, limitar, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    const usuarioId = obtenerUsuarioActual(solicitud).id;
    const actualizados = await obtenerBase().terreno.updateMany({ where: { id, usuarioId }, data: { poligono: Prisma.DbNull } });
    if (actualizados.count !== 1) throw new ErrorHttp(404, 'Terreno no encontrado.');
    const terreno = await obtenerBase().terreno.findFirst({ where: { id, usuarioId } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    respuesta.json(publicarTerreno(terreno));
  });
  rutas.delete('/:id', escritura, async (solicitud, respuesta) => {
    await obtenerBase().terreno.delete({ where: { id: validarId(solicitud.params.id), usuarioId: obtenerUsuarioActual(solicitud).id } });
    respuesta.status(204).end();
  });
  return rutas;
}
