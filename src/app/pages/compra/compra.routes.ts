import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProveedorComponent } from './proveedor/proveedor';
import { CompraListComponent } from './compra-list/compra-list';
import { PermisosService } from '../../services/permisos.service';
import { AuthService } from '../../services/auth.service';

const canAccessWithPermiso = (permisos: string | string[]) => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const permisosArray = Array.isArray(permisos) ? permisos : [permisos];

    if (authService.hasAnyPermiso(permisosArray)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
};

export const CompraRoutes: Routes = [
  {
    path: 'compras',
    component: CompraListComponent,
    canActivate: [canAccessWithPermiso(PermisosService.COMPRA_VIEW_COMPRA)]
  },
  {
    path: 'proveedores',
    component: ProveedorComponent,
    canActivate: [canAccessWithPermiso(PermisosService.COMPRA_VIEW_PROVEEDOR)]
  },
];
