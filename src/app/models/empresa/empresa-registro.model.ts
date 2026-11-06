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
  metodo_pago?: string;
  tarjeta_numero?: string;
  tarjeta_exp?: string;
  tarjeta_cvc?: string;
  titular?: string;
  super_admin: SuperAdminRegistro;
}

