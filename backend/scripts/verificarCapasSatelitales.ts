import { mkdir, writeFile } from 'node:fs/promises';
import { metadatosCapa, validarConsultaCapa } from '../src/data/catalogoCapas.js';
import { crearServicioCapas } from '../src/services/capasSatelitales.js';

try {
  const directorio = new URL('../../.tmp/evidencias-capas/', import.meta.url); await mkdir(directorio, { recursive: true });
  const consultar = crearServicioCapas(); const resultados = [];
  for (const tipo of ['ndvi', 'humedad_suelo'] as const) {
    const consulta = validarConsultaCapa(tipo, { anio: '2023', mes: '1' }); const imagen = await consultar(consulta);
    const metadatos = metadatosCapa(consulta);
    await writeFile(new URL(`${tipo}-${consulta.fecha}.png`, directorio), imagen.bytes);
    resultados.push({ ...metadatos, bytes: imagen.bytes.length, sha256: imagen.sha256, consultado_en: imagen.consultado_en, origen: imagen.origen, pixeles_visibles: imagen.visible });
    console.info(JSON.stringify({ tipo, producto: metadatos.producto, fecha: consulta.fecha, resolucion_m: metadatos.resolucion_m, unidad: metadatos.unidad, formato: metadatos.formato, bytes: imagen.bytes.length, sha256: imagen.sha256, pixeles_visibles: imagen.visible }));
  }
  await writeFile(new URL('verificacion-real.json', directorio), JSON.stringify({ modo: 'NASA GIBS real, sin credenciales ni operaciones SQL', resultados }, null, 2));
  if (resultados.some((resultado) => !resultado.pixeles_visibles)) process.exitCode = 1;
} catch { console.error('No se pudo verificar la visualización NASA. No se muestran rutas privadas ni detalles internos.'); process.exitCode = 1; }
