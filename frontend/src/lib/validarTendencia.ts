import { z } from 'zod';

const numero = z.number().finite();
const anio = numero.int().min(2005).max(2024);
const estadistica = z.object({ anios_validos: z.array(anio).max(20), anios_excluidos: z.array(anio).max(20), n: numero.int().min(0).max(20),
  inicio: anio.nullable(), fin: anio.nullable(), pendiente_anual: numero.nullable(), pendiente_decada: numero.nullable(), diferencia_2005_2024: numero.nullable(),
  direccion: z.enum(['ascendente', 'descendente', 'sin_cambio', 'no_determinada']), metodo: z.string().min(1),
});
const fuente = z.object({ estado_datos: z.enum(['nasa', 'cache', 'desactualizado', 'no_disponible']), actualizado_en: z.iso.datetime().nullable(),
  desactualizado: z.boolean(), version_api: z.string().nullable(), fuentes: z.array(z.string()), periodo_declarado: z.object({ inicio: z.iso.date(), fin: z.iso.date() }).nullable(),
  url: z.url().refine((valor) => { const url = new URL(valor); return url.origin === 'https://power.larc.nasa.gov' && !url.username && !url.password && ['/api/temporal/monthly/point', '/api/temporal/daily/point'].includes(url.pathname); }),
}).refine((valor) => valor.estado_datos === 'no_disponible' ? valor.actualizado_en === null && valor.periodo_declarado === null : valor.actualizado_en !== null && valor.periodo_declarado !== null);
export const esquemaTendencia = z.object({
  anual: z.array(z.object({ anio, lluvia_mm: numero.min(0).max(732000).nullable(), t_min: numero.min(-100).max(70).nullable(), humedad_suelo: numero.min(0).max(1).nullable(), dias_helada: numero.int().min(0).max(366).nullable(),
    cobertura: z.object({ meses_lluvia: numero.int().min(0).max(12), meses_temperatura: numero.int().min(0).max(12), meses_humedad: numero.int().min(0).max(12), dias_temperatura: numero.int().min(0).max(366), dias_esperados: z.union([z.literal(365), z.literal(366)]) }),
  })).length(20), fuente: z.literal('NASA POWER'), periodo: z.object({ inicio: z.literal(2005), fin: z.literal(2024) }), coordenadas: z.object({ latitud: numero.min(-90).max(90), longitud: numero.min(-180).max(180) }), resolucion: z.string().min(1),
  unidades: z.object({ lluvia_mm: z.literal('mm/año'), t_min: z.literal('°C'), humedad_suelo: z.literal('índice 0–1'), dias_helada: z.literal('días/año') }),
  fuentes: z.object({ mensual: fuente, diario: fuente }), cobertura_diaria: z.object({ inicio: z.iso.date().nullable(), fin: z.iso.date().nullable(), dias_validos: numero.int().min(0).max(7305), dias_esperados: z.literal(7305) }),
  tendencias: z.object({ lluvia_mm: estadistica, t_min: estadistica, humedad_suelo: estadistica, dias_helada: estadistica }), advertencias: z.array(z.string()),
  metodologia: z.object({ lluvia: z.string(), temperatura: z.string(), humedad: z.string(), heladas: z.string(), estadistica: z.string() }), aviso: z.string().min(1),
}).refine((datos) => {
  if (datos.fuentes.mensual.estado_datos === 'no_disponible' && datos.fuentes.diario.estado_datos === 'no_disponible') return false;
  if (datos.cobertura_diaria.dias_validos !== datos.anual.reduce((suma, fila) => suma + fila.cobertura.dias_temperatura, 0)) return false;
  if ((datos.cobertura_diaria.dias_validos === 0) !== (datos.cobertura_diaria.inicio === null && datos.cobertura_diaria.fin === null)) return false;
  if (datos.fuentes.mensual.estado_datos === 'no_disponible' && datos.anual.some((a) => a.cobertura.meses_lluvia + a.cobertura.meses_temperatura + a.cobertura.meses_humedad > 0)) return false;
  if (datos.fuentes.diario.estado_datos === 'no_disponible' && datos.cobertura_diaria.dias_validos > 0) return false;
  return datos.anual.every((fila, indice) => {
    const esperado = fila.anio % 4 === 0 ? 366 : 365;
    return fila.anio === 2005 + indice && fila.cobertura.dias_esperados === esperado && fila.cobertura.dias_temperatura <= esperado
      && (fila.cobertura.meses_lluvia === 12) === (fila.lluvia_mm !== null) && (fila.cobertura.meses_temperatura === 12) === (fila.t_min !== null)
      && (fila.cobertura.meses_humedad === 12) === (fila.humedad_suelo !== null) && (fila.cobertura.dias_temperatura === esperado) === (fila.dias_helada !== null)
      && (fila.dias_helada === null || fila.dias_helada <= esperado);
  }) && (['lluvia_mm', 't_min', 'dias_helada', 'humedad_suelo'] as const).every((variable) => {
    const resumen = datos.tendencias[variable]; const validos = datos.anual.filter((fila) => fila[variable] !== null).map((fila) => fila.anio);
    return resumen.n === validos.length && JSON.stringify(resumen.anios_validos) === JSON.stringify(validos)
      && JSON.stringify(resumen.anios_excluidos) === JSON.stringify(datos.anual.filter((fila) => fila[variable] === null).map((fila) => fila.anio))
      && resumen.inicio === (validos[0] ?? null) && resumen.fin === (validos.at(-1) ?? null)
      && (resumen.n >= 15 ? resumen.pendiente_anual !== null && resumen.pendiente_decada !== null
        && resumen.direccion === (resumen.pendiente_anual > 0 ? 'ascendente' : resumen.pendiente_anual < 0 ? 'descendente' : 'sin_cambio')
        : resumen.pendiente_anual === null && resumen.pendiente_decada === null && resumen.direccion === 'no_determinada');
  });
});
