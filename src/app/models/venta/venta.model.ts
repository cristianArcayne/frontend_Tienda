import { DetalleVenta } from './detalle-venta.model';

export interface Venta {
  id: number;
  tipo: string;
  estado: string;
  fecha: string;
  precio_total: string;
  usuario: number;
  usuario_username: string;
  detalles?: DetalleVenta[];
}
