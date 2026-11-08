import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { validarUrlBase } from './configuracionBase.js';

let clientePrisma: PrismaClient | undefined;

export function obtenerClientePrisma(): PrismaClient {
  if (!clientePrisma) {
    const connectionString = validarUrlBase(process.env.DATABASE_URL);
    clientePrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  return clientePrisma;
}

export async function cerrarConexionBase(): Promise<void> {
  const cliente = clientePrisma;
  await cliente?.$disconnect();
  clientePrisma = undefined;
}
