import { z } from 'zod';
import { ErrorHttp } from '../middleware/errores.js';

const nombre = z.string().trim().min(2).max(120).refine((valor) => Array.from(valor).every((letra) => letra.charCodeAt(0) >= 32 && letra.charCodeAt(0) !== 127));
export const camposTerreno = z.strictObject({
  nombre,
  latitud: z.number().finite().min(-90).max(90),
  longitud: z.number().finite().min(-180).max(180),
  area_ha: z.number().finite().positive().max(999999.99).multipleOf(0.01).nullable().optional(),
  tiene_riego: z.boolean().optional(),
  tipo_suelo: z.enum(['franco', 'arenoso', 'arcilloso', 'no_se']).nullable().optional(),
});
export const cambiosTerreno = camposTerreno.partial().refine((valor) => Object.keys(valor).length > 0);

export function esFechaReal(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
const fecha = z.string().refine(esFechaReal);
export const camposSiembra = z.strictObject({
  cultivo_id: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  fecha_siembra: fecha,
  fecha_cosecha: fecha.nullable().optional(),
  notas: z.string().trim().max(2000).refine((valor) => !valor.includes('\0')).nullable().optional(),
});
export const cambiosSiembra = camposSiembra.partial().refine((valor) => Object.keys(valor).length > 0);

export function validarDatosAgricolas<T>(esquema: z.ZodType<T>, datos: unknown): T {
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return resultado.data;
  const problema = resultado.error.issues[0];
  const mensajes: Record<string, string> = {
    nombre: 'El nombre debe tener entre 2 y 120 caracteres, sin caracteres de control.',
    latitud: 'La latitud debe ser un número entre -90 y 90.',
    longitud: 'La longitud debe ser un número entre -180 y 180.',
    area_ha: 'El área debe ser mayor que cero, hasta 999999,99 ha y con un máximo de dos decimales.',
    tiene_riego: 'Indica el riego con verdadero o falso.',
    tipo_suelo: 'Elige franco, arenoso, arcilloso o no_se como tipo de suelo.',
    cultivo_id: 'Selecciona un cultivo válido del catálogo.',
    fecha_siembra: 'Introduce una fecha de siembra real en formato AAAA-MM-DD.',
    fecha_cosecha: 'Introduce una fecha de cosecha real o nula, en formato AAAA-MM-DD.',
    notas: 'Las notas admiten hasta 2000 caracteres y no admiten caracteres nulos.',
  };
  const campo = problema?.path[0];
  throw new ErrorHttp(400, problema?.code === 'unrecognized_keys' ? 'La solicitud contiene campos no permitidos.'
    : typeof campo === 'string' ? mensajes[campo] ?? 'Revisa los datos enviados.' : 'Indica los campos que deseas guardar.');
}

export function validarId(valor: unknown): string {
  const resultado = z.uuid().safeParse(valor);
  if (!resultado.success) throw new ErrorHttp(400, 'El identificador debe ser un UUID válido.');
  return resultado.data;
}

export function validarOrdenFechas(siembra: string, cosecha: string | null): void {
  if (cosecha && cosecha < siembra) throw new ErrorHttp(400, 'La cosecha no puede ser anterior a la siembra.');
}
