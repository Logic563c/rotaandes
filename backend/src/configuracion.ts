export interface ConfiguracionServidor {
  puerto: number;
  origenPermitido: string;
}

const ORIGENES_LOCALES = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export function obtenerConfiguracion(
  entorno: NodeJS.ProcessEnv = process.env,
): ConfiguracionServidor {
  const puertoTexto = entorno.PORT ?? '3000';
  const puerto = Number(puertoTexto);

  if (!/^\d+$/.test(puertoTexto) || !Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535.');
  }

  const origenPermitido = entorno.CORS_ORIGIN ?? 'http://localhost:5173';
  if (!ORIGENES_LOCALES.has(origenPermitido)) {
    throw new Error('CORS_ORIGIN debe ser http://localhost:5173 o http://127.0.0.1:5173.');
  }

  return { puerto, origenPermitido };
}
