export function validarUrlBase(valor: string | undefined, esPrueba = false): string {
  if (!valor) throw new Error(`Falta ${esPrueba ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} en el entorno local.`);
  let url: URL;
  try { url = new URL(valor); }
  catch { throw new Error('La URL de PostgreSQL no tiene un formato válido.'); }

  const base = url.pathname.slice(1);
  const basePermitida = esPrueba ? /^rotaandes_pruebas_[a-f0-9]{8}$/.test(base) : base === 'rotaandes_dev';
  // pg permite sobrescribir host, port y user desde la consulta de la URL.
  const parametrosPermitidos = url.searchParams.size <= 1
    && [...url.searchParams].every(([nombre, contenido]) => nombre === 'schema' && contenido === 'public');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1'
    || url.port !== '5432' || url.username !== 'rotaandes_app' || !url.password || !basePermitida
    || !parametrosPermitidos || url.hash !== '') {
    throw new Error('La conexión debe usar rotaandes_app, PostgreSQL local y la base autorizada para esta operación.');
  }
  return valor;
}
