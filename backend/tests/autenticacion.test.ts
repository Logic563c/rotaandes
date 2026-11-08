import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { obtenerSecretoJwt, firmarToken, verificarToken, DURACION_SESION_SEGUNDOS } from '../src/services/autenticacion.js';

describe('Configuración y firma JWT', () => {
  it.each([undefined, '', 'cambiar-por-un-secreto', 'x'.repeat(32)])('rechaza secreto ausente o insuficiente (%#)', (JWT_SECRET) => {
    expect(() => obtenerSecretoJwt(JWT_SECRET === undefined ? {} : { JWT_SECRET })).toThrow('JWT_SECRET');
  });
  it('firma HS256 con vencimiento de 15 minutos y sujeto válido', () => {
    const secreto = randomBytes(48).toString('base64url');
    expect(obtenerSecretoJwt({ JWT_SECRET: secreto }) === secreto).toBe(true);
    const id = randomUUID();
    const token = firmarToken(id, secreto);
    expect(verificarToken(token, secreto) === id).toBe(true);
    const datos = jwt.decode(token, { complete: true });
    expect(datos?.header.alg).toBe('HS256');
    if (!datos || typeof datos.payload === 'string') throw new Error('Contenido de prueba inválido.');
    expect(Number(datos.payload.exp) - Number(datos.payload.iat)).toBe(DURACION_SESION_SEGUNDOS);
    expect(datos.payload.rol).toBeUndefined();
  });
});
