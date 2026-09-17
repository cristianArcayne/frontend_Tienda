import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CategoriaComponent } from './categoria/categoria';
import { ProductoComponent } from './producto/producto';
import { DetallesProductoPageComponent } from './producto/detalles-producto-page/detalles-producto-page';
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

const canAccessProductoDetalle = (permisos: string | string[]) => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const permisosArray = Array.isArray(permisos) ? permisos : [permisos];
    const isCliente = authService.getRoles().some((rol) => rol?.toLowerCase() === 'cliente');

    if (authService.hasAnyPermiso(permisosArray) || isCliente) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
};

export const InventarioRoutes: Routes = [
  {
    path: 'categorias',
    component: CategoriaComponent,
    canActivate: [canAccessWithPermiso(PermisosService.INVENTARIO_VIEW_CATEGORIA)]
  },
  {
    path: 'productos',
    component: ProductoComponent,
    canActivate: [canAccessWithPermiso(PermisosService.INVENTARIO_VIEW_PRODUCTO)]
  },
  {
    path: 'productos/:id',
    component: DetallesProductoPageComponent,
    canActivate: [canAccessProductoDetalle(PermisosService.INVENTARIO_VIEW_PRODUCTO)]
  },
];
