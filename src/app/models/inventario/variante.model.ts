export interface VarianteProducto {
  id: number;
  sku: string;
  precio: string;
  cantidad: number;
  costo_ponderado: string;
  limite_cantidad: number;
  producto: number;
  producto_nombre: string;
  talla_id?: number;
  talla_nombre?: string;
  color_id?: number;
  color_nombre?: string;
  color_hex?: string;
  color?: { id: number; nombre: string; codigo_hex?: string };
  talla?: { id: number; nombre: string };
  imagen_url?: string;
}

export interface CrearVariante {
  sku: string;
  precio: number;
  cantidad: number;
  costo_ponderado: number;
  limite_cantidad: number;
  producto_id: number;
  talla_id?: number;
  color_id?: number;
  imagen_url?: string;
}
