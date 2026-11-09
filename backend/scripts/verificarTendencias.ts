import { crearClienteHistoricoNasa } from '../src/services/nasaHistorico.js';
import { construirAnual, calcularTendencia } from '../src/services/analisisTendencia.js';

// Comprobación separada de Internet, sin PostgreSQL y sin respaldos de prueba.
try {
  const cliente = crearClienteHistoricoNasa();
  const [mensual, diario] = await Promise.all([cliente.mensual(-0.93, -78.62), cliente.diario(-0.93, -78.62)]);
  const anual = construirAnual(mensual, diario);
  console.info(JSON.stringify({ modo: 'Solicitudes HTTP reales NASA POWER, Latacunga; sin acceso a PostgreSQL',
    coordenadas: { latitud: mensual.latitud, longitud: mensual.longitud }, periodo: mensual.periodo,
    consultado_en: { mensual: mensual.consultado_en, diario: diario.consultado_en },
    unidades_originales: { PRECTOTCORR: mensual.parametros.PRECTOTCORR.unidad, T2M_MIN: mensual.parametros.T2M_MIN.unidad, GWETTOP: mensual.parametros.GWETTOP.unidad },
    registros_diarios_validos: diario.valores.filter((v) => v !== null).length, anual,
    tendencias: { lluvia_mm: calcularTendencia(anual, 'lluvia_mm'), t_min: calcularTendencia(anual, 't_min'), dias_helada: calcularTendencia(anual, 'dias_helada') },
    advertencias: [...mensual.advertencias, ...diario.advertencias],
  }, null, 2));
} catch { console.error('No se pudo verificar NASA POWER en vivo. No se fabricaron series ni se modificó PostgreSQL.'); process.exitCode = 1; }
