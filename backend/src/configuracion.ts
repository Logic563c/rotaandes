export interface ConfiguracionServidor {
  puerto: number;
  origenPermitido: string;
  host: '127.0.0.1' | '0.0.0.0';
  esProduccion: boolean;
  saltosProxy: 0 | 1;
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

  const esProduccion = entorno.NODE_ENV === 'production';
  const origenPermitido = entorno.CORS_ORIGIN ?? (esProduccion ? '' : 'http://localhost:5173');
  if (!esProduccion && !ORIGENES_LOCALES.has(origenPermitido)) {
    throw new Error('CORS_ORIGIN debe ser http://localhost:5173 o http://127.0.0.1:5173.');
  }
  if (esProduccion) {
    let origen: URL;
    try { origen = new URL(origenPermitido); }
    catch { throw new Error('CORS_ORIGIN debe ser el origen HTTPS exacto del frontend de producción.'); }
    if (origen.protocol !== 'https:' || origen.origin !== origenPermitido || origen.username || origen.password
      || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(origen.hostname) || origen.port) throw new Error('CORS_ORIGIN debe ser un único origen HTTPS de Vercel, sin rutas, comodines ni credenciales.');
    if (entorno.TRUST_PROXY_HOPS !== '1') throw new Error('Configura TRUST_PROXY_HOPS=1 únicamente detrás del proxy público de Railway.');
    if (!entorno.PORT) throw new Error('Railway debe proporcionar PORT en producción.');
  }

  return { puerto, origenPermitido, host: esProduccion ? '0.0.0.0' : '127.0.0.1', esProduccion, saltosProxy: esProduccion ? 1 : 0 };
}
