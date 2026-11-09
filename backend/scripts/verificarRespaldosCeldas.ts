// Comprueba en vivo que NASA POWER devuelve, para puntos aleatorios dentro de cada pareja de celdas,
// exactamente los mismos valores climatológicos archivados en backend/src/data/clima/celdas/.
// Uso: npm run clima:respaldos:verificar --workspace backend. No accede a PostgreSQL.
import { readFileSync } from 'node:fs';
import { obtenerUrlNasa, procesarRespuestaNasa, PARAMETROS_NASA } from '../src/services/nasaPower.js';
import { obtenerCeldaNasa, PASO_LATITUD_METEOROLOGIA, PASO_LONGITUD_METEOROLOGIA } from '../src/services/cuadriculaNasa.js';
import procedencia from '../src/data/clima/celdas/procedencia.json' with { type: 'json' };

const PUNTOS_POR_CELDA = Number(process.env.PUNTOS_POR_CELDA ?? 2);
let diferencias = 0; let consultas = 0;
for (const registro of procedencia) {
  const archivada = procesarRespuestaNasa(JSON.parse(readFileSync(new URL(`../src/data/clima/celdas/${registro.archivo}`, import.meta.url), 'utf8')), registro.latitud, registro.longitud, registro.consultado_en);
  const { meteorologia, solar } = registro.celda;
  const latMin = Math.max((meteorologia.fila - 0.5) * PASO_LATITUD_METEOROLOGIA - 90, solar.fila);
  const latMax = Math.min((meteorologia.fila + 0.5) * PASO_LATITUD_METEOROLOGIA - 90, solar.fila + 1);
  const lonMin = Math.max((meteorologia.columna - 0.5) * PASO_LONGITUD_METEOROLOGIA - 180, solar.columna);
  const lonMax = Math.min((meteorologia.columna + 0.5) * PASO_LONGITUD_METEOROLOGIA - 180, solar.columna + 1);
  for (let indice = 0; indice < PUNTOS_POR_CELDA; indice++) {
    const latitud = Math.round((latMin + 0.002 + Math.random() * (latMax - latMin - 0.004)) * 1e6) / 1e6;
    const longitud = Math.round((lonMin + 0.002 + Math.random() * (lonMax - lonMin - 0.004)) * 1e6) / 1e6;
    if (JSON.stringify(obtenerCeldaNasa(latitud, longitud)) !== JSON.stringify(registro.celda)) throw new Error(`Punto ${latitud}, ${longitud} fuera de la celda esperada.`);
    const respuesta = await fetch(obtenerUrlNasa(latitud, longitud), { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } });
    consultas++;
    const viva = procesarRespuestaNasa(await respuesta.json(), latitud, longitud, new Date().toISOString());
    const distintos = PARAMETROS_NASA.filter((clave) => JSON.stringify(viva.parametros[clave].valores) !== JSON.stringify(archivada.parametros[clave].valores));
    if (distintos.length) diferencias++;
    console.info(`${registro.archivo} ← (${latitud}, ${longitud}): ${distintos.length ? `DIFERENTE en ${distintos.join(', ')}` : 'idéntico en los 8 parámetros × 12 meses'}`);
  }
}
console.info(JSON.stringify({ consultas, diferencias, verificado_en: new Date().toISOString() }));
if (diferencias) process.exitCode = 1;
