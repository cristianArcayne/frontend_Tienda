export type CicloSuscripcion = 'mensual' | 'anual';

export interface SuperAdminRegistro {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface EmpresaRegistroPayload {
  nombre: string;
  correo: string;
  plan: number;
  ciclo: CicloSuscripcion;
  super_admin: SuperAdminRegistro;
}
