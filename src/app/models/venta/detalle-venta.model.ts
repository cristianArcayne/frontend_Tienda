export interface DetalleVenta {
  id: number;
  cantidad: number;
  precio_subtotal: string;
  precio_unitario: string;
  variante_producto: number;
  variante_producto_sku: string;
  variante_producto_nombre: string;
  venta: number;
}

export interface CrearDetalleVenta {
  variante_producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface ActualizarDetalleVenta {
  id?: number | null;
  variante_producto_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface CrearVenta {
  tipo: string;
  estado: string;
  precio_total: number;
  usuario_id: number;
  detalles: CrearDetalleVenta[];
}

export interface ActualizarVenta {
  tipo?: string;
  estado?: string;
  precio_total?: number;
  usuario_id?: number;
  detalles?: ActualizarDetalleVenta[];
}
