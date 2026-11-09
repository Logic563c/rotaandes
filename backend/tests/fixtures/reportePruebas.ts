import type { DatosReporte } from '../../src/services/reportes.js';
import { construirMensual } from '../../src/services/nasaPower.js';
import { crearBasePrueba } from './nasaPruebas.js';
import { crearBasePronostico } from './pronosticoPruebas.js';
import { generarAlertas } from '../../src/services/openMeteo.js';
import { calcularCalendario } from '../../src/services/calendario.js';
import { compararRotaciones } from '../../src/services/motorRotacion.js';
import { cultivosReferenciales } from '../../src/data/catalogoCultivos.js';
import { plantillasReferenciales } from '../../src/data/catalogoPlantillas.js';

export function reportePrueba(): DatosReporte {
  const fecha = '2030-01-01T12:00:00.000Z'; const base = crearBasePrueba(fecha); const contexto = { altitudM: 3000, areaHa: 1.2, tieneRiego: false }; const mensual = construirMensual(base, 3000);
  const escenario = { lluviaPct: 0, tempDelta: 0 }; const diario = crearBasePronostico(fecha);
  return { generadoEn: fecha, terreno: { id: '00000000-0000-4000-8000-000000000001', nombre: 'Viña Ñandú de Pujilí', latitud: -0.93, longitud: -78.62, ...contexto, tipoSuelo: 'franco' },
    historial: [{ cultivo: 'Papa', fechaSiembra: '2028-10-01', fechaCosecha: null }],
    clima: { mensual, fuente: 'NASA POWER', periodo: base.periodo, actualizado_en: fecha, estado_datos: 'cache', desactualizado: false, coordenadas: { latitud: -0.93, longitud: -78.62 }, resolucion: 'Fixture regional 0,5° x 0,625°', parametros: base.parametros, advertencias: ['Prueba controlada, no una consulta actual NASA.'], metodologia: 'Climatología de prueba; lluvia transformada por el servicio existente.' },
    pronostico: { dias: diario.dias, alertas: generarAlertas(diario.dias, 2), fuente: 'Open-Meteo', actualizado_en: fecha, vigente_hasta: '2030-01-01T12:30:00.000Z', estado_datos: 'cache', zona_horaria: diario.zona_horaria, coordenadas: diario.coordenadas, cuadricula: diario.cuadricula, unidades: { temperatura: '°C', precipitacion: 'mm' }, umbral_helada_c: 2, advertencias: ['Pronóstico sintético solo para pruebas.'], aviso: 'No es una confirmación de helada.' },
    tendencia: null, cultivos: cultivosReferenciales.map((c) => ({ id: c.id, nombre: c.nombre })),
    calendario: calcularCalendario({ terreno: contexto, cultivos: cultivosReferenciales, mensual, escenario }),
    rotaciones: compararRotaciones({ terreno: contexto, prioridades: { agua: 3, suelo: 3, ingresos: 3 }, cultivos: cultivosReferenciales, plantillas: plantillasReferenciales, historial: [{ id: 'historial-fixture', cultivoId: 'papa', fechaSiembra: '2028-10-01', fechaCosecha: null }], inicio: '2030-02-01', mensual, escenario }),
    avisos: ['Fixture controlada de pruebas: no es una finca observada ni un informe de producción.'] };
}
