export function validarUrlBase(valor: string | undefined, esPrueba = false, entorno: NodeJS.ProcessEnv = process.env): string {
  if (!valor) throw new Error(`Falta ${esPrueba ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} en el entorno local.`);
  let url: URL;
  try { url = new URL(valor); }
  catch { throw new Error('La URL de PostgreSQL no tiene un formato válido.'); }

  const base = url.pathname.slice(1);
  const basePermitida = esPrueba ? /^rotaandes_pruebas_[a-f0-9]{8}$/.test(base) : base === 'rotaandes_dev';
  // pg permite sobrescribir host, port y user desde la consulta de la URL.
  const parametrosPermitidos = url.searchParams.size <= 1
    && [...url.searchParams].every(([nombre, contenido]) => nombre === 'schema' && contenido === 'public');
  if (!esPrueba && entorno.NODE_ENV === 'production') {
    const host = entorno.DATABASE_HOST;
    const nombre = entorno.DATABASE_NAME;
    const usuario = entorno.DATABASE_USER;
    if (!host || !/^[a-z0-9-]+\.railway\.internal$/.test(host) || !nombre || !/^[a-zA-Z0-9_-]+$/.test(nombre)
      || !usuario || !/^[a-zA-Z0-9_-]+$/.test(usuario) || ['rotaandes_dev', 'template0', 'template1'].includes(nombre) || nombre.startsWith('rotaandes_pruebas_')
      || !['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== host || base !== nombre || url.username !== usuario
      || (url.port !== '' && url.port !== '5432') || !url.password || !parametrosPermitidos || url.hash) {
      throw new Error('La conexión de producción debe coincidir con DATABASE_HOST/NAME/USER del PostgreSQL privado de Railway autorizado.');
    }
    return valor;
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1'
    || url.port !== '5432' || url.username !== 'rotaandes_app' || !url.password || !basePermitida
    || !parametrosPermitidos || url.hash !== '') {
    throw new Error('La conexión debe usar rotaandes_app, PostgreSQL local y la base autorizada para esta operación.');
  }
  return valor;
}
