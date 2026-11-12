import type { Cultivo, Terreno, Siembra, PrismaClient } from '../generated/prisma/client.js';
import type { UsuarioPublico } from './autenticacion.js';
import { areaPoligonoM2, leerPoligonoGuardado } from './geometriaTerreno.js';

export type BaseAgricola = Pick<PrismaClient, 'terreno' | 'siembra' | 'cultivo' | 'plantillaRotacion'>;
export type ObtenerBaseAgricola = () => BaseAgricola;

export function filtroTerrenos(usuario: UsuarioPublico) {
  return usuario.rol === 'agricultor' ? { usuarioId: usuario.id } : {};
}

export function publicarTerreno(terreno: Terreno) {
  return { id: terreno.id, usuario_id: terreno.usuarioId, nombre: terreno.nombre, latitud: terreno.latitud,
    longitud: terreno.longitud, altitud_m: terreno.altitudM, area_ha: terreno.areaHa?.toNumber() ?? null,
    tiene_riego: terreno.tieneRiego, tipo_suelo: terreno.tipoSuelo, creado_en: terreno.creadoEn?.toISOString() ?? null,
    ...publicarDelimitacion(terreno.poligono) };
}
/** Delimitación opcional: geometría GeoJSON y superficie aproximada derivada (solo lectura, no reemplaza area_ha). */
export function publicarDelimitacion(valor: unknown) {
  const poligono = leerPoligonoGuardado(valor);
  return { poligono, area_poligono_m2: poligono ? Math.round(areaPoligonoM2(poligono.coordinates[0] ?? []) * 10) / 10 : null };
}
export function publicarSiembra(siembra: Siembra) {
  return { id: siembra.id, terreno_id: siembra.terrenoId, cultivo_id: siembra.cultivoId,
    fecha_siembra: siembra.fechaSiembra.toISOString().slice(0, 10), fecha_cosecha: siembra.fechaCosecha?.toISOString().slice(0, 10) ?? null,
    notas: siembra.notas, creado_en: siembra.creadoEn?.toISOString() ?? null };
}
export function publicarCultivo(cultivo: Cultivo) {
  return { id: cultivo.id, nombre: cultivo.nombre, familia: cultivo.familia, altitud_min: cultivo.altitudMin,
    altitud_max: cultivo.altitudMax, ciclo_meses: cultivo.cicloMeses, meses_siembra: cultivo.mesesSiembra,
    lluvia_min_mensual_mm: cultivo.lluviaMinMensualMm, demanda_agua: cultivo.demandaAgua,
    tolerancia_helada: cultivo.toleranciaHelada, tolerancia_sequia: cultivo.toleranciaSequia, fija_nitrogeno: cultivo.fijaNitrogeno,
    aporte_materia_organica: cultivo.aporteMateriaOrganica, proteccion_erosion: cultivo.proteccionErosion,
    valor_forraje: cultivo.valorForraje, valor_mercado: cultivo.valorMercado, descripcion: cultivo.descripcion };
}
