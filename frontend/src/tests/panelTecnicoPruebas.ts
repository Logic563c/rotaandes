import type { RespuestaPanelTecnico } from '../types/tecnico';

// Simulación exclusiva de tests; nunca es una consulta meteorológica ni una cuenta real.
export function panelTecnicoPrueba(fecha = new Date().toISOString()): RespuestaPanelTecnico {
  const dia = new Date(Date.parse(fecha) - 5 * 3600000).toISOString().slice(0, 10);
  return { terrenos: [{ id: '00000000-0000-4000-8000-000000000001', nombre: 'Parcela técnica controlada', latitud: -0.93, longitud: -78.62, altitud_m: 3000, area_ha: 1, tiene_riego: false, tipo_suelo: null,
    parroquia_perfil: 'Pujilí', ultima_siembra: { id: '00000000-0000-4000-8000-000000000002', cultivo_id: 'papa', cultivo_nombre: 'Papa', fecha_siembra: '2025-01-01', fecha_cosecha: null },
    helada: { estado: 'posible_helada', alertas: [{ fecha: dia, tipo: 'helada', t_min: 2, mensaje: 'Alerta controlada de prueba: posible helada, no confirmación.' }], fuente: 'Open-Meteo', actualizado_en: fecha,
      vigente_hasta: new Date(Date.parse(fecha) + 1800000).toISOString(), dias_evaluados: 7, umbral_helada_c: 2, motivo: 'Fixture de pruebas, no medición del terreno.' } }],
    paginacion: { pagina: 1, tamano: 50, total: 1, paginas: 1 }, parroquias: ['Pujilí', 'Latacunga'], consultado_en: fecha, metodologia: 'Parroquia del perfil; cultivo en historial; último por fecha, creación e ID.', aviso: 'Datos controlados solo para pruebas.' };
}
