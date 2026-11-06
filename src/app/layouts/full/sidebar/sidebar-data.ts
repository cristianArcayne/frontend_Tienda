import { NavItem } from './nav-item/nav-item';
import { PermisosService } from '../../../services/permisos.service';

export const navItems: NavItem[] = [
  {
    displayName: 'Dashboard Principal',
    iconName: 'solar:pie-chart-2-line-duotone',
    route: '/',
    onlyAdmin: true,
    permiso: PermisosService.SEGURIDAD_VIEW_DASHBOARD,
  },

  // =========================================================================
  // SEGUNDO PARCIAL (ARQUITECTURA ICONIX - SAAS & OFFLINE)
  // =========================================================================
  {
    navCap: 'SEGUNDO PARCIAL (ICONIX - EXAMEN 2)',
    divider: true,
  },

  // P1: Seguridad y SaaS Multitenant (3 Casos de Uso)
  {
    displayName: 'P1: Seguridad y SaaS Multitenant',
    iconName: 'solar:shield-keyhole-line-duotone',
    children: [
      {
        displayName: '[CU-01] Registrar Empresa y Suscripción SaaS (Stripe)',
        iconName: 'solar:card-send-line-duotone',
        route: '/superadmin/panel',
        onlySuperadmin: true,
      },
      {
        displayName: '[CU-01] Mi Suscripción SaaS (Stripe)',
        iconName: 'solar:card-send-line-duotone',
        route: '/suscripcion',
        onlyTenantAdmin: true,
        hideForSuperadmin: true,
      },
      {
        displayName: '[CU-02] Autenticación y Control de Acceso (JWT)',
        iconName: 'solar:user-id-line-duotone',
        route: '/seguridad/usuarios',
        permiso: PermisosService.SEGURIDAD_VIEW_USUARIO,
      },
      {
        displayName: '[CU-03] Administrar Sucursales y Puntos de Caja',
        iconName: 'solar:shop-2-line-duotone',
        route: '/inventario/sucursales',
        onlyAdmin: true,
        permiso: PermisosService.INVENTARIO_VIEW_CATEGORIA,
      },
    ],
  },

  // P2: Catálogo Omnicanal y AR (4 Casos de Uso)
  {
    displayName: 'P2: Catálogo Omnicanal y AR',
    iconName: 'solar:hanger-2-line-duotone',
    children: [
      {
        displayName: '[CU-04] Administrar Catálogo, Tallas y Temporadas',
        iconName: 'solar:tag-line-duotone',
        route: '/inventario/productos',
        onlyAdmin: true,
        permiso: PermisosService.INVENTARIO_CHANGE_PRODUCTO,
      },
      {
        displayName: '[CU-05] Consultar Catálogo Offline (IndexedDB / SQLite)',
        iconName: 'solar:cloud-cross-line-duotone',
        route: '/extra/catalogo',
        permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
      },
      {
        displayName: '[CU-06] Utilizar Vestidor Virtual con AR (Móvil)',
        iconName: 'solar:mirror-line-duotone',
        route: '/extra/vestidor',
        permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
      },
      {
        displayName: '[CU-07] Gestionar Reservas Web-to-Store (Offline)',
        iconName: 'solar:calendar-date-line-duotone',
        route: '/inventario/reservas',
        permiso: PermisosService.INVENTARIO_VIEW_CATALOGO,
      },
    ],
  },

  // P3: Comercialización y Ventas POS (4 Casos de Uso)
  {
    displayName: 'P3: Comercialización y Ventas POS',
    iconName: 'solar:card-2-line-duotone',
    children: [
      {
        displayName: '[CU-08] Gestionar Carrito de Compras Persistente',
        iconName: 'solar:cart-large-2-line-duotone',
        route: '/extra/carrito',
        permiso: [PermisosService.INVENTARIO_VIEW_CATALOGO, PermisosService.VENTA_VIEW_VENTA],
      },
      {
        displayName: '[CU-09] Procesar Ventas POS con Resiliencia Offline',
        iconName: 'solar:calculator-line-duotone',
        route: '/ventas/nueva',
        permiso: PermisosService.VENTA_ADD_VENTA,
      },
      {
        displayName: '[CU-10] Procesar Ventas Digitales con Pasarela Stripe',
        iconName: 'solar:card-send-line-duotone',
        route: '/ventas/pasarela',
        permiso: PermisosService.VENTA_VIEW_VENTA,
      },
      {
        displayName: '[CU-11] Procesar Cobros con Código QR Simple',
        iconName: 'solar:qr-code-line-duotone',
        route: '/ventas/cobro-qr',
        permiso: PermisosService.VENTA_VIEW_VENTA,
      },
    ],
  },

  // P4: Logística y Resiliencia Offline (3 Casos de Uso)
  {
    displayName: 'P4: Logística y Resiliencia Offline',
    iconName: 'solar:cart-check-line-duotone',
    children: [
      {
        displayName: '[CU-12] Devoluciones y Cambios de Talla (Garantía 7 Días)',
        iconName: 'solar:restart-square-line-duotone',
        route: '/ventas/devoluciones/gestion',
        permiso: PermisosService.VENTA_VIEW_VENTA,
      },
      {
        displayName: '[CU-13] Gestionar Traspasos de Mercadería entre Sucursales',
        iconName: 'solar:transfer-horizontal-line-duotone',
        route: '/inventario/traspasos',
        permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
      },
      {
        displayName: '[CU-14] Sincronización Automática y Resolución Conflictos',
        iconName: 'solar:refresh-circle-line-duotone',
        route: '/inventario/sincronizacion',
        permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
      },
    ],
  },

  // P5: Analítica Predictiva, IA, Auditoría y Mantenimiento (4 Casos de Uso)
  {
    displayName: 'P5: Analítica, IA y Mantenimiento SaaS',
    iconName: 'solar:magic-stick-3-line-duotone',
    children: [
      {
        displayName: '[CU-15] Reportes Generativos por Voz/Texto con IA',
        iconName: 'solar:microphone-3-line-duotone',
        route: '/reportes',
        permiso: PermisosService.SEGURIDAD_ADD_REPORTE,
      },
      {
        displayName: '[CU-16] Tablero Ejecutivo (KPIs) y Predictiva ML',
        iconName: 'solar:chart-square-line-duotone',
        route: '/dashboard',
        permiso: PermisosService.SEGURIDAD_VIEW_DASHBOARD,
      },
      {
        displayName: '[CU-17] Auditoría de Operaciones y Bitácora (Llave Dev)',
        iconName: 'solar:key-square-2-line-duotone',
        route: '/seguridad/bitacora',
        permiso: PermisosService.SEGURIDAD_VIEW_BITACORA_AUDITORIA,
      },
      {
        displayName: '[CU-18] Backup y Restauración de Base de Datos',
        iconName: 'solar:database-line-duotone',
        route: '/seguridad/base-de-datos',
        permiso: [PermisosService.SEGURIDAD_ADD_REPORTE, PermisosService.SEGURIDAD_VIEW_USUARIO],
      },
    ],
  },

  // =========================================================================
  // PRIMER PARCIAL (LÍNEA BASE PUDS - HISTÓRICO)
  // =========================================================================
  {
    navCap: 'PRIMER PARCIAL (LÍNEA BASE PUDS)',
    divider: true,
  },

  {
    displayName: 'P1: Seguridad y Personal (Base)',
    iconName: 'solar:shield-line-duotone',
    children: [
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
        displayName: '[CU18] Reportes y Estadísticas',
        iconName: 'solar:chart-square-line-duotone',
        route: '/reportes',
        permiso: PermisosService.SEGURIDAD_ADD_REPORTE,
      },
    ],
  },

  {
    displayName: 'P2: Configuración y Catálogo (Base)',
    iconName: 'solar:settings-minimalistic-line-duotone',
    children: [
      {
        displayName: '[CU04] Parámetros de Moda',
        iconName: 'solar:tag-line-duotone',
        route: '/inventario/categorias',
        permiso: PermisosService.INVENTARIO_VIEW_CATEGORIA,
      },
      {
        displayName: '[CU05] Sucursales de la Cadena',
        iconName: 'solar:shop-2-line-duotone',
        route: '/inventario/sucursales',
        permiso: PermisosService.INVENTARIO_VIEW_CATEGORIA,
      },
      {
        displayName: '[CU06] Proveedores Comerciales',
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
    ],
  },

  {
    displayName: 'P3: Logística e Inventario (Base)',
    iconName: 'solar:box-minimalistic-line-duotone',
    children: [
      {
        displayName: '[CU08] Promociones y Descuentos',
        iconName: 'solar:sale-tag-line-duotone',
        route: '/inventario/promociones',
        permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
      },
      {
        displayName: '[CU09] Inventario Físico Local',
        iconName: 'solar:box-minimalistic-line-duotone',
        route: '/inventario/fisico',
        permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
      },
      {
        displayName: '[CU10] Traspasos entre Sucursales',
        iconName: 'solar:transfer-horizontal-line-duotone',
        route: '/inventario/traspasos',
        permiso: PermisosService.INVENTARIO_VIEW_PRODUCTO,
      },
    ],
  },

  {
    displayName: 'P4: Experiencia del Cliente (Base)',
    iconName: 'solar:users-group-rounded-line-duotone',
    children: [
      {
        displayName: '[CU11] Catálogo Web Omnicanal',
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
        permiso: PermisosService.SEGURIDAD_ADD_PREDICCION,
      },
      {
        displayName: '[CU19] Reseñas y Calificaciones',
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
        displayName: 'Notificaciones',
        iconName: 'solar:chat-round-line-line-duotone',
        route: '/notificaciones',
        permiso: PermisosService.NOTIFICACIONES_VIEW_NOTIFICACION,
      },
    ],
  },

  {
    displayName: 'P5: Comercial y Transacciones (Base)',
    iconName: 'solar:cart-check-line-duotone',
    children: [
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
      {
        displayName: 'Gestión Devoluciones (24h)',
        iconName: 'solar:restart-square-line-duotone',
        route: '/ventas/devoluciones/gestion',
        permiso: PermisosService.VENTA_VIEW_VENTA,
      },
    ],
  },

  // =========================================================================
  // ADMINISTRACIÓN GLOBAL SAAS
  // =========================================================================
  {
    displayName: 'SaaS Multi-Tenant Global',
    iconName: 'solar:cloud-storage-line-duotone',
    onlySuperadmin: true,
    children: [
      {
        displayName: 'Panel Superadmin (Empresas)',
        iconName: 'solar:shield-network-line-duotone',
        route: '/superadmin/panel',
        onlySuperadmin: true,
      },
    ],
  },
];
