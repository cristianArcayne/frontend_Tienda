export interface VistaLogica {
  nombre: string;
  etiqueta: string;
  campos: CampoVista[];
}

export interface CampoVista {
  nombre: string;
  etiqueta: string;
  tipo: 'string' | 'number' | 'date' | 'boolean';
  operadores: string[];
  agregable: boolean;
  agrupable: boolean;
}
