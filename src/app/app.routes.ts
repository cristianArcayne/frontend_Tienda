import { Routes, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { AuthService } from './services/auth.service';

/**
 * Guard funcional para verificar autenticación
 * Redirige a login si no está autenticado
 */
const canAccessDashboard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * CanMatch para landing publica
 * Solo aplica en localhost, 127.0.0.1 o campusflow.store
 * y solo para rutas raiz o /empresa/registro
 */
const canMatchPublicLanding = (_route: any, segments: UrlSegment[] = []) => {
  const hostname = window.location.hostname;
  const isPublicHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'campusflow.store';

  if (!isPublicHost) {
    return false;
  }

  if (segments.length === 0) {
    return true;
  }

  return segments[0].path === 'empresa';
};

const canMatchSuperAdmin = (_route: any, segments: UrlSegment[] = []) => {
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'admin.localhost' ||
    hostname === 'campusflow.store'
  );
};

export const routes: Routes = [
  // Panel superadmin del esquema público (oculto, solo en host público)
  {
    path: 'superadmin',
    component: BlankComponent,
    canMatch: [canMatchSuperAdmin],
    loadChildren: () =>
      import('./pages/superadmin/superadmin.routes').then((m) => m.SuperAdminRoutes),
  },
  // Landing publica (sin sidebar) solo en host publico
  {
    path: '',
    component: BlankComponent,
    canMatch: [canMatchPublicLanding],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./pages/empresa/empresa.routes').then((m) => m.EmpresaPublicRoutes),
      },
    ],
  },
  // Rutas CON sidebar (FullComponent) - Dashboard y Administración (va primero)
  {
    path: '',
    component: FullComponent,
    canActivate: [canAccessDashboard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.PagesRoutes),
      },
      {
        path: 'seguridad',
        loadChildren: () =>
          import('./pages/seguridad/seguridad.routes').then((m) => m.SeguridadRoutes),
      },
      {
        path: 'ui-components',
        loadChildren: () =>
          import('./pages/ui-components/ui-components.routes').then(
            (m) => m.UiComponentsRoutes
          ),
      },
      {
        path: 'extra',
        loadChildren: () =>
          import('./pages/extra/extra.routes').then((m) => m.ExtraRoutes),
      },
    ],
  },
  // Rutas SIN sidebar (BlankComponent) - Login y Registro
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: 'login',
        loadChildren: () =>
          import('./pages/seguridad/seguridad.routes').then((m) => m.SeguridadAuthRoutes),
      },
      {
        path: 'registrar',
        loadChildren: () =>
          import('./pages/seguridad/seguridad.routes').then((m) => m.RegistroRoutes),
      },
      {
        path: 'recuperar-password',
        loadChildren: () =>
          import('./pages/seguridad/seguridad.routes').then((m) => m.RecuperarPasswordRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
