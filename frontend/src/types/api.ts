export interface RespuestaSalud {
  ok: true;
}

export interface UsuarioPublico {
  id: string; email: string; rol: 'agricultor' | 'tecnico'; nombre: string;
  parroquia: string | null; telefono: string | null;
  prioridad_agua: number | null; prioridad_suelo: number | null; prioridad_ingresos: number | null;
  creado_en: string | null;
}
export interface Credenciales { email: string; password: string }
export interface DatosRegistro extends Credenciales { nombre: string; parroquia?: string }
export interface RespuestaAutenticacion { token: string; usuario: UsuarioPublico }
export interface DatosPerfil {
  nombre: string; parroquia: string | null; telefono: string | null;
  prioridad_agua: number; prioridad_suelo: number; prioridad_ingresos: number;
}
