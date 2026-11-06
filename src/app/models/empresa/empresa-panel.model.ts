export interface SuscripcionResumen {
  id?: number | null;
  plan_id?: number;
  plan_codigo?: string;
  plan_nombre: string;
  plan_precio: number;
  precio_anual?: number;
  estado: string;
  ciclo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  dias_restantes?: number | null;
  limite_usuarios?: number;
  limite_sucursales?: number;
  soporta_ar?: boolean;
  soporta_ia?: boolean;
}

export interface EmpresaPanel {
  id: number;
  nombre: string;
  razon_social?: string;
  nit?: string;
  correo: string | null;
  subdominio: string | null;
  ciudad?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
  is_active: boolean;
  fecha_creacion: string;
  usuarios_count?: number;
  sucursales_count?: number;
  prendas_count?: number;
  suscripcion_actual: SuscripcionResumen | null;
}