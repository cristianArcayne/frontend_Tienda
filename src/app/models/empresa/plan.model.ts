export interface Plan {
  id: number;
  codigo?: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  precio_anual: number;
  activo: boolean;
  limite_sucursales?: number;
  limite_usuarios?: number;
  limite_productos?: number;
  limite_clientes?: number;
  limite_proveedores?: number;
  soporta_ar?: boolean;
  soporta_ia?: boolean;
  soporta_offline?: boolean;
  feature_realidad_aumentada?: boolean;
  feature_fotos_3d?: boolean;
  feature_reportes_dinamicos?: boolean;
  feature_backup_automatico?: boolean;
}
