import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';

export class ErrorHttp extends Error {
  constructor(public readonly codigoHttp: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorHttp';
  }
}

export const manejarErrores: ErrorRequestHandler = (
  error: unknown,
  _solicitud,
  respuesta,
  siguiente,
) => {
  if (respuesta.headersSent) {
    siguiente(error);
    return;
  }

  if (error instanceof ErrorHttp) {
    respuesta.status(error.codigoHttp).json({ error: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2025' || error.code === 'P2003')) {
    respuesta.status(error.code === 'P2025' ? 404 : 400).json({ error: error.code === 'P2025' ? 'Recurso no encontrado.' : 'La referencia indicada ya no está disponible.' });
    return;
  }

  if (typeof error === 'object' && error !== null && 'type' in error
    && (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')) {
    respuesta.status(400).json({ error: 'El cuerpo debe ser JSON válido y no superar 16 KB.' });
    return;
  }

  console.error('Error inesperado del servidor.', error instanceof Error ? error.name : 'Error desconocido');
  respuesta.status(500).json({ error: 'No se pudo completar la solicitud.' });
};
