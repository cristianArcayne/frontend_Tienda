export type AlertaTipo = 'stock_bajo' | 'demanda_alta';

export interface AlertaIa {
  id: number;
  tipo: AlertaTipo;
  variante_sku: string;
  producto: string;
  categoria: string;
  stock_actual: number;
  limite_minimo: number;
  demanda_proyectada: number | null;
  dias_proyectados: number | null;
  deficit: number;
  leida: boolean;
  fecha_creacion: string;
}
