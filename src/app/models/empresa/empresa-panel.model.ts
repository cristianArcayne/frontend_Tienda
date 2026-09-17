export interface SuscripcionResumen {
  plan_nombre: string;
  plan_precio: number;
  estado: string;
  ciclo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export interface EmpresaPanel {
  id: number;
  nombre: string;
  correo: string | null;
  subdominio: string | null;
  is_active: boolean;
  fecha_creacion: string;
  suscripcion_actual: SuscripcionResumen | null;
}