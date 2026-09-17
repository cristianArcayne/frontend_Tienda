export interface Proveedor {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
}

export interface CrearProveedor {
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface ActualizarProveedor {
  nombre: string;
  direccion?: string;
  telefono?: string;
}
