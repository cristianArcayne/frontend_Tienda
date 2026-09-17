export interface Prediccion {
  variante_id: number;
  variante_sku: string;
  producto: string;
  categoria: string;
  stock_actual: number;
  limite_minimo: number;
  demanda_proyectada: number;
  dias_proyectados: number;
  deficit: number;
  alerta: boolean;
}

export interface PrediccionDetalleResponse {
  dias_proyectados: number;
  total: number;
  predicciones: Prediccion[];
}
