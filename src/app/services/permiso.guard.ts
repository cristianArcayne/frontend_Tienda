import { Injectable } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard para verificar permisos antes de acceder a una ruta
 * 
 * Uso en rutas:
 * { 
 *   path: 'productos', 
 *   component: ProductoComponent,
 *   canActivate: [permisoGuard(AuthService, 'inventario.view_producto')]
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class PermisoGuardService {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(permiso: string | string[]): boolean {
    const permisos = Array.isArray(permiso) ? permiso : [permiso];
    
    if (this.authService.hasAnyPermiso(permisos)) {
      return true;
    }

    this.router.navigate(['/']);
    return false;
  }
}

/**
 * Functional guard para verificar permisos
 * Uso: canActivate: [permisoGuard('inventario.view_producto')]
 */
export function permisoGuard(
  authService: AuthService,
  router: Router,
  permisos: string | string[]
): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const permisosArray = Array.isArray(permisos) ? permisos : [permisos];

    if (authService.hasAnyPermiso(permisosArray)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
}
