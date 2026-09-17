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
    // Agregar token de acceso a la petición
    const token = this.authService.getAccessToken();
    if (token) {
      request = this.addTokenToRequest(request, token);
    }

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
              return next.handle(this.addTokenToRequest(request, newToken));
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
   * Agregar token Bearer a las peticiones
   */
  private addTokenToRequest(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
