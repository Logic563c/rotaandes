import { defineRailway, postgres, project, ref, service } from 'railway/iac';

// Declarar recursos no los crea: planificar y aplicar solo sobre el proyecto aprobado.
export default defineRailway((contexto) => {
  if (contexto.projectName !== 'rotaandes' || !contexto.isEnvironment('production')) {
    throw new Error('Esta configuración solo admite el proyecto rotaandes, entorno production.');
  }
  const base = postgres('postgres');
  base.networking = { tcpProxies: {}, serviceDomains: {}, customDomains: {} };
  base.variables = {
    ROTAANDES_APP_PASSWORD: contexto.shared.ROTAANDES_APP_PASSWORD,
    ROTAANDES_DATABASE_URL: { type: 'literal', value: 'postgresql://rotaandes_app:${{postgres.ROTAANDES_APP_PASSWORD}}@${{postgres.PGHOST}}:${{postgres.PGPORT}}/rotaandes_prod' },
  };
  const servidor = service('backend', {
    // Sin source GitHub: no hay autodeploy; subir únicamente la revisión aprobada.
    root: '/',
    build: { builder: 'RAILPACK', buildCommand: 'npm ci --include=dev && npm run build --workspace backend' },
    start: 'npm run start --workspace backend',
    preDeploy: 'npm run produccion:preparar --workspace backend',
    healthcheck: '/api/health',
    healthcheckTimeout: 60,
    replicas: 1,
    deploy: { restartPolicyType: 'ON_FAILURE', restartPolicyMaxRetries: 3, limitOverride: { containers: { cpu: 1, memoryBytes: 536870912 } } },
    env: {
      NODE_ENV: 'production', TRUST_PROXY_HOPS: '1', UMBRAL_HELADA_C: '2',
      CORS_ORIGIN: contexto.shared.ROTAANDES_CORS_ORIGIN,
      JWT_SECRET: contexto.shared.ROTAANDES_JWT_SECRET,
      DATABASE_URL: ref(base, 'ROTAANDES_DATABASE_URL'),
      DATABASE_HOST: base.env.PGHOST, DATABASE_NAME: 'rotaandes_prod', DATABASE_USER: 'rotaandes_app',
      RAILPACK_NODE_VERSION: '24.20.0', RAILPACK_NODE_NPM_INSTALL: 'npm ci --include=dev',
      RAILPACK_NO_SPA: 'true', RAILPACK_PRUNE_DEPS: 'false',
    },
  });
  return project('rotaandes', { resources: [base, servidor] });
});
