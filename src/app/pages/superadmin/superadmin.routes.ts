import { Routes } from '@angular/router';
import { superadminGuard } from '../../services/superadmin.guard';

export const SuperAdminRoutes: Routes = [
  {
    path: 'panel',
    loadComponent: () => import('./panel/panel-superadmin').then(m => m.PanelSuperadmin),
    canActivate: [superadminGuard],
  },
  {
    path: '',
    redirectTo: 'panel',
    pathMatch: 'full'
  }
];