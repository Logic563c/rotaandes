import type { ErrorRequestHandler } from 'express';

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

  console.error('Error inesperado del servidor.', error instanceof Error ? error.name : 'Error desconocido');
  respuesta.status(500).json({ error: 'No se pudo completar la solicitud.' });
};
