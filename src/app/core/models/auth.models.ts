export interface User {
  ci: string;
  nombre: string;
  rol: 'administrador' | 'trabajador' | 'empleado' | 'cliente' | 'invitado' | string;
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

export interface UsuarioDetail {
  ci: string;
  nombre: string;
  rol: string;
  apellido?: string | null;
  correo_electronico?: string | null;
  telefono?: string | null;
  genero?: string | null;
  edad?: number | null;
  id_sucursal?: number | null;
  sucursal_nombre?: string | null;
}

export interface EmpresaConfig {
  razon_social: string;
  nombre_comercial: string;
  ruc_nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  sitio_web: string;
  simbolo_moneda: string;
  codigo_moneda: string;
  iva_porcentaje: number;
  precios_con_impuesto: boolean;
}
