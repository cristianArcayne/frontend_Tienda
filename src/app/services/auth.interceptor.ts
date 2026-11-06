import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Interceptor HTTP que:
 * 1. Agrega el token de acceso a cada petición
 * 2. Maneja errores 401 (token expirado) y refresca el token
 * 3. Reintenta la petición original después de refrescar
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Agregar token de acceso y tenant header a la petición
    const token = this.authService.getAccessToken();
    const empresaId = this.authService.getEmpresaId();
    request = this.addHeadersToRequest(request, token, empresaId);

    return next.handle(request).pipe(
      catchError(error => {
        // Si el error es 401 (No autorizado), intentar refrescar el token
        if (error instanceof HttpErrorResponse && error.status === 401 && !this.isRefreshing) {
          this.isRefreshing = true;

          return this.authService.refreshAccessToken().pipe(
            switchMap(response => {
              this.isRefreshing = false;
              // Reintentar la petición original con el nuevo token
              const newToken = response.access;
              const currentTenantId = this.authService.getEmpresaId();
              return next.handle(this.addHeadersToRequest(request, newToken, currentTenantId));
            }),
            catchError(refreshError => {
              this.isRefreshing = false;
              // Si el refresh también falla, logout
              this.authService.logout();
              return throwError(() => refreshError);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Agregar token Bearer y X-Tenant-ID a las peticiones
   */
  private addHeadersToRequest(
    request: HttpRequest<unknown>,
    token: string | null,
    empresaId: number | null
  ): HttpRequest<unknown> {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (this.authService.isSuperuser()) {
      headers['X-Is-Superuser'] = 'true';
    }
    if (empresaId !== null && empresaId !== undefined) {
      headers['X-Tenant-ID'] = empresaId.toString();
    }
    if (Object.keys(headers).length > 0) {
      return request.clone({ setHeaders: headers });
    }
    return request;
  }
}
