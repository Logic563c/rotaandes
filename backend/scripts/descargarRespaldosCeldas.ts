// Descarga, una sola vez y con procedencia verificable, la climatología oficial de NASA POWER
// para un punto interior de cada pareja de celdas (meteorológica × solar) que cubre Cotopaxi.
// Uso: npm run clima:respaldos:descargar --workspace backend
// No accede a PostgreSQL. Escribe backend/src/data/clima/celdas/*.json y procedencia.json.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { obtenerUrlNasa, procesarRespuestaNasa } from '../src/services/nasaPower.js';
import { obtenerCeldaNasa } from '../src/services/cuadriculaNasa.js';

// Centros de los tramos de cada eje donde cambia la celda meteorológica o la solar (3 decimales,
// precisión que NASA conserva sin redondear). Tramos de latitud: [-0,25; -0,75], [-0,75; -1],
// [-1; -1,25], [-1,25; -1,45]. Tramos de longitud: [-79,35; -79,0625], [-79,0625; -79],
// [-79; -78,4375], [-78,4375; -78,30].
const LATITUDES = [-0.5, -0.875, -1.125, -1.35];
const LONGITUDES = [-79.206, -79.031, -78.719, -78.369];
const destino = new URL('../src/data/clima/celdas/', import.meta.url);
mkdirSync(destino, { recursive: true });
const procedencia = [];
for (const latitud of LATITUDES) {
  for (const longitud of LONGITUDES) {
    const url = obtenerUrlNasa(latitud, longitud);
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error', headers: { Accept: 'application/json' } });
    const tipo = respuesta.headers.get('content-type') ?? '';
    if (!respuesta.ok || !tipo.startsWith('application/json')) throw new Error(`NASA respondió ${respuesta.status} (${tipo}) para ${latitud}, ${longitud}.`);
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    const consultadoEn = new Date().toISOString();
    const datos: unknown = JSON.parse(bytes.toString('utf8'));
    procesarRespuestaNasa(datos, latitud, longitud, consultadoEn);
    const celda = obtenerCeldaNasa(latitud, longitud);
    if (!celda) throw new Error(`El punto ${latitud}, ${longitud} está sobre un borde de celda.`);
    const archivo = `celda_${latitud}_${longitud}.json`.replaceAll('-', 'm');
    writeFileSync(new URL(archivo, destino), bytes);
    procedencia.push({ latitud, longitud, archivo, consultado_en: consultadoEn, url: url.toString(), celda, sha256: createHash('sha256').update(bytes).digest('hex') });
    console.info(`${archivo}: HTTP ${respuesta.status}, ${bytes.byteLength} bytes`);
  }
}
writeFileSync(new URL('procedencia.json', destino), `${JSON.stringify(procedencia, null, 2)}\n`);
