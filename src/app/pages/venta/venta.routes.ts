import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermisosService } from '../../services/permisos.service';
import { VentaListComponent } from './venta-list/venta-list';
import { CrearVentaComponent } from './crear-venta/crear-venta';
import { DetalleVentaComponent } from './detalle-venta/detalle-venta';

const canAccessWithPermiso = (permiso: string) => {
  return () => {
    const permisosService = inject(PermisosService);
    const router = inject(Router);

    if (permisosService.tiene(permiso)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};

export const VentaRoutes: Routes = [
  {
    path: '',
    component: VentaListComponent,
    canActivate: [canAccessWithPermiso(PermisosService.VENTA_VIEW_VENTA)]
  },
  {
    path: 'nueva',
    component: CrearVentaComponent,
    canActivate: [canAccessWithPermiso(PermisosService.VENTA_ADD_VENTA)]
  },
  {
    path: ':id',
    component: DetalleVentaComponent,
    canActivate: [canAccessWithPermiso(PermisosService.VENTA_VIEW_VENTA)]
  },
];
