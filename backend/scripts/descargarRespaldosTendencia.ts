// Descarga una vez, con procedencia verificable, las series NASA POWER 2005–2024 (mensual y diaria)
// del centro de cada celda meteorológica MERRA-2 que cubre Cotopaxi.
// Uso: npm run tendencia:respaldos:descargar --workspace backend. No accede a PostgreSQL.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { obtenerUrlHistorico, procesarDiarioHistorico, procesarMensualHistorico } from '../src/services/nasaHistorico.js';
import type { TipoHistorico } from '../src/services/nasaHistorico.js';
import { obtenerCeldaMeteorologica } from '../src/services/cuadriculaNasa.js';

// Centros de celda (0,5° × 0,625°): latitudes -0,5/-1/-1,5 y longitudes -79,375/-78,75/-78,125.
const LATITUDES = [-0.5, -1, -1.5];
const LONGITUDES = [-79.375, -78.75, -78.125];
const destino = new URL('../src/data/tendencia/', import.meta.url);
mkdirSync(destino, { recursive: true });
const procedencia = [];
for (const latitud of LATITUDES) {
  for (const longitud of LONGITUDES) {
    const celda = obtenerCeldaMeteorologica(latitud, longitud);
    if (!celda) throw new Error(`El punto ${latitud}, ${longitud} está sobre un borde de celda.`);
    for (const tipo of ['mensual', 'diario'] as TipoHistorico[]) {
      const url = obtenerUrlHistorico(tipo, latitud, longitud);
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'error', headers: { Accept: 'application/json' } });
      const contenido = respuesta.headers.get('content-type') ?? '';
      if (!respuesta.ok || !contenido.startsWith('application/json')) throw new Error(`NASA respondió ${respuesta.status} (${contenido}) para ${tipo} ${latitud}, ${longitud}.`);
      const bytes = Buffer.from(await respuesta.arrayBuffer());
      const consultadoEn = new Date().toISOString();
      const datos: unknown = JSON.parse(bytes.toString('utf8'));
      if (tipo === 'mensual') procesarMensualHistorico(datos, latitud, longitud, consultadoEn); else procesarDiarioHistorico(datos, latitud, longitud, consultadoEn);
      const archivo = `${tipo}_${latitud}_${longitud}.json`.replaceAll('-', 'm');
      writeFileSync(new URL(archivo, destino), bytes);
      procedencia.push({ tipo, latitud, longitud, archivo, consultado_en: consultadoEn, url: url.toString(), celda, sha256: createHash('sha256').update(bytes).digest('hex') });
      console.info(`${archivo}: HTTP ${respuesta.status}, ${bytes.byteLength} bytes`);
    }
  }
}
writeFileSync(new URL('procedencia.json', destino), `${JSON.stringify(procedencia, null, 2)}\n`);
const lineas = ['// Generado por scripts/descargarRespaldosTendencia.ts: importaciones estáticas para que la compilación copie los JSON a dist.',
  ...procedencia.map((registro, indice) => `import serie${indice} from './${registro.archivo}' with { type: 'json' };`), '',
  'export const RESPUESTAS_TENDENCIA: Record<string, unknown> = {', ...procedencia.map((registro, indice) => `  '${registro.archivo}': serie${indice},`), '};', ''];
writeFileSync(new URL('indice.ts', destino), lineas.join('\n'));
