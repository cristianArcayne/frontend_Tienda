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

export interface DashboardIaResponse {
  historico: HistoricoItem[];
  proyeccion: ProyeccionItem[];
  fecha_hasta: string;
}

export interface ReentrenarResponse {
  detalle: string;
  random_forest: { registros_usados: number };
  prophet: { registros_usados: number };
}
