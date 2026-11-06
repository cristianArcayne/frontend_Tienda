export interface HistoricoItem {
  categoria: string;
  periodo: string;
  unidades: number;
}

export interface ProyeccionItem {
  categoria: string;
  periodo: string;
  unidades: number;
}

export interface ClusteringClientes {
  vip_alto_valor: number;
  frecuentes_estables: number;
  nuevos_o_riesgo: number;
}

export interface ModelosMLInfo {
  supervisado: string;
  no_supervisado: string;
}

export interface DashboardKpis {
  ventas_hoy_monto: number;
  ventas_hoy_tickets: number;
  ventas_mes_monto: number;
  ventas_mes_tickets: number;
  mrr_saas_bs: number;
  rotacion_stock_ratio: number;
  tasa_devoluciones_7dias_pct: number;
  total_devoluciones_registradas: number;
  total_productos: number;
  productos_stock_bajo: number;
  total_clientes: number;
  clientes_activos: number;
  clustering_clientes_kmeans?: ClusteringClientes;
  modelos_ml?: ModelosMLInfo;
}

export interface DashboardIaResponse {
  historico: HistoricoItem[];
  proyeccion: ProyeccionItem[];
  fecha_hasta: string;
  kpis?: DashboardKpis;
}

export interface ReentrenarResponse {
  detalle: string;
  random_forest: { registros_usados: number };
  prophet: { registros_usados: number };
}
