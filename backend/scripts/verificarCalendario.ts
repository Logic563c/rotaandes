import 'dotenv/config';
import { obtenerClientePrisma, cerrarConexionBase } from '../src/lib/prisma.js';
import { calcularCalendario, IDS_CULTIVOS_CALENDARIO, esquemaCultivosCalendario } from '../src/services/calendario.js';
import { construirMensual, crearClienteNasa } from '../src/services/nasaPower.js';

try {
  const cultivos = await obtenerClientePrisma().$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return tx.cultivo.findMany({ where: { id: { in: [...IDS_CULTIVOS_CALENDARIO] } } });
  });
  if (!esquemaCultivosCalendario.safeParse(cultivos).success || cultivos.length !== IDS_CULTIVOS_CALENDARIO.length) throw new Error('Catálogo incompleto.');
  const clima = await crearClienteNasa()(-0.93, -78.62);
  // Punto de verificación, sin inventar un lote ni su altitud, riego o área. No hay escrituras SQL.
  const celdas = calcularCalendario({ terreno: { altitudM: null, tieneRiego: null, areaHa: null }, cultivos, mensual: construirMensual(clima, null), elevacionCeldaM: clima.elevacion_celda_m ?? null });
  console.info(JSON.stringify({ comprobacion: 'NASA real + catálogo PostgreSQL, transacción de solo lectura', coordenadas: { latitud: clima.latitud, longitud: clima.longitud }, periodo: clima.periodo, consultado_en: clima.consultado_en,
    contexto: 'Punto de verificación con altitud, riego y área desconocidos. No es una recomendación para una parcela.', cultivos: cultivos.length, celdas: celdas.length,
    estados: Object.fromEntries(['recomendado', 'posible_con_cuidado', 'no_recomendado', 'no_determinado'].map((estado) => [estado, celdas.filter((celda) => celda.estado === estado).length])),
    ejemplo: celdas.find((celda) => celda.cultivo_id === 'papa' && celda.mes === 1) }, null, 2));
} catch { console.error('No se pudo verificar el calendario con datos reales. No se inventaron resultados ni se escribieron datos de prueba.'); process.exitCode = 1; }
finally { await cerrarConexionBase(); }
