export type EstadoSuscripcion = 'activa' | 'trial' | 'pausada' | 'cancelada' | 'expirada';
export type CicloSuscripcion = 'mensual' | 'anual';

export interface Suscripcion {
  id: number;
  empresa: number;
  plan: number;
  estado: EstadoSuscripcion;
  ciclo: CicloSuscripcion;
  fecha_inicio: string;
  fecha_fin: string | null;
  auto_renovar: boolean;
  ultima_renovacion: string | null;
  cancelada_en: string | null;
  cancelada_por: string;
  fecha_creacion: string;
}

export interface SuscripcionCambio {
  id: number;
  suscripcion: number;
  plan_anterior: number;
  plan_nuevo: number;
  cambiado_en: string;
  motivo: string;
}
