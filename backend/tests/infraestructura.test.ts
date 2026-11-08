import { createRailwayContext, project } from 'railway/iac';
import { describe, expect, it } from 'vitest';
import definirInfraestructura from '../../.railway/railway.js';

describe('Infraestructura: limitar el destino y separar permisos antes de aplicar', () => {
  it.each([{ projectName: 'otro', environment: 'production' }, { projectName: 'rotaandes', environment: 'pruebas' }, {}])('rechaza un contexto diferente del autorizado (%#)', (contexto) => {
    expect(() => definirInfraestructura(createRailwayContext(contexto), project)).toThrow();
  });
  it('declara solo PostgreSQL privado y backend sin autodeploy ni secretos literales', async () => {
    const definicion = await definirInfraestructura(createRailwayContext({ projectName: 'rotaandes', environment: 'production' }), project);
    const recursos = definicion.resources?.flat();
    expect(recursos).toHaveLength(2);
    const base = recursos?.find((recurso) => recurso.name === 'postgres');
    const servidor = recursos?.find((recurso) => recurso.name === 'backend');
    if (base?.type !== 'database' || servidor?.type !== 'service') throw new Error('Recursos esperados ausentes.');
    expect(base.networking?.tcpProxies).toEqual({});
    expect(servidor.source?.repo).toBeUndefined();
    expect(servidor.deploy?.preDeployCommand).toEqual(['npm run produccion:preparar --workspace backend']);
    expect(servidor.variables?.JWT_SECRET).toEqual({ type: 'sharedReference', name: 'ROTAANDES_JWT_SECRET' });
    expect(servidor.variables?.DATABASE_USER).toEqual({ type: 'literal', value: 'rotaandes_app' });
    expect(servidor.variables?.DATABASE_URL).toEqual({ type: 'reference', resource: 'database.postgres', output: 'ROTAANDES_DATABASE_URL' });
  });
});
