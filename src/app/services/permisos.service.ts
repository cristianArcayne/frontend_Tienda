import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Servicio centralizado para gestionar permisos del sistema
 * Define constantes de permisos y métodos para verificarlos
 */
@Injectable({
  providedIn: 'root'
})
export class PermisosService {
  // INVENTARIO - CATÁLOGO
  static readonly INVENTARIO_VIEW_CATALOGO = 'inventario.view_catalogo';

  // INVENTARIO - PRODUCTO
  static readonly INVENTARIO_VIEW_PRODUCTO = 'inventario.view_producto';
  static readonly INVENTARIO_VIEW_PRODUCTO_DETALLE = 'inventario.view_producto_detalle';
  static readonly INVENTARIO_ADD_PRODUCTO = 'inventario.add_producto';
  static readonly INVENTARIO_CHANGE_PRODUCTO = 'inventario.change_producto';
  static readonly INVENTARIO_DELETE_PRODUCTO = 'inventario.delete_producto';

  // INVENTARIO - CATEGORÍA
  static readonly INVENTARIO_VIEW_CATEGORIA = 'inventario.view_categoria';
  static readonly INVENTARIO_ADD_CATEGORIA = 'inventario.add_categoria';
  static readonly INVENTARIO_CHANGE_CATEGORIA = 'inventario.change_categoria';
  static readonly INVENTARIO_DELETE_CATEGORIA = 'inventario.delete_categoria';

  // COMPRA - PROVEEDOR
  static readonly COMPRA_VIEW_PROVEEDOR = 'compras.view_proveedor';
  static readonly COMPRA_ADD_PROVEEDOR = 'compras.add_proveedor';
  static readonly COMPRA_CHANGE_PROVEEDOR = 'compras.change_proveedor';
  static readonly COMPRA_DELETE_PROVEEDOR = 'compras.delete_proveedor';

  // COMPRA - COMPRA
  static readonly COMPRA_VIEW_COMPRA = 'compras.view_compra';
  static readonly COMPRA_ADD_COMPRA = 'compras.add_compra';
  static readonly COMPRA_CHANGE_COMPRA = 'compras.change_compra';
  static readonly COMPRA_DELETE_COMPRA = 'compras.delete_compra';

  // INVENTARIO - MARCA
  static readonly INVENTARIO_VIEW_MARCA = 'inventario.view_marca';
  static readonly INVENTARIO_ADD_MARCA = 'inventario.add_marca';
  static readonly INVENTARIO_CHANGE_MARCA = 'inventario.change_marca';
  static readonly INVENTARIO_DELETE_MARCA = 'inventario.delete_marca';

  // INVENTARIO - VARIANTE
  static readonly INVENTARIO_VIEW_VARIANTE = 'inventario.view_varianteproducto';
  static readonly INVENTARIO_ADD_VARIANTE = 'inventario.add_varianteproducto';
  static readonly INVENTARIO_CHANGE_VARIANTE = 'inventario.change_varianteproducto';
  static readonly INVENTARIO_DELETE_VARIANTE = 'inventario.delete_varianteproducto';

  // INVENTARIO - MULTIMEDIA
  static readonly INVENTARIO_VIEW_MULTIMEDIO = 'inventario.view_multimedio';
  static readonly INVENTARIO_ADD_MULTIMEDIO = 'inventario.add_multimedio';
  static readonly INVENTARIO_CHANGE_MULTIMEDIO = 'inventario.change_multimedio';
  static readonly INVENTARIO_DELETE_MULTIMEDIO = 'inventario.delete_multimedio';

  // SEGURIDAD - USUARIO
  static readonly SEGURIDAD_VIEW_USUARIO = 'seguridad.view_usuario';
  static readonly SEGURIDAD_ADD_USUARIO = 'seguridad.add_usuario';
  static readonly SEGURIDAD_CHANGE_USUARIO = 'seguridad.change_usuario';
  static readonly SEGURIDAD_DELETE_USUARIO = 'seguridad.delete_usuario';

  // SEGURIDAD - DASHBOARD
  static readonly SEGURIDAD_VIEW_DASHBOARD = 'seguridad.view_dashboard';

  // SEGURIDAD - BITACORA
  static readonly SEGURIDAD_VIEW_BITACORA = 'seguridad.view_bitacora';
  static readonly SEGURIDAD_VIEW_BITACORA_AUDITORIA = 'seguridad.view_bitacoraauditoria';

  // SEGURIDAD - BACKUP / RESTORE
  static readonly SEGURIDAD_VIEW_BACKUP = 'seguridad.view_backup';
  static readonly SEGURIDAD_ADD_BACKUP = 'seguridad.add_backup';
  static readonly SEGURIDAD_ADD_RESTORE = 'seguridad.add_restore';

  // SEGURIDAD - REPORTE
  static readonly SEGURIDAD_ADD_REPORTE = 'seguridad.add_reporte';

  // SEGURIDAD - PREDICCIÓN
  static readonly SEGURIDAD_ADD_PREDICCION = 'seguridad.add_prediccion';

  // NOTIFICACIONES
  static readonly NOTIFICACIONES_VIEW_NOTIFICACION = 'notificaciones.view_notificacion';

  // SEGURIDAD - EMPRESA
  static readonly SEGURIDAD_CHANGE_EMPRESA = 'seguridad.change_empresa';

  // SEGURIDAD - SUSCRIPCIÓN
  static readonly SEGURIDAD_VIEW_MI_SUSCRIPCION = 'seguridad.view_mi_suscripcion';
  static readonly SEGURIDAD_CHANGE_MI_SUSCRIPCION = 'seguridad.change_mi_suscripcion';

  // IA - ALERTA
  static readonly IA_VIEW_ALERTA = 'ia.view_alerta';
  static readonly IA_ADD_ALERTA = 'ia.add_alerta';
  static readonly IA_CHANGE_ALERTA = 'ia.change_alerta';
  static readonly IA_DELETE_ALERTA = 'ia.delete_alerta';

  // IA - SUGERENCIA DE COMPRA
  static readonly IA_VIEW_SUGERENCIACOMPRA = 'ia.view_sugerenciacompra';
  static readonly IA_CHANGE_SUGERENCIACOMPRA = 'ia.change_sugerenciacompra';

  // AUTH - GRUPO (ROL)
  static readonly AUTH_VIEW_GROUP = 'auth.view_group';
  static readonly AUTH_ADD_GROUP = 'auth.add_group';
  static readonly AUTH_CHANGE_GROUP = 'auth.change_group';
  static readonly AUTH_DELETE_GROUP = 'auth.delete_group';

  // VENTA
  static readonly VENTA_VIEW_VENTA = 'venta.view_venta';
  static readonly VENTA_ADD_VENTA = 'venta.add_venta';
  static readonly VENTA_CHANGE_VENTA = 'venta.change_venta';
  static readonly VENTA_DELETE_VENTA = 'venta.delete_venta';

  // VENTA - CONFIGURACIÓN DE FIDELIZACIÓN
  static readonly VENTA_VIEW_CONFIGURACIONFIDELIZACION = 'venta.view_configuracionfidelizacion';
  static readonly VENTA_CHANGE_CONFIGURACIONFIDELIZACION = 'venta.change_configuracionfidelizacion';

  // AUTH - PERMISO
  static readonly AUTH_VIEW_PERMISSION = 'auth.view_permission';
  static readonly AUTH_CHANGE_PERMISSION = 'auth.change_permission';

  constructor(private authService: AuthService) {}

  /**
   * Verificar si tiene un permiso específico
   * Los superusuarios tienen acceso a todo
   */
  tiene(permiso: string): boolean {
    // Los superusuarios tienen todos los permisos
    if (this.authService.isSuperuser()) {
      return true;
    }
    return this.authService.hasPermiso(permiso);
  }

  /**
   * Verificar si tiene alguno de los permisos especificados
   * Los superusuarios tienen acceso a todo
   */
  tieneAlguno(permisos: string[]): boolean {
    // Los superusuarios tienen todos los permisos
    if (this.authService.isSuperuser()) {
      return true;
    }
    return this.authService.hasAnyPermiso(permisos);
  }

  /**
   * Verificar si tiene todos los permisos especificados
   * Los superusuarios tienen acceso a todo
   */
  tieneTodos(permisos: string[]): boolean {
    // Los superusuarios tienen todos los permisos
    if (this.authService.isSuperuser()) {
      return true;
    }
    return permisos.every(p => this.authService.hasPermiso(p));
  }

  /**
   * Métodos de conveniencia para funcionalidades comunes
   */

  // PRODUCTO
  puedeVerProducto(): boolean {
    return this.tiene(PermisosService.INVENTARIO_VIEW_PRODUCTO);
  }

  puedeCrearProducto(): boolean {
    return this.tiene(PermisosService.INVENTARIO_ADD_PRODUCTO);
  }

  puedeEditarProducto(): boolean {
    return this.tiene(PermisosService.INVENTARIO_CHANGE_PRODUCTO);
  }

  puedeEliminarProducto(): boolean {
    return this.tiene(PermisosService.INVENTARIO_DELETE_PRODUCTO);
  }

  // CATEGORÍA
  puedeVerCategoria(): boolean {
    return this.tiene(PermisosService.INVENTARIO_VIEW_CATEGORIA);
  }

  puedeCrearCategoria(): boolean {
    return this.tiene(PermisosService.INVENTARIO_ADD_CATEGORIA);
  }

  puedeEditarCategoria(): boolean {
    return this.tiene(PermisosService.INVENTARIO_CHANGE_CATEGORIA);
  }

  puedeEliminarCategoria(): boolean {
    return this.tiene(PermisosService.INVENTARIO_DELETE_CATEGORIA);
  }

  // PROVEEDOR
  puedeVerProveedor(): boolean {
    return this.tiene(PermisosService.COMPRA_VIEW_PROVEEDOR);
  }

  puedeCrearProveedor(): boolean {
    return this.tiene(PermisosService.COMPRA_ADD_PROVEEDOR);
  }

  puedeEditarProveedor(): boolean {
    return this.tiene(PermisosService.COMPRA_CHANGE_PROVEEDOR);
  }

  puedeEliminarProveedor(): boolean {
    return this.tiene(PermisosService.COMPRA_DELETE_PROVEEDOR);
  }

  // COMPRA
  puedeVerCompra(): boolean {
    return this.tiene(PermisosService.COMPRA_VIEW_COMPRA);
  }

  puedeCrearCompra(): boolean {
    return this.tiene(PermisosService.COMPRA_ADD_COMPRA);
  }

  puedeEditarCompra(): boolean {
    return this.tiene(PermisosService.COMPRA_CHANGE_COMPRA);
  }

  puedeEliminarCompra(): boolean {
    return this.tiene(PermisosService.COMPRA_DELETE_COMPRA);
  }

  // MARCA
  puedeVerMarca(): boolean {
    return this.tiene(PermisosService.INVENTARIO_VIEW_MARCA);
  }

  puedeCrearMarca(): boolean {
    return this.tiene(PermisosService.INVENTARIO_ADD_MARCA);
  }

  puedeEditarMarca(): boolean {
    return this.tiene(PermisosService.INVENTARIO_CHANGE_MARCA);
  }

  puedeEliminarMarca(): boolean {
    return this.tiene(PermisosService.INVENTARIO_DELETE_MARCA);
  }

  // VARIANTE
  puedeVerVariante(): boolean {
    return this.tiene(PermisosService.INVENTARIO_VIEW_VARIANTE);
  }

  puedeCrearVariante(): boolean {
    return this.tiene(PermisosService.INVENTARIO_ADD_VARIANTE);
  }

  puedeEditarVariante(): boolean {
    return this.tiene(PermisosService.INVENTARIO_CHANGE_VARIANTE);
  }

  puedeEliminarVariante(): boolean {
    return this.tiene(PermisosService.INVENTARIO_DELETE_VARIANTE);
  }

  // MULTIMEDIA
  puedeVerMultimedia(): boolean {
    return this.tiene(PermisosService.INVENTARIO_VIEW_MULTIMEDIO);
  }

  puedeCrearMultimedia(): boolean {
    return this.tiene(PermisosService.INVENTARIO_ADD_MULTIMEDIO);
  }

  puedeEditarMultimedia(): boolean {
    return this.tiene(PermisosService.INVENTARIO_CHANGE_MULTIMEDIO);
  }

  puedeEliminarMultimedia(): boolean {
    return this.tiene(PermisosService.INVENTARIO_DELETE_MULTIMEDIO);
  }

  // USUARIO
  puedeVerUsuario(): boolean {
    return this.tiene(PermisosService.SEGURIDAD_VIEW_USUARIO);
  }

  puedeCrearUsuario(): boolean {
    return this.tiene(PermisosService.SEGURIDAD_ADD_USUARIO);
  }

  puedeEditarUsuario(): boolean {
    return this.tiene(PermisosService.SEGURIDAD_CHANGE_USUARIO);
  }

  puedeEliminarUsuario(): boolean {
    return this.tiene(PermisosService.SEGURIDAD_DELETE_USUARIO);
  }

  // ROL/GRUPO
  puedeVerRol(): boolean {
    return this.tiene(PermisosService.AUTH_VIEW_GROUP);
  }

  puedeCrearRol(): boolean {
    return this.tiene(PermisosService.AUTH_ADD_GROUP);
  }

  puedeEditarRol(): boolean {
    return this.tiene(PermisosService.AUTH_CHANGE_GROUP);
  }

  puedeEliminarRol(): boolean {
    return this.tiene(PermisosService.AUTH_DELETE_GROUP);
  }

  // VENTA
  puedeVerVenta(): boolean {
    return this.tiene(PermisosService.VENTA_VIEW_VENTA);
  }

  puedeCrearVenta(): boolean {
    return this.tiene(PermisosService.VENTA_ADD_VENTA);
  }

  puedeEditarVenta(): boolean {
    return this.tiene(PermisosService.VENTA_CHANGE_VENTA);
  }

  puedeEliminarVenta(): boolean {
    return this.tiene(PermisosService.VENTA_DELETE_VENTA);
  }

  // PERMISO
  puedeVerPermiso(): boolean {
    return this.tiene(PermisosService.AUTH_VIEW_PERMISSION);
  }

  puedeEditarPermiso(): boolean {
    return this.tiene(PermisosService.AUTH_CHANGE_PERMISSION);
  }
}
