// Perfiles agronómicos del calendario: cada parámetro indica su fuente. Los valores ausentes se
// conservan como null y el calendario los trata como "no determinado"; nunca se completan por suposición.
// Detalle de fuentes, extracción y limitaciones: docs/INFORME_CALENDARIO_AGRONOMICO.md.

export type ClaveFuente = 'proyecto_s10' | 'iniap_hortalizas_2011' | 'fao_agua_1986' | 'fao_56_1998' | 'fao_ecocrop'
  | 'naranjo_melloco_2018' | 'utc_papa_nabo_2017' | 'cordova_gradiente_2016' | 'isu_heladas_hortalizas' | 'fao_heladas_2005';

export interface FuenteAgronomica { clave: ClaveFuente; cita: string; referencia: string; url: string; uso: string }

export const FUENTES_AGRONOMICAS: Record<ClaveFuente, FuenteAgronomica> = {
  isu_heladas_hortalizas: { clave: 'isu_heladas_hortalizas', cita: 'Iowa State University (Nair)', referencia: 'Nair, A. Frost Management in Vegetables. Iowa State University Extension and Outreach. Tabla de cultivos susceptibles y tolerantes a heladas leves en campo.',
    url: 'https://www.extension.iastate.edu/smallfarms/frost-management-vegetables', uso: 'Tolerancia cualitativa a heladas leves de col, remolacha, zanahoria, coliflor, apio, acelga, cebolla de bulbo y rábano. No documenta inmunidad a heladas fuertes ni adaptación de variedades de Cotopaxi.' },
  fao_heladas_2005: { clave: 'fao_heladas_2005', cita: 'FAO (Snyder y de Melo-Abreu, 2005)', referencia: 'Snyder, R. L. y de Melo-Abreu, J. P. (2005). Frost protection: fundamentals, practice, and economics. Vol. 1, cap. 4. FAO. Introducción y tabla 4.5.',
    url: 'https://www.fao.org/4/y7223e/y7223e0a.htm', uso: 'Sensibilidad de lechuga cerca de 0 °C y respuesta cualitativa al frío de cilantro y nabo en campo (tabla 4.5). Variedad, endurecimiento y etapa alteran el daño. No se trasladan temperaturas de almacenamiento de la tabla 4.4 al cultivo vivo.' },
  proyecto_s10: { clave: 'proyecto_s10', cita: 'Catálogo del proyecto (PROYECTO.md §10)', referencia: 'RotaAndes, PROYECTO.md §10: catálogo semilla de cultivos de Cotopaxi (valores aproximados pendientes de validación MAG/INIAP).',
    url: 'PROYECTO.md', uso: 'Rangos de altitud, ventanas de siembra, ciclo en meses y tolerancia a heladas de los 10 cultivos originales (referenciales).' },
  iniap_hortalizas_2011: { clave: 'iniap_hortalizas_2011', cita: 'INIAP (Yugsi, 2011)', referencia: 'Yugsi, L. (2011). Producción limpia de hortalizas. Guía de campo para capacitación a capacitadores. Boletín Técnico 408. INIAP, Estación Experimental Santa Catalina, Quito.',
    url: 'https://repositorio.iniap.gob.ec/items/cc17f928-17fa-4ff8-a44e-ed9dfc740196', uso: 'Siembra directa o trasplante (Cuadro 3, p. 20); las hortalizas pueden sembrarse todo el año (p. 7); riego durante todo el cultivo (pp. 18 y 21); cosecha de hojas (p. 25).' },
  fao_agua_1986: { clave: 'fao_agua_1986', cita: 'FAO (Brouwer y Heibloem, 1986)', referencia: 'Brouwer, C. y Heibloem, M. (1986). Irrigation Water Management: Irrigation Water Needs. Training manual n.º 3, cap. 3. FAO, Roma.',
    url: 'https://www.fao.org/4/s2022e/s2022e07.htm', uso: 'Duración total del ciclo (Tabla 6) y necesidad de agua por ciclo con sensibilidad a sequía (Tabla 14). El ciclo es más largo en clima frío.' },
  fao_56_1998: { clave: 'fao_56_1998', cita: 'FAO-56 (Allen et al., 1998)', referencia: 'Allen, R. G., Pereira, L. S., Raes, D. y Smith, M. (1998). Crop evapotranspiration. FAO Irrigation and Drainage Paper 56, Tabla 11.',
    url: 'https://www.fao.org/4/x0490e/x0490e0b.htm', uso: 'Duración de etapas y ciclo total de hortalizas no incluidas en la Tabla 6 de FAO (1986).' },
  fao_ecocrop: { clave: 'fao_ecocrop', cita: 'FAO EcoCrop', referencia: 'FAO. Base de datos EcoCrop (ecocrop.fao.org). Copia tabular EcoCrop_DB.csv publicada por OpenCLIM; SHA-256 4187e8846336e185c4583165211c5981855e95adfbefd897bd2bd481de48d106.',
    url: 'https://github.com/OpenCLIM/ecocrop', uso: 'Temperatura media del periodo de cultivo (mínima absoluta, óptima y máxima absoluta), lluvia anual de referencia, ciclo en días y drenaje.' },
  naranjo_melloco_2018: { clave: 'naranjo_melloco_2018', cita: 'Naranjo et al. (2018)', referencia: 'Naranjo, E., Tapia, C., Velázquez, R., Cruz, Y., Delgado, A., Borja, E. y Paredes, N. (2018). Caracterización eco-geográfica de melloco (Ullucus tuberosus C.) en la región alto andina del Ecuador. La Técnica, 19, 31-46.',
    url: 'https://agris.fao.org/search/ar/records/68878f457fd4d06c32a92104', uso: 'Sitios de colecta más frecuentes de melloco en Ecuador: 1800-3800 m y temperatura media de 5-20 °C.' },
  utc_papa_nabo_2017: { clave: 'utc_papa_nabo_2017', cita: 'UTC (2017)', referencia: 'Universidad Técnica de Cotopaxi (2017). Producción del cultivo de papa nabo (Brassica rapa) con la aplicación de abonos orgánicos. Trabajo de titulación.',
    url: 'https://repositorio.utc.edu.ec/bitstreams/ee338a01-ceda-453a-81f1-ec054695ab8f/download', uso: 'Identificación regional de «papa nabo» como Brassica rapa (nabo de mesa).' },
  cordova_gradiente_2016: { clave: 'cordova_gradiente_2016', cita: 'Córdova et al. (2016)', referencia: 'Córdova, M., Célleri, R., Shellito, C. J., Orellana-Alvear, J., Abril, A. y Carrillo-Rojas, G. (2016). Near-surface air temperature lapse rate over complex terrain in the southern Ecuadorian Andes. Arctic, Antarctic, and Alpine Research, 48(4), 673-684.',
    url: 'https://doi.org/10.1657/AAAR0015-077', uso: 'Gradiente observado de 6,9 °C/km para la temperatura media (2600-4200 m), usado para estimar la temperatura media a la altitud del terreno.' },
};

export type CategoriaCultivo = 'hoja' | 'flor' | 'raiz' | 'cebolla' | 'fruto' | 'leguminosa' | 'grano' | 'tuberculo' | 'forraje';
export const CATEGORIAS_CULTIVO: Record<CategoriaCultivo, { nombre: string; orden: number; es_hortaliza: boolean }> = {
  hoja: { nombre: 'Hortalizas de hoja', orden: 1, es_hortaliza: true },
  flor: { nombre: 'Hortalizas de flor', orden: 2, es_hortaliza: true },
  raiz: { nombre: 'Hortalizas de raíz', orden: 3, es_hortaliza: true },
  cebolla: { nombre: 'Cebollas', orden: 4, es_hortaliza: true },
  fruto: { nombre: 'Cucurbitáceas (fruto)', orden: 5, es_hortaliza: true },
  leguminosa: { nombre: 'Leguminosas', orden: 6, es_hortaliza: false },
  grano: { nombre: 'Cereales y granos andinos', orden: 7, es_hortaliza: false },
  tuberculo: { nombre: 'Tubérculos andinos', orden: 8, es_hortaliza: false },
  forraje: { nombre: 'Forrajes y abonos verdes', orden: 9, es_hortaliza: false },
};

export type Establecimiento = 'siembra_directa' | 'trasplante' | 'no_documentado';
/** Rango de temperatura media mensual del periodo de cultivo (°C), según EcoCrop. */
export interface RangoTemperatura { minima: number; optima_min: number; optima_max: number; maxima: number }
export interface Intervalo { min: number; max: number }
/**
 * Cómo responde el calendario a un mes con riesgo de helada alto dentro del ciclo cuando el cultivo no tiene
 * tolerancia en el catálogo original. Sembrable todo el año no equivale a tolerante a heladas.
 * Las clases son cualitativas y no inventan temperaturas letales ni índices de rotación.
 */
export type RespuestaHeladaPerfil = 'tolera_helada_leve' | 'sensible' | null;

export interface PerfilAgronomico {
  id: string; nombre: string; nombre_cientifico: string; nota_denominacion: string | null;
  categoria: CategoriaCultivo; familia_botanica: string;
  establecimiento: Establecimiento; cosecha: string | null;
  ciclo_dias: Intervalo; fuente_ciclo: ClaveFuente;
  temperatura: RangoTemperatura | null; fuente_temperatura: ClaveFuente | null;
  lluvia_anual_mm: { minima: number; optima_min: number; optima_max: number; maxima: number } | null;
  necesidad_agua_ciclo_mm: Intervalo | null; sensibilidad_sequia: string | null;
  altitud_documentada_m: Intervalo | null; fuente_altitud: ClaveFuente | null;
  siembra_todo_el_anio_iniap: boolean; riego_en_manejo_iniap: boolean; requiere_agua_permanente: boolean;
  respuesta_helada: RespuestaHeladaPerfil; fuente_helada: ClaveFuente | null;
  consideraciones_rotacion: string[]; pendientes: string[]; fuentes: ClaveFuente[];
}

const PENDIENTE_LOCAL = 'Validación agronómica local (MAG/INIAP) de parámetros, variedades y épocas en Cotopaxi.';
const SIN_HELADA = 'Tolerancia a heladas sin fuente verificada: con indicador de frío medio o alto no se determina la siembra.';
const SIN_AGUA = 'Necesidad de agua por ciclo sin fuente verificada: sin riego no se compara con la lluvia.';
const ROTACION_BRASICAS = 'Familia Brassicaceae: evitar sembrarla seguida de otra brásica (col, coliflor, brócoli, nabo, rábano, col china o berro).';
const ROTACION_HORTALIZAS_INIAP = 'INIAP (2011) recomienda hortalizas después de papa o maíz para aprovechar nutrientes y reducir plagas (p. 7), pero también advierte malezas tras esos cultivos (p. 16): planificar el control.';

function perfil(datos: Omit<PerfilAgronomico, 'fuentes'>): PerfilAgronomico {
  const resistentesLeves = ['col', 'remolacha', 'zanahoria', 'cebolla_colorada', 'coliflor', 'rabano', 'apio', 'acelga'];
  const respuesta: { respuesta_helada: RespuestaHeladaPerfil; fuente_helada: ClaveFuente | null } = resistentesLeves.includes(datos.id)
    ? { respuesta_helada: 'tolera_helada_leve', fuente_helada: 'isu_heladas_hortalizas' }
    : ['cilantro', 'papa_nabo'].includes(datos.id) ? { respuesta_helada: 'tolera_helada_leve', fuente_helada: 'fao_heladas_2005' }
      : datos.id === 'lechuga' ? { respuesta_helada: 'sensible', fuente_helada: 'fao_heladas_2005' }
        : { respuesta_helada: datos.respuesta_helada, fuente_helada: datos.fuente_helada };
  const fuentes = new Set<ClaveFuente>([datos.fuente_ciclo]);
  if (respuesta.fuente_helada) fuentes.add(respuesta.fuente_helada);
  if (datos.fuente_temperatura) fuentes.add(datos.fuente_temperatura);
  if (datos.lluvia_anual_mm) fuentes.add('fao_ecocrop');
  if (datos.necesidad_agua_ciclo_mm) fuentes.add('fao_agua_1986');
  if (datos.fuente_altitud) fuentes.add(datos.fuente_altitud);
  if (datos.siembra_todo_el_anio_iniap || datos.riego_en_manejo_iniap || datos.establecimiento !== 'no_documentado') fuentes.add('iniap_hortalizas_2011');
  return { ...datos, ...respuesta, pendientes: respuesta.fuente_helada ? datos.pendientes.filter((texto) => texto !== SIN_HELADA) : datos.pendientes, fuentes: [...fuentes] };
}
const base = { nota_denominacion: null, cosecha: null, necesidad_agua_ciclo_mm: null, sensibilidad_sequia: null, altitud_documentada_m: null, fuente_altitud: null,
  siembra_todo_el_anio_iniap: false, riego_en_manejo_iniap: false, requiere_agua_permanente: false, respuesta_helada: null, fuente_helada: null } as const;
const hortalizaIniap = { ...base, siembra_todo_el_anio_iniap: true, riego_en_manejo_iniap: true } as const;

export const PERFILES_AGRONOMICOS: readonly PerfilAgronomico[] = [
  // Diez cultivos originales: altitud, ventana, ciclo y tolerancia a heladas siguen en el catálogo §10 (referencial).
  perfil({ ...base, id: 'papa', nombre: 'Papa', nombre_cientifico: 'Solanum tuberosum', categoria: 'tuberculo', familia_botanica: 'Solanaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 105, max: 145 }, fuente_ciclo: 'fao_agua_1986', temperatura: { minima: 7, optima_min: 15, optima_max: 25, maxima: 30 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 250, optima_min: 500, optima_max: 800, maxima: 2000 }, necesidad_agua_ciclo_mm: { min: 500, max: 700 }, sensibilidad_sequia: 'alta',
    consideraciones_rotacion: ['Solanaceae: evitar repetir papa en el mismo lote para no acumular plagas y enfermedades del suelo.'], pendientes: [PENDIENTE_LOCAL, 'EcoCrop describe la papa mejorada genérica; las variedades andinas pueden tolerar zonas más frías.'] }),
  perfil({ ...base, id: 'haba', nombre: 'Haba', nombre_cientifico: 'Vicia faba', categoria: 'leguminosa', familia_botanica: 'Fabaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 90, max: 100 }, fuente_ciclo: 'fao_56_1998', temperatura: { minima: 5, optima_min: 18, optima_max: 28, maxima: 32 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 250, optima_min: 650, optima_max: 1000, maxima: 2600 },
    consideraciones_rotacion: ['Leguminosa: puede aportar nitrógeno al cultivo siguiente; útil después de papa.'], pendientes: [PENDIENTE_LOCAL, 'FAO-56 mide el ciclo en Europa y el Mediterráneo; el catálogo usa 6 meses para la sierra.'] }),
  perfil({ ...base, id: 'chocho', nombre: 'Chocho', nombre_cientifico: 'Lupinus mutabilis', categoria: 'leguminosa', familia_botanica: 'Fabaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 150, max: 330 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 6, optima_min: 18, optima_max: 24, maxima: 30 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 350, optima_min: 500, optima_max: 1000, maxima: 1700 },
    consideraciones_rotacion: ['Leguminosa andina: fija nitrógeno; alterna bien con papa y cereales.'], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...base, id: 'quinua', nombre: 'Quinua', nombre_cientifico: 'Chenopodium quinoa', categoria: 'grano', familia_botanica: 'Amaranthaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 90, max: 240 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 2, optima_min: 14, optima_max: 18, maxima: 35 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 250, optima_min: 500, optima_max: 1000, maxima: 2600 },
    consideraciones_rotacion: ['Amaranthaceae, igual que acelga y remolacha: evitar sembrarlas seguidas.'], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...base, id: 'cebada', nombre: 'Cebada', nombre_cientifico: 'Hordeum vulgare', categoria: 'grano', familia_botanica: 'Poaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 120, max: 150 }, fuente_ciclo: 'fao_agua_1986', temperatura: { minima: 2, optima_min: 15, optima_max: 20, maxima: 40 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 200, optima_min: 500, optima_max: 1000, maxima: 2000 }, necesidad_agua_ciclo_mm: { min: 450, max: 650 }, sensibilidad_sequia: 'baja a media',
    consideraciones_rotacion: ['Gramínea: cubre el suelo y corta ciclos de plagas de tubérculos y hortalizas.'], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...base, id: 'maiz', nombre: 'Maíz suave', nombre_cientifico: 'Zea mays', categoria: 'grano', familia_botanica: 'Poaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 125, max: 180 }, fuente_ciclo: 'fao_agua_1986', temperatura: { minima: 10, optima_min: 18, optima_max: 33, maxima: 47 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 400, optima_min: 600, optima_max: 1200, maxima: 1800 }, necesidad_agua_ciclo_mm: { min: 500, max: 800 }, sensibilidad_sequia: 'media a alta',
    consideraciones_rotacion: ['Gramínea; INIAP (2011) indica hortalizas después de maíz, con control de malezas.'], pendientes: [PENDIENTE_LOCAL, 'EcoCrop describe Zea mays genérico; el maíz suave andino puede requerir menos temperatura.'] }),
  perfil({ ...base, id: 'avena', nombre: 'Avena forrajera', nombre_cientifico: 'Avena sativa', categoria: 'forraje', familia_botanica: 'Poaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 120, max: 150 }, fuente_ciclo: 'fao_agua_1986', temperatura: { minima: 5, optima_min: 16, optima_max: 20, maxima: 30 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 250, optima_min: 600, optima_max: 1000, maxima: 1500 }, necesidad_agua_ciclo_mm: { min: 450, max: 650 }, sensibilidad_sequia: 'baja a media',
    consideraciones_rotacion: ['Gramínea forrajera: protege el suelo de la erosión.'], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...base, id: 'brocoli', nombre: 'Brócoli', nombre_cientifico: 'Brassica oleracea var. italica', categoria: 'flor', familia_botanica: 'Brassicaceae', establecimiento: 'trasplante',
    ciclo_dias: { min: 80, max: 120 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 3, optima_min: 15, optima_max: 24, maxima: 35 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 350, optima_min: 900, optima_max: 1500, maxima: 2000 }, siembra_todo_el_anio_iniap: true, riego_en_manejo_iniap: true,
    cosecha: 'Cuando la pella está dura y compacta, en botón (INIAP 2011, p. 25).', consideraciones_rotacion: [ROTACION_BRASICAS, ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...base, id: 'oca', nombre: 'Oca', nombre_cientifico: 'Oxalis tuberosa', categoria: 'tuberculo', familia_botanica: 'Oxalidaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 180, max: 270 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 5, optima_min: 12, optima_max: 24, maxima: 28 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 570, optima_min: 800, optima_max: 1300, maxima: 2150 },
    consideraciones_rotacion: ['Tubérculo andino de otra familia que la papa: permite alternar tubérculos.'], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...base, id: 'vicia_avena', nombre: 'Vicia + avena (abono verde)', nombre_cientifico: 'Vicia sativa + Avena sativa', categoria: 'forraje', familia_botanica: 'Fabaceae/Poaceae',
    nota_denominacion: 'Mezcla de dos especies: se usa el rango de temperatura común a ambas según EcoCrop (el más restrictivo).', establecimiento: 'no_documentado',
    ciclo_dias: { min: 80, max: 170 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 5, optima_min: 16, optima_max: 20, maxima: 28 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 350, optima_min: 700, optima_max: 900, maxima: 1500 },
    consideraciones_rotacion: ['Abono verde: aporta materia orgánica y nitrógeno (vicia) antes de un cultivo exigente.'], pendientes: [PENDIENTE_LOCAL] }),

  // Diecinueve cultivos solicitados por el cliente (15-11-2026).
  perfil({ ...hortalizaIniap, id: 'col', nombre: 'Col', nombre_cientifico: 'Brassica oleracea var. capitata', nota_denominacion: 'Col o repollo de cabeza.', categoria: 'hoja', familia_botanica: 'Brassicaceae',
    establecimiento: 'trasplante', cosecha: 'Cuando la cabeza se siente apretada y dura (INIAP 2011, p. 25).', ciclo_dias: { min: 120, max: 140 }, fuente_ciclo: 'fao_agua_1986',
    temperatura: { minima: 7, optima_min: 15, optima_max: 24, maxima: 32 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 300, optima_min: 500, optima_max: 1000, maxima: 2500 },
    necesidad_agua_ciclo_mm: { min: 350, max: 500 }, sensibilidad_sequia: 'media a alta', consideraciones_rotacion: [ROTACION_BRASICAS, ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...hortalizaIniap, id: 'remolacha', nombre: 'Remolacha', nombre_cientifico: 'Beta vulgaris (remolacha de mesa)', categoria: 'raiz', familia_botanica: 'Amaranthaceae',
    establecimiento: 'siembra_directa', cosecha: 'Cuando las hojas se abren en abanico y se doblan hacia el suelo (INIAP 2011, p. 25).', ciclo_dias: { min: 70, max: 90 }, fuente_ciclo: 'fao_56_1998',
    temperatura: { minima: 4, optima_min: 15, optima_max: 25, maxima: 35 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 500, optima_min: 600, optima_max: 800, maxima: 1000 },
    consideraciones_rotacion: ['Amaranthaceae, igual que acelga y quinua: no sembrarlas seguidas.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...hortalizaIniap, id: 'lechuga', nombre: 'Lechuga', nombre_cientifico: 'Lactuca sativa', categoria: 'hoja', familia_botanica: 'Asteraceae',
    establecimiento: 'trasplante', cosecha: 'Cuando la cabeza se siente apretada al tacto (INIAP 2011, p. 25).', ciclo_dias: { min: 75, max: 140 }, fuente_ciclo: 'fao_agua_1986',
    temperatura: { minima: 5, optima_min: 12, optima_max: 21, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 900, optima_min: 1100, optima_max: 1400, maxima: 4100 },
    consideraciones_rotacion: ['Asteraceae: familia distinta de papa, brásicas y leguminosas; buena para alternar.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...hortalizaIniap, id: 'cilantro', nombre: 'Cilantro', nombre_cientifico: 'Coriandrum sativum', nota_denominacion: 'INIAP lo nombra «culantro».', categoria: 'hoja', familia_botanica: 'Apiaceae',
    establecimiento: 'siembra_directa', ciclo_dias: { min: 35, max: 140 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 4, optima_min: 15, optima_max: 25, maxima: 32 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 300, optima_min: 500, optima_max: 1400, maxima: 2600 },
    consideraciones_rotacion: ['Apiaceae, igual que zanahoria, apio y perejil: no sembrarlas seguidas.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA, 'El ciclo de EcoCrop (35-140 días) va de la cosecha de hojas a la de semilla.'] }),
  perfil({ ...base, id: 'apio', nombre: 'Apio', nombre_cientifico: 'Apium graveolens var. dulce', categoria: 'hoja', familia_botanica: 'Apiaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 125, max: 210 }, fuente_ciclo: 'fao_56_1998', temperatura: { minima: 4, optima_min: 18, optima_max: 25, maxima: 28 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 300, optima_min: 1000, optima_max: 1300, maxima: 2800 },
    consideraciones_rotacion: ['Apiaceae, igual que zanahoria, cilantro y perejil: no sembrarlas seguidas.'], pendientes: [PENDIENTE_LOCAL, SIN_HELADA, SIN_AGUA, 'Forma de siembra no incluida en la guía INIAP consultada.'] }),
  perfil({ ...base, id: 'perejil', nombre: 'Perejil', nombre_cientifico: 'Petroselinum crispum', categoria: 'hoja', familia_botanica: 'Apiaceae', establecimiento: 'no_documentado',
    cosecha: 'Cosecha escalonada de hojas; EcoCrop indica ciclos de 70 a 365 días.', ciclo_dias: { min: 70, max: 365 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 7, optima_min: 11, optima_max: 20, maxima: 28 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 300, optima_min: 900, optima_max: 1500, maxima: 2800 },
    consideraciones_rotacion: ['Apiaceae, igual que zanahoria, cilantro y apio: no sembrarlas seguidas.'], pendientes: [PENDIENTE_LOCAL, SIN_HELADA, SIN_AGUA, 'Forma de siembra no incluida en la guía INIAP consultada.'] }),
  perfil({ ...hortalizaIniap, id: 'zanahoria', nombre: 'Zanahoria', nombre_cientifico: 'Daucus carota subsp. sativus', categoria: 'raiz', familia_botanica: 'Apiaceae',
    establecimiento: 'siembra_directa', cosecha: 'Cuando las hojas se abren en abanico y se doblan hacia el suelo (INIAP 2011, p. 25).', ciclo_dias: { min: 100, max: 150 }, fuente_ciclo: 'fao_agua_1986',
    temperatura: { minima: 3, optima_min: 15, optima_max: 24, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 400, optima_min: 600, optima_max: 1200, maxima: 4000 },
    consideraciones_rotacion: ['Apiaceae, igual que cilantro, apio y perejil: no sembrarlas seguidas.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...hortalizaIniap, id: 'cebolla_colorada', nombre: 'Cebolla colorada', nombre_cientifico: 'Allium cepa (cebolla de bulbo)', nota_denominacion: 'Cebolla de bulbo roja; INIAP la incluye como «cebolla de bulbo».', categoria: 'cebolla', familia_botanica: 'Amaryllidaceae',
    establecimiento: 'trasplante', cosecha: 'Cuando las hojas caen y se secan; por lo general 6-7 meses después de la siembra o trasplante (INIAP 2011, p. 25).', ciclo_dias: { min: 150, max: 210 }, fuente_ciclo: 'fao_agua_1986',
    temperatura: { minima: 4, optima_min: 12, optima_max: 25, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 300, optima_min: 350, optima_max: 600, maxima: 2800 },
    necesidad_agua_ciclo_mm: { min: 350, max: 550 }, sensibilidad_sequia: 'media a alta',
    consideraciones_rotacion: ['Amaryllidaceae (Allium): no repetir cebollas ni ajo en el mismo lote.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL] }),
  perfil({ ...hortalizaIniap, id: 'cebolla_blanca', nombre: 'Cebolla blanca', nombre_cientifico: 'Allium fistulosum', nota_denominacion: 'Cebolla de rama o junca; INIAP la distingue de la cebolla de bulbo.', categoria: 'cebolla', familia_botanica: 'Amaryllidaceae',
    establecimiento: 'trasplante', ciclo_dias: { min: 60, max: 160 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 6, optima_min: 12, optima_max: 25, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 700, optima_min: 850, optima_max: 1600, maxima: 2500 },
    consideraciones_rotacion: ['Amaryllidaceae (Allium): no repetir cebollas ni ajo en el mismo lote.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...hortalizaIniap, id: 'coliflor', nombre: 'Coliflor', nombre_cientifico: 'Brassica oleracea var. botrytis', categoria: 'flor', familia_botanica: 'Brassicaceae',
    establecimiento: 'trasplante', cosecha: 'Cuando la pella está dura y compacta (INIAP 2011, p. 25).', ciclo_dias: { min: 60, max: 120 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 5, optima_min: 10, optima_max: 25, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 450, optima_min: 600, optima_max: 1100, maxima: 1900 },
    consideraciones_rotacion: [ROTACION_BRASICAS, ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...hortalizaIniap, id: 'papa_nabo', nombre: 'Papa nabo', nombre_cientifico: 'Brassica rapa subsp. rapa', nota_denominacion: 'INIAP la nombra «papanabo». Se identifica como nabo de mesa (Brassica rapa) según UTC (2017); no es una papa. Confirmar la especie con INIAP.', categoria: 'raiz', familia_botanica: 'Brassicaceae',
    establecimiento: 'siembra_directa', ciclo_dias: { min: 40, max: 80 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 7, optima_min: 10, optima_max: 17, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 300, optima_min: 900, optima_max: 1400, maxima: 2000 },
    consideraciones_rotacion: [ROTACION_BRASICAS, ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA, 'Especie identificada con una tesis universitaria; confirmar con INIAP.'] }),
  perfil({ ...base, id: 'col_china', nombre: 'Col china', nombre_cientifico: 'Brassica rapa subsp. pekinensis / chinensis', nota_denominacion: 'Puede referirse a la col china de cabeza (pekinensis) o al pak choi (chinensis); EcoCrop agrupa ambas como Brassica chinensis.', categoria: 'hoja', familia_botanica: 'Brassicaceae',
    establecimiento: 'no_documentado', ciclo_dias: { min: 40, max: 90 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 8, optima_min: 12, optima_max: 22, maxima: 34 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 500, optima_min: 800, optima_max: 1600, maxima: 2700 },
    consideraciones_rotacion: [ROTACION_BRASICAS], pendientes: [PENDIENTE_LOCAL, SIN_HELADA, SIN_AGUA, 'Confirmar qué tipo de col china se cultiva localmente.'] }),
  perfil({ ...hortalizaIniap, id: 'rabano', nombre: 'Rábano', nombre_cientifico: 'Raphanus sativus var. radicula', categoria: 'raiz', familia_botanica: 'Brassicaceae',
    establecimiento: 'siembra_directa', ciclo_dias: { min: 35, max: 45 }, fuente_ciclo: 'fao_agua_1986',
    temperatura: { minima: 3, optima_min: 12, optima_max: 25, maxima: 30 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 500, optima_min: 800, optima_max: 1000, maxima: 2800 },
    consideraciones_rotacion: [ROTACION_BRASICAS, ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...base, id: 'frejol', nombre: 'Fréjol', nombre_cientifico: 'Phaseolus vulgaris', categoria: 'leguminosa', familia_botanica: 'Fabaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 95, max: 110 }, fuente_ciclo: 'fao_agua_1986', temperatura: { minima: 7, optima_min: 16, optima_max: 25, maxima: 32 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 300, optima_min: 500, optima_max: 2000, maxima: 4300 }, necesidad_agua_ciclo_mm: { min: 300, max: 500 }, sensibilidad_sequia: 'media a alta',
    consideraciones_rotacion: ['Leguminosa: puede aportar nitrógeno; no sembrarla seguida de haba o chocho.'],
    pendientes: [PENDIENTE_LOCAL, SIN_HELADA, 'FAO indica 95-110 días para grano seco en clima cálido; en la sierra fría el ciclo es más largo y depende de la variedad (arbustiva o voluble).'] }),
  perfil({ ...base, id: 'zapallo', nombre: 'Zapallo', nombre_cientifico: 'Cucurbita maxima', categoria: 'fruto', familia_botanica: 'Cucurbitaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 100, max: 120 }, fuente_ciclo: 'fao_56_1998', temperatura: { minima: 9, optima_min: 20, optima_max: 30, maxima: 38 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 450, optima_min: 600, optima_max: 1000, maxima: 2700 },
    consideraciones_rotacion: ['Cucurbitaceae: no repetir zapallo o zambo en el mismo lote.'], pendientes: [PENDIENTE_LOCAL, SIN_HELADA, SIN_AGUA] }),
  perfil({ ...base, id: 'zambo', nombre: 'Zambo', nombre_cientifico: 'Cucurbita ficifolia', categoria: 'fruto', familia_botanica: 'Cucurbitaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 40, max: 120 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 6, optima_min: 15, optima_max: 21, maxima: 35 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 300, optima_min: 800, optima_max: 1200, maxima: 1700 },
    consideraciones_rotacion: ['Cucurbitaceae: no repetir zapallo o zambo en el mismo lote.'], pendientes: [PENDIENTE_LOCAL, SIN_HELADA, SIN_AGUA, 'El ciclo de EcoCrop (40-120 días) puede no representar plantas de zambo de larga duración.'] }),
  perfil({ ...base, id: 'berro', nombre: 'Berro', nombre_cientifico: 'Nasturtium officinale', categoria: 'hoja', familia_botanica: 'Brassicaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 40, max: 80 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 6, optima_min: 12, optima_max: 17, maxima: 32 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 300, optima_min: 1000, optima_max: 2300, maxima: 4200 }, requiere_agua_permanente: true,
    consideraciones_rotacion: [ROTACION_BRASICAS, 'Necesita agua corriente o suelo saturado: normalmente no entra en la rotación de un lote de secano.'],
    pendientes: [PENDIENTE_LOCAL, SIN_HELADA, 'Requiere agua limpia permanente: verificar la calidad sanitaria del agua.'] }),
  perfil({ ...hortalizaIniap, id: 'acelga', nombre: 'Acelga', nombre_cientifico: 'Beta vulgaris var. cicla', categoria: 'hoja', familia_botanica: 'Amaranthaceae',
    establecimiento: 'siembra_directa', cosecha: 'Cosecha escalonada: se cortan las hojas externas y quedan las jóvenes (INIAP 2011, p. 25).', ciclo_dias: { min: 50, max: 150 }, fuente_ciclo: 'fao_ecocrop',
    temperatura: { minima: 5, optima_min: 15, optima_max: 25, maxima: 35 }, fuente_temperatura: 'fao_ecocrop', lluvia_anual_mm: { minima: 500, optima_min: 800, optima_max: 800, maxima: 1000 },
    consideraciones_rotacion: ['Amaranthaceae, igual que remolacha y quinua: no sembrarlas seguidas.', ROTACION_HORTALIZAS_INIAP], pendientes: [PENDIENTE_LOCAL, SIN_AGUA] }),
  perfil({ ...base, id: 'melloco', nombre: 'Melloco', nombre_cientifico: 'Ullucus tuberosus', categoria: 'tuberculo', familia_botanica: 'Basellaceae', establecimiento: 'no_documentado',
    ciclo_dias: { min: 120, max: 270 }, fuente_ciclo: 'fao_ecocrop', temperatura: { minima: 5, optima_min: 12, optima_max: 20, maxima: 28 }, fuente_temperatura: 'fao_ecocrop',
    lluvia_anual_mm: { minima: 800, optima_min: 1100, optima_max: 1400, maxima: 1800 }, altitud_documentada_m: { min: 1800, max: 3800 }, fuente_altitud: 'naranjo_melloco_2018',
    consideraciones_rotacion: ['Tubérculo andino de otra familia (Basellaceae) que papa y oca: permite alternar tubérculos.'], pendientes: [PENDIENTE_LOCAL, SIN_HELADA, SIN_AGUA] }),
];

export const IDS_CULTIVOS_ORIGINALES = ['papa', 'haba', 'chocho', 'quinua', 'cebada', 'maiz', 'avena', 'brocoli', 'oca', 'vicia_avena'] as const;
export const IDS_CULTIVOS_NUEVOS = ['col', 'remolacha', 'lechuga', 'cilantro', 'apio', 'perejil', 'zanahoria', 'cebolla_colorada', 'cebolla_blanca', 'coliflor',
  'papa_nabo', 'col_china', 'rabano', 'frejol', 'zapallo', 'zambo', 'berro', 'acelga', 'melloco'] as const;
const mapaPerfiles = new Map(PERFILES_AGRONOMICOS.map((valor) => [valor.id, valor]));
export function obtenerPerfil(id: string): PerfilAgronomico | undefined { return mapaPerfiles.get(id); }
/** Ciclo de referencia (días) para la sierra: el máximo documentado, porque FAO indica ciclos más largos en clima frío. */
export function cicloReferenciaDias(perfilCultivo: PerfilAgronomico): number { return perfilCultivo.ciclo_dias.max; }
export const DIAS_POR_MES = 30.44;
export const CICLO_CORTO_MAX_DIAS = 120;
