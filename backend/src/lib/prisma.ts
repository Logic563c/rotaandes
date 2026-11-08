import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { validarUrlBase } from './configuracionBase.js';

let clientePrisma: PrismaClient | undefined;

export function obtenerClientePrisma(): PrismaClient {
  if (!clientePrisma) {
    const esPrueba = process.env.NODE_ENV === 'test';
    const connectionString = validarUrlBase(esPrueba ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL, esPrueba);
    // PrismaPg 7.10.1 normaliza TIMESTAMPTZ sin convertir offsets: la sesión UTC preserva el instante.
    clientePrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, options: '-c TimeZone=UTC' }) });
  }
  return clientePrisma;
}

export async function cerrarConexionBase(): Promise<void> {
  const cliente = clientePrisma;
  await cliente?.$disconnect();
  clientePrisma = undefined;
}
