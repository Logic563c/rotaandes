import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cultivosReferenciales } from '../src/data/catalogoCultivos.js';

describe('Transcripción del catálogo autorizado', () => {
  it('conserva todos los campos y valores de los diez cultivos de PROYECTO.md', () => {
    const documento = readFileSync(new URL('../../PROYECTO.md', import.meta.url), 'utf8');
    const seccion = documento.split('## 10. Datos semilla:')[1]?.split('### Plantillas')[0] ?? '';
    const filas = seccion.split('\n').map((linea) => linea.split('|').slice(1, -1).map((celda) => celda.trim()))
      .filter((celdas) => celdas.length === 15 && cultivosReferenciales.some((cultivo) => cultivo.id === celdas[0]));
    expect(filas).toHaveLength(10);
    expect(cultivosReferenciales).toHaveLength(10);
    for (const fila of filas) {
      const [id, nombre, familia, alturas, ciclo, meses, lluvia, agua, helada, sequia, nitrogeno, materia, erosion, forraje, mercado] = fila;
      const [minima, maxima] = (alturas ?? '').split('–').map(Number);
      expect(cultivosReferenciales.find((cultivo) => cultivo.id === id)).toEqual({ id, nombre, familia, altitudMin: minima, altitudMax: maxima,
        cicloMeses: Number(ciclo), mesesSiembra: meses?.startsWith('1..12') ? Array.from({ length: 12 }, (_valor, indice) => indice + 1) : meses?.split(',').map(Number),
        lluviaMinMensualMm: Number(lluvia), demandaAgua: Number(agua), toleranciaHelada: Number(helada), toleranciaSequia: Number(sequia), fijaNitrogeno: nitrogeno === 'sí',
        aporteMateriaOrganica: Number(materia), proteccionErosion: Number(erosion), valorForraje: Number(forraje), valorMercado: Number(mercado), descripcion: null });
    }
  });
});
