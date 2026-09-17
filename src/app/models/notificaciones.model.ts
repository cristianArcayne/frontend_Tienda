export interface Promocion {
  id?: number;
  titulo: string;
  descripcion: string;
  producto: number | string;
  producto_nombre?: string;
  tipo_descuento: string;
  valor_descuento: number | string;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  creado_por?: number | string | null;
  fecha_publicacion?: string | null;
}

export interface NotificacionPush {
  id?: number;
  usuario?: number | string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  activa?: boolean;
  ultima_promocion?: number | string | null;
  ultimo_envio?: string | null;
  ultimo_error?: string | null;
}

export interface CrearPromocionPayload {
  titulo: string;
  descripcion: string;
  producto_id: number | string;
  tipo_descuento: string;
  valor_descuento: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface SuscripcionPushPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PruebaNotificacionPayload {
  titulo: string;
  mensaje: string;
}
