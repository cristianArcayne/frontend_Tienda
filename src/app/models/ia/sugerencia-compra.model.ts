export type SugerenciaEstado = 'pendiente' | 'aprobada' | 'descartada';

export interface SugerenciaCompraDetalle {
  id: number;
  sugerencia: number;
  variante: number;
  sku: string;
  producto_nombre: string;
  cantidad_sugerida: number;
  costo_unitario_estimado: number;
  alerta_origen: number | null;
}

export interface SugerenciaCompra {
  id: number;
  proveedor: number | null;
  proveedor_nombre: string | null;
  estado: SugerenciaEstado;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  compra_generada: number | null;
  detalles: SugerenciaCompraDetalle[];
  total_estimado: number;
}