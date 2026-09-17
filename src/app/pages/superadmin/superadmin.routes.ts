import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const canActivateSuperAdminPanel = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isSuperuser()) return true;
  return router.createUrlTree(['/superadmin/login']);
};

const canActivateSuperAdminLogin = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isSuperuser()) {
    return router.createUrlTree(['/superadmin/panel']);
  }
  return true;
};

export const SuperAdminRoutes: Routes = [
  {
    path: 'login',
    canActivate: [canActivateSuperAdminLogin],
    loadComponent: () => import('./login/login-superadmin').then(m => m.LoginSuperadmin),
  },
  {
    path: 'panel',
    canActivate: [canActivateSuperAdminPanel],
    loadComponent: () => import('./panel/panel-superadmin').then(m => m.PanelSuperadmin),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];