import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermisosService } from '../../services/permisos.service';

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

// pages
import { AppIconsComponent } from './icons/icons.component';
import { AppSamplePageComponent } from './sample-page/sample-page.component';
import { CarritoComponent } from './carrito/carrito';
import { CatalogoComponent } from './catalogo/catalogo';
import { ComparadorComponent } from './comparador/comparador';
import { VestidorVirtualComponent } from './vestidor/vestidor.component';
import { ResenasPageComponent } from './resenas/resenas.component';

export const ExtraRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'icons',
        component: AppIconsComponent,
      },
      {
        path: 'sample-page',
        component: AppSamplePageComponent,
      },
      {
        path: 'carrito',
        component: CarritoComponent,
      },
      {
        path: 'catalogo',
        component: CatalogoComponent,
        canActivate: [canAccessWithPermiso(PermisosService.INVENTARIO_VIEW_CATALOGO)],
      },
      {
        path: 'comparador',
        component: ComparadorComponent,
      },
      {
        path: 'vestidor',
        component: VestidorVirtualComponent,
      },
      {
        path: 'resenas',
        component: ResenasPageComponent,
      },
    ],
  },
];
