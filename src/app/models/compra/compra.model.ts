import { DetalleCompra } from './detalle-compra.model';

export interface Compra {
  id: number;
  fecha: string;
  total: string;
  proveedor: number;
  proveedor_nombre: string;
  detalles?: DetalleCompra[];
}
