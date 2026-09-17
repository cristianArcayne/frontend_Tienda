export interface BitacoraAuditoria {
  id_bitacora?: number | string;
  id?: number | string;
  usuario?: number | string | {
    id?: number | string;
    username?: string;
    nombre_completo?: string;
    email?: string;
  } | null;
  usuarios_id?: number | string | null;
  username?: string;
  usuario_username?: string;
  accion?: string;
  action?: string;
  metodo?: string;
  ruta?: string;
  entidad?: string;
  detalles?: string;
  hora?: string;
  ip_cliente?: string;
  estado_http?: number | string;
  modulo?: string;
  app_label?: string;
  modelo?: string;
  model_name?: string;
  objeto?: string;
  object_repr?: string;
  descripcion?: string;
  detalle?: string;
  mensaje?: string;
  ip?: string;
  ip_address?: string;
  fecha?: string;
  fecha_hora?: string;
  created_at?: string;
  timestamp?: string;
  resultado?: string;
  exitoso?: boolean;
}
