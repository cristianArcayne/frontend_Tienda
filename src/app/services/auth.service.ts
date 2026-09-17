import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  access: string;
  refresh: string;
  usuario_id: number;
  username: string;
  nombre_completo: string;
  is_superuser: boolean;
  roles: string[];
  permisos: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  usuario_id: number | null;
  username: string | null;
  nombre_completo: string | null;
  access_token: string | null;
  refresh_token: string | null;
  is_superuser: boolean;
  roles: string[];
  permisos: string[];
}

/**
 * Servicio de Autenticación
 * Maneja login, logout, tokens y estado de la sesión
 * Guarda: access_token, refresh_token y usuario_id
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_PREFIX = 'auth_';
  private readonly ACCESS_TOKEN_KEY = `${this.STORAGE_PREFIX}access_token`;
  private readonly REFRESH_TOKEN_KEY = `${this.STORAGE_PREFIX}refresh_token`;
  private readonly USUARIO_ID_KEY = `${this.STORAGE_PREFIX}usuario_id`;
  private readonly USERNAME_KEY = `${this.STORAGE_PREFIX}username`;
  private readonly NOMBRE_COMPLETO_KEY = `${this.STORAGE_PREFIX}nombre_completo`;
  private readonly IS_SUPERUSER_KEY = `${this.STORAGE_PREFIX}is_superuser`;
  private readonly ROLES_KEY = `${this.STORAGE_PREFIX}roles`;
  private readonly PERMISOS_KEY = `${this.STORAGE_PREFIX}permisos`;

  private authState = new BehaviorSubject<AuthState>(this.getInitialState());
  public authState$ = this.authState.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private router: Router
  ) {
    this.restoreAuthState();
  }

  /**
   * Login con usuario y contraseña
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = this.configService.getApiUrl('login');

    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap(response => {
        if (response.success) {
          this.saveAuthData(response);
        }
      })
    );
  }

  /**
   * Logout - limpia los tokens y estado
   */
  logout(): Observable<void> {
    this.clearAuthData();
    this.authState.next(this.getInitialState());
    return of(void 0);
  }

  /**
   * Guardar datos de autenticación en localStorage
   */
  private saveAuthData(response: LoginResponse): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
    localStorage.setItem(this.USUARIO_ID_KEY, response.usuario_id.toString());
    localStorage.setItem(this.USERNAME_KEY, response.username);
    localStorage.setItem(this.NOMBRE_COMPLETO_KEY, response.nombre_completo);
    localStorage.setItem(this.IS_SUPERUSER_KEY, JSON.stringify(response.is_superuser));
    localStorage.setItem(this.ROLES_KEY, JSON.stringify(response.roles));
    localStorage.setItem(this.PERMISOS_KEY, JSON.stringify(response.permisos));

    this.authState.next({
      isAuthenticated: true,
      usuario_id: response.usuario_id,
      username: response.username,
      nombre_completo: response.nombre_completo,
      access_token: response.access,
      refresh_token: response.refresh,
      is_superuser: response.is_superuser,
      roles: response.roles,
      permisos: response.permisos
    });
  }

  /**
   * Restaurar estado de autenticación desde localStorage
   */
  private restoreAuthState(): void {
    const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const usuarioId = localStorage.getItem(this.USUARIO_ID_KEY);
    const username = localStorage.getItem(this.USERNAME_KEY);
    const nombreCompleto = localStorage.getItem(this.NOMBRE_COMPLETO_KEY);
    const isSuperuser = localStorage.getItem(this.IS_SUPERUSER_KEY);
    const roles = localStorage.getItem(this.ROLES_KEY);
    const permisos = localStorage.getItem(this.PERMISOS_KEY);

    if (accessToken && usuarioId) {
      this.authState.next({
        isAuthenticated: true,
        usuario_id: parseInt(usuarioId),
        username: username || null,
        nombre_completo: nombreCompleto || null,
        access_token: accessToken,
        refresh_token: refreshToken,
        is_superuser: isSuperuser ? JSON.parse(isSuperuser) : false,
        roles: roles ? JSON.parse(roles) : [],
        permisos: permisos ? JSON.parse(permisos) : []
      });
    }
  }

  /**
   * Limpiar datos de autenticación
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USUARIO_ID_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    localStorage.removeItem(this.NOMBRE_COMPLETO_KEY);
    localStorage.removeItem(this.IS_SUPERUSER_KEY);
    localStorage.removeItem(this.ROLES_KEY);
    localStorage.removeItem(this.PERMISOS_KEY);
  }

  /**
   * Obtener token de acceso
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Obtener token de refresco
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtener ID del usuario
   */
  getUsuarioId(): number | null {
    const id = localStorage.getItem(this.USUARIO_ID_KEY);
    return id ? parseInt(id) : null;
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Obtener estado actual de autenticación
   */
  getCurrentAuthState(): AuthState {
    return this.authState.value;
  }

  /**
   * Obtener usuario actual como Observable
   */
  getCurrentUser(): Observable<{ username: string; nombre_completo: string }> {
    const currentState = this.authState.value;
    return of({
      username: currentState.username || '',
      nombre_completo: currentState.nombre_completo || ''
    });
  }

  /**
   * Refrescar token de acceso usando el refresh token
   */
  refreshAccessToken(): Observable<LoginResponse> {
    const url = this.configService.getApiUrl('auth/refresh');
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.logout();
      throw new Error('No refresh token available');
    }

    return this.http.post<LoginResponse>(url, { refresh: refreshToken }).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access);
          localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
        }
      })
    );
  }

  /**
   * Obtener lista de permisos del usuario
   */
  getPermisos(): string[] {
    return this.authState.value.permisos;
  }

  /**
   * Verificar si tiene un permiso específico
   */
  hasPermiso(permiso: string): boolean {
    const permisos = this.getPermisos();
    return permisos.includes('*') || permisos.includes(permiso);
  }

  /**
   * Verificar si tiene alguno de los permisos especificados
   */
  hasAnyPermiso(permisos: string[]): boolean {
    return permisos.some(p => this.hasPermiso(p));
  }

  /**
   * Verificar si es superusuario
   */
  isSuperuser(): boolean {
    return this.authState.value.is_superuser;
  }

  /**
   * Obtener lista de roles del usuario
   */
  getRoles(): string[] {
    return this.authState.value.roles;
  }

  /**
   * Verificar si tiene un rol específico
   */
  hasRol(rol: string): boolean {
    return this.authState.value.roles.includes(rol);
  }

  /**
   * Estado inicial de autenticación
   */
  private getInitialState(): AuthState {
    return {
      isAuthenticated: false,
      usuario_id: null,
      username: null,
      nombre_completo: null,
      access_token: null,
      refresh_token: null,
      is_superuser: false,
      roles: [],
      permisos: []
    };
  }
}