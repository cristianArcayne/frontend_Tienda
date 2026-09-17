export interface FiltroQbe {
  campo: string;
  operador: string;
  valor: any;
}

export interface FiltroAvanzado {
  operador_logico: 'AND' | 'OR';
  condiciones: FiltroQbe[];
}

export interface MetricaAgrupada {
  campo: string;
  operacion: 'sum' | 'count' | 'avg' | 'min' | 'max';
  alias: string;
}

export interface FiltroHaving {
  alias: string;
  operador: 'gte' | 'lte' | 'gt' | 'lt' | 'exact' | 'neq';
  valor: any;
}

export interface Ventana {
  funcion: 'RANK' | 'ROW_NUMBER' | 'LAG' | 'LEAD';
  partition_by?: string[];
  orden?: string;
  alias?: string;
  offset?: number;
  default?: any;
}

export interface PaginacionQbe {
  pagina: number;
  cantidad_por_pagina: number;
}

export interface QbePayload {
  vista_logica: string;
  filtros?: FiltroQbe[];
  filtros_avanzados?: FiltroAvanzado;
  agrupar_por?: string[];
  metricas_agrupadas?: MetricaAgrupada[];
  filtros_having?: FiltroHaving[];
  ventana?: Ventana;
  ordenar_por?: string;
  paginacion?: PaginacionQbe;
}
