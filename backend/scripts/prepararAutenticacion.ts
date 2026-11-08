import { randomBytes } from 'node:crypto';
import { readFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { obtenerSecretoJwt } from '../src/services/autenticacion.js';

const ruta = fileURLToPath(new URL('../.env', import.meta.url));
try {
  const contenido = await readFile(ruta, 'utf8');
  const entorno = parse(contenido);
  if (entorno.JWT_SECRET) {
    obtenerSecretoJwt(entorno);
    console.info('JWT_SECRET existente validado; no se modificó.');
  } else {
    await appendFile(ruta, `${contenido.endsWith('\n') ? '' : '\n'}JWT_SECRET=${randomBytes(48).toString('base64url')}\n`, { encoding: 'utf8', mode: 0o600 });
    console.info('JWT_SECRET generado en backend/.env privado.');
  }
} catch {
  console.error('No se pudo preparar JWT_SECRET. Comprueba backend/.env y su configuración; no se modificaron contraseñas.');
  process.exitCode = 1;
}
