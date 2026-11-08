import 'dotenv/config';
import { obtenerClientePrisma, cerrarConexionBase } from '../src/lib/prisma.js';
import { cargarPlantillas } from '../src/data/catalogoPlantillas.js';

try {
  if (process.env.NODE_ENV === 'test') throw new Error('No ejecutar la semilla de desarrollo en modo test.');
  await obtenerClientePrisma().$transaction(cargarPlantillas);
  console.info('Ocho plantillas originales verificadas/cargadas, sin usuarios ni siembras.');
} catch {
  console.error('No se pudo preparar las plantillas originales. Revisa configuración y coincidencia del catálogo; no se reemplazan definiciones diferentes.');
  process.exitCode = 1;
} finally { await cerrarConexionBase(); }
