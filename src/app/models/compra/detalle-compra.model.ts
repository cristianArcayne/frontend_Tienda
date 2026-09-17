export interface DetalleCompra {
  id: number;
  compra: number;
  variante_producto: number;
  sku: string;
  producto_nombre: string;
  cantidad: number;
  costo_unitario: string;
  costo_subtotal: string;
}

export interface CrearDetalleCompra {
  variante_producto_id: number;
  cantidad: number;
  costo_unitario: number;
}

export interface CrearCompra {
  total: number;
  proveedor_id: number;
  detalles: CrearDetalleCompra[];
}
