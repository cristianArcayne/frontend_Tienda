export interface Multimedia {
  id: number;
  archivo_url: string;
  tipo: string;
  es_principal: boolean;
  orden: number;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  categoria: number;
  categoria_nombre: string;
  marca: number;
  marca_nombre: string;
  imagenes: Multimedia[];
  modelos_3d?: Multimedia[];
  imagen_principal?: string;
  precio_minimo?: number;
}

export interface CrearProducto {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  categoria_id: number;
  marca_id: number;
}

export interface CrearMultimedia {
  archivo_url: string;
  tipo: string;
  es_principal: boolean;
  orden: number;
  producto_id: number;
}
