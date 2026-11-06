import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Guard funcional que restringe el acceso al Panel Superadmin exclusivamente
 * al Superadministrador global de la plataforma (usuario 'admin' con is_superuser = true).
 * Cualquier tenant admin o usuario regular es redirigido a /dashboard con un mensaje de advertencia.
 */
export const superadminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  if (authService.isAuthenticated() && authService.isSuperuser()) {
    return true;
  }

  snackBar.open(
    'Acceso denegado: El Panel Multi-Tenant está reservado exclusivamente para el Superadministrador de la plataforma.',
    'Cerrar',
    {
      duration: 5000,
      panelClass: ['warning-snackbar']
    }
  );

  return router.createUrlTree(['/dashboard']);
};
