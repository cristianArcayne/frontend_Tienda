export interface PaginacionReporte {
  total_registros: number;
  total_paginas: number;
  pagina_actual: number;
  tiene_anterior: boolean;
  tiene_siguiente: boolean;
}

export interface ReporteRespuesta {
  paginacion: PaginacionReporte;
  datos: Record<string, any>[];
}

export interface NLPRespuesta {
  query_interpretada: Record<string, any>;
  resultados: ReporteRespuesta;
}
