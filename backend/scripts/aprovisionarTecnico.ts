import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { validarUrlBase } from '../src/lib/configuracionBase.js';
import { crearTecnicoLocal } from '../src/services/aprovisionarTecnico.js';

let cliente: PrismaClient | undefined;
try {
  config({ path: new URL('../.env', import.meta.url), quiet: true });
  if (process.env.NODE_ENV === 'production' || process.stdin.isTTY) throw new Error('Destino o entrada no admitidos.');
  const argumentos = process.argv.slice(2);
  if (argumentos.some((a) => a !== '--pruebas') || argumentos.length > 1) throw new Error('Argumentos no admitidos.');
  // Ambos destinos son exclusivamente locales; el modo de pruebas requiere selección explícita.
  const pruebas = argumentos[0] === '--pruebas';
  const url = validarUrlBase(pruebas ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL, pruebas, {});
  process.stdin.setEncoding('utf8');
  let texto = ''; for await (const parte of process.stdin) { texto += String(parte); if (Buffer.byteLength(texto, 'utf8') > 4096) throw new Error('Entrada excesiva.'); }
  const entrada: unknown = JSON.parse(texto); texto = '';
  cliente = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: '-c TimeZone=UTC' }) });
  await crearTecnicoLocal(entrada, () => { if (!cliente) throw new Error('Sin conexión.'); return cliente.usuario; });
  console.info('Cuenta técnica local creada.');
} catch { console.error('No se creó la cuenta técnica. Revisa datos, correo no registrado y configuración local; no se modifican cuentas existentes.'); process.exitCode = 1; }
finally { await cliente?.$disconnect(); }
