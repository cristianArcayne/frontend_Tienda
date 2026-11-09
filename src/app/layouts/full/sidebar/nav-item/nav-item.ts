export interface NavItem {
  displayName?: string;
  divider?: boolean;
  iconName?: string;
  navCap?: string;
  route?: string;
  queryParams?: Record<string, any>;
  children?: NavItem[];
  chip?: boolean;
  chipContent?: string;
  chipClass?: string;
  external?: boolean;
  subItemIcon?: boolean;
  permiso?: string | string[];  // Permiso requerido para mostrar este item
  onlySuperadmin?: boolean;     // Exclusivo para el Superadministrador de la plataforma global
  onlyTenantAdmin?: boolean;    // Exclusivo para Administrador de Empresa Inquilina (SaaS)
  onlyAdmin?: boolean;          // Para administradores (Superadmin o Tenant Admin, excluye vendedores y clientes)
  hideForSuperadmin?: boolean;  // Ocultar a Superadmin (solo para inquilinos/tenants)
}
