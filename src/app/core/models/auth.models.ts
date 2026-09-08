export interface User {
  ci: string;
  nombre: string;
  rol: 'administrador' | 'trabajador' | 'empleado' | 'cliente' | string;
  email?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface BitacoraEntry {
  id_bitacora: number;
  id_usuario: string | null;
  fecha_hora: string;
  accion_realizada: string;
  tabla_afectada: string | null;
  usuario_nombre?: string | null;
  usuario_rol?: string | null;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token: string;
  ci: string;
}
