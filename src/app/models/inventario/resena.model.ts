export interface Resena {
  id: number;
  usuario?: number;
  usuario_username?: string;
  cliente_ci?: string | number;
  cliente_nombre?: string;
  producto?: number;
  ropa_id?: number;
  calificacion: number;
  puntuacion_estrellas?: number;
  comentario: string;
  fecha?: string;
  fecha_creacion: string;
  fecha_actualizacion?: string;
}

export interface CrearResena {
  producto_id: number;
  calificacion: number;
  comentario?: string;
  cliente_ci?: string | number;
  cliente_nombre?: string;
}

export interface ActualizarResena {
  calificacion?: number;
  comentario?: string;
}
