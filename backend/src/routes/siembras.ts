import { Router } from 'express';
import type { RequestHandler } from 'express';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { permitirRoles } from '../middleware/rol.js';
import { ErrorHttp } from '../middleware/errores.js';
import { filtroTerrenos, publicarSiembra } from '../services/datosAgricolas.js';
import type { ObtenerBaseAgricola } from '../services/datosAgricolas.js';
import { camposSiembra, cambiosSiembra, validarDatosAgricolas, validarId, validarOrdenFechas } from '../services/validacionAgricola.js';

export function crearRutasSiembras(obtenerBase: ObtenerBaseAgricola, verificarSesion: RequestHandler): Router {
  const rutas = Router();
  const escritura = permitirRoles('agricultor');
  rutas.get('/terrenos/:id/siembras', verificarSesion, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    const terreno = await obtenerBase().terreno.findFirst({ where: { id, ...filtroTerrenos(obtenerUsuarioActual(solicitud)) }, select: { id: true } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    const siembras = await obtenerBase().siembra.findMany({ where: { terrenoId: id, terreno: filtroTerrenos(obtenerUsuarioActual(solicitud)) }, orderBy: [{ fechaSiembra: 'desc' }, { creadoEn: 'desc' }, { id: 'asc' }] });
    respuesta.json(siembras.map(publicarSiembra));
  });
  rutas.post('/terrenos/:id/siembras', verificarSesion, escritura, async (solicitud, respuesta) => {
    const terrenoId = validarId(solicitud.params.id);
    const terreno = await obtenerBase().terreno.findFirst({ where: { id: terrenoId, usuarioId: obtenerUsuarioActual(solicitud).id }, select: { id: true } });
    if (!terreno) throw new ErrorHttp(404, 'Terreno no encontrado.');
    const entrada: unknown = solicitud.body;
    const datos = validarDatosAgricolas(camposSiembra, entrada);
    validarOrdenFechas(datos.fecha_siembra, datos.fecha_cosecha ?? null);
    if (!await obtenerBase().cultivo.findUnique({ where: { id: datos.cultivo_id }, select: { id: true } })) throw new ErrorHttp(400, 'El cultivo no está registrado en el catálogo.');
    const siembra = await obtenerBase().siembra.create({ data: { terrenoId, cultivoId: datos.cultivo_id,
      fechaSiembra: new Date(`${datos.fecha_siembra}T00:00:00.000Z`), fechaCosecha: datos.fecha_cosecha ? new Date(`${datos.fecha_cosecha}T00:00:00.000Z`) : null, notas: datos.notas ?? null } });
    respuesta.status(201).json(publicarSiembra(siembra));
  });
  rutas.put('/siembras/:id', verificarSesion, escritura, async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id);
    const usuarioId = obtenerUsuarioActual(solicitud).id;
    const anterior = await obtenerBase().siembra.findFirst({ where: { id, terreno: { usuarioId } } });
    if (!anterior) throw new ErrorHttp(404, 'Siembra no encontrada.');
    const entrada: unknown = solicitud.body;
    const datos = validarDatosAgricolas(cambiosSiembra, entrada);
    const fechaSiembra = datos.fecha_siembra ?? anterior.fechaSiembra.toISOString().slice(0, 10);
    const fechaCosecha = datos.fecha_cosecha !== undefined ? datos.fecha_cosecha : anterior.fechaCosecha?.toISOString().slice(0, 10) ?? null;
    validarOrdenFechas(fechaSiembra, fechaCosecha);
    const cultivoId = datos.cultivo_id ?? anterior.cultivoId;
    if (!await obtenerBase().cultivo.findUnique({ where: { id: cultivoId }, select: { id: true } })) throw new ErrorHttp(400, 'El cultivo no está registrado en el catálogo.');
    const siembra = await obtenerBase().siembra.update({ where: { id, terreno: { usuarioId } }, data: {
      cultivoId, fechaSiembra: new Date(`${fechaSiembra}T00:00:00.000Z`), fechaCosecha: fechaCosecha ? new Date(`${fechaCosecha}T00:00:00.000Z`) : null,
      ...(datos.notas !== undefined && { notas: datos.notas }),
    } });
    respuesta.json(publicarSiembra(siembra));
  });
  rutas.delete('/siembras/:id', verificarSesion, escritura, async (solicitud, respuesta) => {
    await obtenerBase().siembra.delete({ where: { id: validarId(solicitud.params.id), terreno: { usuarioId: obtenerUsuarioActual(solicitud).id } } });
    respuesta.status(204).end();
  });
  return rutas;
}
