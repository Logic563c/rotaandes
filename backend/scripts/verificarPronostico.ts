import { crearClientePronostico, generarAlertas } from '../src/services/openMeteo.js';
try {
  const base = await crearClientePronostico()(-0.93, -78.62);
  console.info(JSON.stringify({ comprobacion: 'HTTP real Open-Meteo; sin acceso a PostgreSQL', ...base, unidades: { temperatura: '°C', precipitacion: 'mm' }, alertas: generarAlertas(base.dias, 2) }, null, 2));
} catch { console.error('No se pudo verificar Open-Meteo en vivo. No se fabricaron pronósticos.'); process.exitCode = 1; }
