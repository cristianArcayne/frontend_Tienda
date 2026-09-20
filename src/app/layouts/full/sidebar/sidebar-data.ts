import { NavItem } from './nav-item/nav-item';
import { PermisosService } from '../../../services/permisos.service';

export const navItems: NavItem[] = [
  {
    displayName: 'Dashboard',
    iconName: 'solar:pie-chart-2-line-duotone',
    route: '/',
    permiso: PermisosService.SEGURIDAD_VIEW_DASHBOARD,
  },

  // ==========================================
  // P1: SEGURIDAD Y ADMINISTRACIÓN
  // ==========================================
  {
    navCap: 'P1: Seguridad y Administración',
    permiso: [
      PermisosService.SEGURIDAD_VIEW_USUARIO,
      PermisosService.AUTH_VIEW_GROUP,
      PermisosService.SEGURIDAD_VIEW_BITACORA_AUDITORIA,
      PermisosService.SEGURIDAD_ADD_REPORTE,
    ],
  },
  {
    displayName: '[CU01] Personal y Usuarios',
    iconName: 'solar:user-id-line-duotone',
    route: '/seguridad/usuarios',
    permiso: PermisosService.SEGURIDAD_VIEW_USUARIO,
  },
  {
    displayName: '[CU02] Roles y Permisos',
    iconName: 'solar:lock-password-unlocked-line-duotone',
    route: '/seguridad/roles',
    permiso: PermisosService.AUTH_VIEW_GROUP,
  },
  {
    displayName: '[CU03] Bitácora de Auditoría',
    iconName: 'solar:history-line-duotone',
    route: '/seguridad/bitacora',
    permiso: PermisosService.SEGURIDAD_VIEW_BITACORA_AUDITORIA,
  },
  {
    displayName: '[CU18] Reportes por Voz',
    iconName: 'solar:microphone-line-duotone',
    route: '/reportes',
    permiso: PermisosService.SEGURIDAD_ADD_REPORTE,
  },
  {
    displayName: 'Reportes (Tabulares)',
    iconName: 'solar:chart-square-line-duotone',
    route: '/reportes',
    permiso: PermisosService.SEGURIDAD_ADD_REPORTE,
  },

  // ==========================================
  // P2: CONFIGURACIÓN Y CATÁLOGO
  // ==========================================
  {
    navCap: 'P2: Configuración y Catálogo',
    permiso: [
      PermisosService.INVENTARIO_VIEW_CATEGORIA,
      PermisosService.INVENTARIO_VIEW_PRODUCTO,
      PermisosService.COMPRA_VIEW_PROVEEDOR,
      PermisosService.SEGURIDAD_CHANGE_EMPRESA,
    ],
  },
  {
    displayName: '[CU04] Parámetros de Moda',
    iconName: 'solar:tag-line-duotone',
    route: '/inventario/categorias',
    permiso: PermisosService.INVENTARIO_VIEW_CATEGORIA,
  },
  {
    displayName: '[CU05] Sucursales',
    iconName: 'solar:shop-2-line-duotone',
    route: '/inventario/sucursales',
    permiso: PermisosService.INVENTARIO_VIEW_CATEGORIA,
  },
  {
    displayName: '[CU06] Proveedores',
    iconName: 'solar:bag-3-line-duotone',
    route: '/compra/proveedores',
    permiso: PermisosService.COMPRA_VIEW_PROVEEDOR,
  },
  {
    displayName: '[CU07] Prendas y Recursos 3D',
    iconName: 'solar:hanger-2-line-duotone',
    route: '/inventario/productos',
    permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
  },

  // ==========================================
  // P3: LOGÍSTICA E INVENTARIO
  // ==========================================
  {
    navCap: 'P3: Logística e Inventario',
    permiso: [
      PermisosService.INVENTARIO_VIEW_PRODUCTO,
      PermisosService.INVENTARIO_VIEW_CATALOGO,
    ],
  },
  {
    displayName: '[CU08] Promociones',
    iconName: 'solar:sale-tag-line-duotone',
    route: '/inventario/promociones',
    permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
  },
  {
    displayName: '[CU09] Inventario Físico',
    iconName: 'solar:box-minimalistic-line-duotone',
    route: '/inventario/fisico',
    permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
  },
  {
    displayName: '[CU10] Traspasos de Stock',
    iconName: 'solar:transfer-horizontal-line-duotone',
    route: '/inventario/traspasos',
    permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
  },

  // ==========================================
  // P4: EXPERIENCIA DEL CLIENTE
  // ==========================================
  {
    navCap: 'P4: Experiencia del Cliente',
    permiso: [
      PermisosService.INVENTARIO_VIEW_CATALOGO,
      PermisosService.IA_VIEW_ALERTA,
      PermisosService.NOTIFICACIONES_VIEW_NOTIFICACION,
    ],
  },
  {
    displayName: '[CU11] Catálogo Web',
    iconName: 'solar:widget-2-line-duotone',
    route: '/extra/catalogo',
    permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
  },
  {
    displayName: '[CU16] Vestidor Virtual AR',
    iconName: 'solar:mirror-line-duotone',
    route: '/extra/vestidor',
    permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
  },
  {
    displayName: '[CU17] Recomendador IA',
    iconName: 'solar:magic-stick-3-line-duotone',
    route: '/ia/recomendador',
    permiso: [
      PermisosService.SEGURIDAD_ADD_PREDICCION,
      PermisosService.INVENTARIO_VIEW_CATALOGO,
    ],
  },
  {
    displayName: '[CU19] Reseñas y Calif.',
    iconName: 'solar:star-fall-minimalistic-2-line-duotone',
    route: '/extra/resenas',
    permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
  },
  {
    displayName: 'Mis Compras',
    iconName: 'solar:receipt-list-line-duotone',
    route: '/mis-compras',
    permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
  },
  {
    displayName: 'Alertas IA',
    iconName: 'solar:bell-bing-line-duotone',
    route: '/ia/alertas',
    permiso: PermisosService.IA_VIEW_ALERTA,
  },
  {
    displayName: 'Notificaciones',
    iconName: 'solar:chat-round-line-line-duotone',
    route: '/notificaciones',
    permiso: PermisosService.NOTIFICACIONES_VIEW_NOTIFICACION,
  },

  // ==========================================
  // P5: COMERCIAL Y TRANSACCIONES
  // ==========================================
  {
    navCap: 'P5: Comercial y Transacciones',
    permiso: [
      PermisosService.INVENTARIO_VIEW_CATALOGO,
      PermisosService.VENTA_VIEW_VENTA,
      PermisosService.VENTA_ADD_VENTA,
    ],
  },
  {
    displayName: '[CU12] Reservas Web-to-Store',
    iconName: 'solar:calendar-date-line-duotone',
    route: '/inventario/reservas',
    permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
  },
  {
    displayName: '[CU13] Carrito Persistente',
    iconName: 'solar:cart-large-2-line-duotone',
    route: '/extra/carrito',
    permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
  },
  {
    displayName: '[CU14] Ventas Físicas POS',
    iconName: 'solar:cart-check-line-duotone',
    route: '/ventas/nueva',
    permiso: PermisosService.VENTA_ADD_VENTA,
  },
  {
    displayName: '[CU15] Ventas E-commerce',
    iconName: 'solar:card-2-line-duotone',
    route: '/ventas',
    permiso: PermisosService.VENTA_VIEW_VENTA,
  },
];
