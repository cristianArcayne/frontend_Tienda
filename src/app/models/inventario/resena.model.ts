export interface Resena {
  id: number;
  usuario: number;
  usuario_username: string;
  producto: number;
  calificacion: number;
  comentario: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CrearResena {
  producto_id: number;
  calificacion: number;
  comentario?: string;
}

export interface ActualizarResena {
  calificacion?: number;
  comentario?: string;
}
