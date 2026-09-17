export interface Plan {
  id: number;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  precio_anual: number;
  activo: boolean;
  limite_usuarios: number;
  limite_productos: number;
  limite_clientes: number;
  limite_proveedores: number;
  feature_realidad_aumentada: boolean;
  feature_fotos_3d: boolean;
  feature_reportes_dinamicos: boolean;
  feature_backup_automatico: boolean;
}
