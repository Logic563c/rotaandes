import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { obtenerUsuarioActual } from '../middleware/auth.js';
import { validarId } from '../services/validacionAgricola.js';
import { ErrorHttp } from '../middleware/errores.js';
import type { ServicioReportes } from '../services/reportes.js';
import { ErrorPdf } from '../services/pdfTerreno.js';

export function crearRutasReportes(autenticar: RequestHandler, generar: ServicioReportes) {
  const rutas = Router();
  rutas.get('/terrenos/:id/reporte.pdf', autenticar, rateLimit({ windowMs: 60000, limit: 3, keyGenerator: (r) => obtenerUsuarioActual(r).id, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Espera un minuto antes de solicitar más informes.' } }), async (solicitud, respuesta) => {
    const id = validarId(solicitud.params.id); if (Object.keys(solicitud.query).length) throw new ErrorHttp(400, 'El informe usa el escenario original y no admite parámetros adicionales.');
    const control = new AbortController(); const cancelar = () => { if (!respuesta.writableEnded) control.abort(); }; respuesta.once('close', cancelar);
    try { const pdf = await generar(id, obtenerUsuarioActual(solicitud), control.signal); if (control.signal.aborted) return;
      respuesta.type('application/pdf').set('Content-Disposition', `attachment; filename="rotaandes-${id}.pdf"`).set('Content-Length', String(pdf.length)).send(pdf);
    } catch (error: unknown) { if (error instanceof ErrorPdf) throw new ErrorHttp(500, error.message); throw error; }
    finally { respuesta.off('close', cancelar); }
  }); return rutas;
}
