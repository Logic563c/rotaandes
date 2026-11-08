import { crearClienteNasa, construirMensual, PARAMETROS_NASA } from '../src/services/nasaPower.js';
try {
  const base = await crearClienteNasa()(-0.93, -78.62);
  console.info(JSON.stringify({ comprobacion: 'HTTP real NASA POWER, sin acceso a PostgreSQL', coordenadas: [base.latitud, base.longitud], periodo: base.periodo,
    consultado_en: base.consultado_en, unidades: Object.fromEntries(PARAMETROS_NASA.map((clave) => [clave, base.parametros[clave].unidad])), enero: construirMensual(base, null)[0] }, null, 2));
} catch { console.error('No se pudo verificar NASA POWER en vivo; no se fabricaron datos.'); process.exitCode = 1; }
