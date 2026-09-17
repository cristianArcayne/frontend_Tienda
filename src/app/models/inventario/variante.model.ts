export interface VarianteProducto {
  id: number;
  sku: string;
  precio: string;
  cantidad: number;
  costo_ponderado: string;
  limite_cantidad: number;
  producto: number;
  producto_nombre: string;
}

export interface CrearVariante {
  sku: string;
  precio: number;
  cantidad: number;
  costo_ponderado: number;
  limite_cantidad: number;
  producto_id: number;
}
