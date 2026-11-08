export function validarUrlPublicacion(valor: string | undefined): URL {
  let url: URL;
  try { url = new URL(valor ?? ''); } catch { throw new Error('VITE_API_URL debe indicar el backend HTTPS real antes de publicar.'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.up\.railway\.app$/.test(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.port) {
    throw new Error('VITE_API_URL debe ser el origen HTTPS de Railway, sin rutas, consultas ni credenciales.');
  }
  return url;
}
