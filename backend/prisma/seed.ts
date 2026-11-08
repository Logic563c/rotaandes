import 'dotenv/config';
import { obtenerClientePrisma, cerrarConexionBase } from '../src/lib/prisma.js';
import { cargarCultivos } from '../src/data/catalogoCultivos.js';

try {
  if (process.env.NODE_ENV === 'test') throw new Error('La semilla de desarrollo no se ejecuta en modo de pruebas.');
  await obtenerClientePrisma().$transaction(async (base) => { await cargarCultivos(base); });
  console.info('Diez cultivos referenciales cargados. No se crearon usuarios ni plantillas.');
} catch {
  console.error('No se pudo cargar el catálogo. Revisa la configuración y las migraciones locales.');
  process.exitCode = 1;
} finally { await cerrarConexionBase(); }
