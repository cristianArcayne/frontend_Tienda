import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, of, Subscription, fromEvent, merge, timer } from 'rxjs';
import { tap, throttleTime } from 'rxjs/operators';
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
  empresa_id?: number | null;
  empresa_nombre?: string | null;
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
  empresa_id?: number | null;
  empresa_nombre?: string | null;
}

/**
 * Servicio de Autenticación
 * Maneja login, logout, tokens, expiración y timeout de inactividad
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
  private readonly REMEMBER_ME_KEY = `${this.STORAGE_PREFIX}remember_me`;
  private readonly EMPRESA_ID_KEY = `${this.STORAGE_PREFIX}empresa_id`;
  private readonly EMPRESA_NOMBRE_KEY = `${this.STORAGE_PREFIX}empresa_nombre`;

  /** Tiempo de inactividad antes de cerrar sesión (10 minutos) */
  private readonly INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

  private inactivityTimerSubscription?: Subscription;
  private userActivitySubscription?: Subscription;

  private authState = new BehaviorSubject<AuthState>(this.getInitialState());
  public authState$ = this.authState.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private router: Router,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {
    this.restoreAuthState();
  }

  /**
   * Obtiene el storage activo (sessionStorage o localStorage)
   */
  private getActiveStorage(): Storage {
    if (sessionStorage.getItem(this.ACCESS_TOKEN_KEY)) {
      return sessionStorage;
    }
    return localStorage;
  }

  /**
   * Obtiene un valor buscando primero en sessionStorage y luego en localStorage
   */
  private getItem(key: string): string | null {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  }

  /**
   * Login con usuario y contraseña
   */
  login(credentials: LoginRequest, rememberMe: boolean = false): Observable<LoginResponse> {
    const url = this.configService.getApiUrl('login');

    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap(response => {
        if (response.success) {
          this.saveAuthData(response, rememberMe);
        }
      })
    );
  }

  /**
   * Logout - limpia los tokens, estado y temporizadores de inactividad
   */
  logout(): Observable<void> {
    this.clearAuthData();
    this.authState.next(this.getInitialState());
    return of(void 0);
  }

  /**
   * Guardar datos de autenticación en localStorage o sessionStorage según rememberMe
   */
  private saveAuthData(response: LoginResponse, rememberMe: boolean): void {
    // Limpiar ambos almacenamientos previamente
    this.clearAuthData();

    // Guardar en ambos storages para resiliencia total contra recargas
    const storages = [sessionStorage, localStorage];
    storages.forEach(storage => {
      try {
        storage.setItem(this.ACCESS_TOKEN_KEY, response.access);
        storage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
        storage.setItem(this.USUARIO_ID_KEY, response.usuario_id.toString());
        storage.setItem(this.USERNAME_KEY, response.username);
        storage.setItem(this.NOMBRE_COMPLETO_KEY, response.nombre_completo);
        storage.setItem(this.IS_SUPERUSER_KEY, JSON.stringify(response.is_superuser));
        storage.setItem(this.ROLES_KEY, JSON.stringify(response.roles));
        storage.setItem(this.PERMISOS_KEY, JSON.stringify(response.permisos));
        storage.setItem(this.REMEMBER_ME_KEY, JSON.stringify(rememberMe));

        if (response.empresa_id !== undefined && response.empresa_id !== null) {
          storage.setItem(this.EMPRESA_ID_KEY, response.empresa_id.toString());
        } else {
          storage.removeItem(this.EMPRESA_ID_KEY);
        }

        if (response.empresa_nombre) {
          storage.setItem(this.EMPRESA_NOMBRE_KEY, response.empresa_nombre);
        } else {
          storage.removeItem(this.EMPRESA_NOMBRE_KEY);
        }
      } catch (e) {
        console.error('Error guardando en storage:', e);
      }
    });

    this.authState.next({
      isAuthenticated: true,
      usuario_id: response.usuario_id,
      username: response.username,
      nombre_completo: response.nombre_completo,
      access_token: response.access,
      refresh_token: response.refresh,
      is_superuser: response.is_superuser,
      roles: response.roles,
      permisos: response.permisos,
      empresa_id: response.empresa_id ?? null,
      empresa_nombre: response.empresa_nombre ?? null
    });

    if (!rememberMe) {
      this.startInactivityTimer();
    } else {
      this.stopInactivityTimer();
    }
  }

  /**
   * Restaurar estado de autenticacion resiliente
   */
  private restoreAuthState(): void {
    let storage: Storage | null = null;

    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(this.ACCESS_TOKEN_KEY)) {
      storage = sessionStorage;
    } else if (typeof localStorage !== 'undefined' && localStorage.getItem(this.ACCESS_TOKEN_KEY)) {
      storage = localStorage;
    }

    if (!storage) {
      this.clearAuthData();
      return;
    }

    const accessToken = storage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken = storage.getItem(this.REFRESH_TOKEN_KEY);
    const usuarioId = storage.getItem(this.USUARIO_ID_KEY);
    const username = storage.getItem(this.USERNAME_KEY);
    const nombreCompleto = storage.getItem(this.NOMBRE_COMPLETO_KEY);
    const isSuperuser = storage.getItem(this.IS_SUPERUSER_KEY);
    const roles = storage.getItem(this.ROLES_KEY);
    const permisos = storage.getItem(this.PERMISOS_KEY);
    const rememberMe = storage.getItem(this.REMEMBER_ME_KEY) === 'true';
    const empresaIdStr = storage.getItem(this.EMPRESA_ID_KEY);
    const empresaNombre = storage.getItem(this.EMPRESA_NOMBRE_KEY);

    if (accessToken && usuarioId) {
      const isSuper = isSuperuser ? JSON.parse(isSuperuser) : false;
      const finalUsername = isSuper ? 'superadmin' : (username || null);
      const finalNombre = isSuper ? 'Superadmin Global (Dueño del SaaS)' : (nombreCompleto || null);

      this.authState.next({
        isAuthenticated: true,
        usuario_id: parseInt(usuarioId, 10),
        username: finalUsername,
        nombre_completo: finalNombre,
        access_token: accessToken,
        refresh_token: refreshToken,
        is_superuser: isSuper,
        roles: roles ? JSON.parse(roles) : [],
        permisos: permisos ? JSON.parse(permisos) : [],
        empresa_id: empresaIdStr ? parseInt(empresaIdStr, 10) : null,
        empresa_nombre: empresaNombre || null
      });

      if (!rememberMe) {
        this.startInactivityTimer();
      }
    } else {
      this.clearAuthData();
    }
  }
  /**
   * Inicia el temporizador y detector de inactividad del usuario
   */
  private startInactivityTimer(): void {
    this.stopInactivityTimer();

    if (typeof window === 'undefined') return;

    this.ngZone.runOutsideAngular(() => {
      const activityEvents$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'mousedown'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'touchstart')
      );

      // Throttling de eventos de actividad a cada 2 segundos para evitar sobrecarga
      this.userActivitySubscription = activityEvents$.pipe(
        throttleTime(2000)
      ).subscribe(() => {
        this.resetInactivityCountdown();
      });
    });

    this.resetInactivityCountdown();
  }

  /**
   * Reinicia la cuenta regresiva de inactividad
   */
  private resetInactivityCountdown(): void {
    if (this.inactivityTimerSubscription) {
      this.inactivityTimerSubscription.unsubscribe();
    }

    if (typeof window === 'undefined') return;

    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimerSubscription = timer(this.INACTIVITY_TIMEOUT_MS).subscribe(() => {
        this.ngZone.run(() => {
          if (this.isAuthenticated()) {
            this.logout().subscribe(() => {
              this.router.navigate(['/login']);
              this.snackBar.open(
                'Su sesión ha sido cerrada automáticamente por inactividad.',
                'Cerrar',
                { duration: 6000, panelClass: ['info-snackbar'] }
              );
            });
          }
        });
      });
    });
  }

  /**
   * Detiene el detector y temporizador de inactividad
   */
  private stopInactivityTimer(): void {
    if (this.inactivityTimerSubscription) {
      this.inactivityTimerSubscription.unsubscribe();
      this.inactivityTimerSubscription = undefined;
    }
    if (this.userActivitySubscription) {
      this.userActivitySubscription.unsubscribe();
      this.userActivitySubscription = undefined;
    }
  }

  /**
   * Limpiar datos de autenticación en ambos almacenamientos
   */
  private clearAuthData(): void {
    if (typeof localStorage !== 'undefined') {
      this.clearStorage(localStorage);
    }
    if (typeof sessionStorage !== 'undefined') {
      this.clearStorage(sessionStorage);
    }
    this.stopInactivityTimer();
  }

  private clearStorage(storage: Storage): void {
    storage.removeItem(this.ACCESS_TOKEN_KEY);
    storage.removeItem(this.REFRESH_TOKEN_KEY);
    storage.removeItem(this.USUARIO_ID_KEY);
    storage.removeItem(this.USERNAME_KEY);
    storage.removeItem(this.NOMBRE_COMPLETO_KEY);
    storage.removeItem(this.IS_SUPERUSER_KEY);
    storage.removeItem(this.ROLES_KEY);
    storage.removeItem(this.PERMISOS_KEY);
    storage.removeItem(this.REMEMBER_ME_KEY);
    storage.removeItem(this.EMPRESA_ID_KEY);
    storage.removeItem(this.EMPRESA_NOMBRE_KEY);
  }

  /**
   * Obtener token de acceso
   */
  getAccessToken(): string | null {
    return this.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Obtener token de refresco
   */
  getRefreshToken(): string | null {
    return this.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtener ID del usuario
   */
  getUsuarioId(): number | null {
    const id = this.getItem(this.USUARIO_ID_KEY);
    return id ? parseInt(id) : null;
  }

  /**
   * Obtener Username del usuario autenticado
   */
  getUsername(): string | null {
    if (this.isSuperuser()) {
      return 'superadmin';
    }
    return this.authState.value.username || this.getItem(this.USERNAME_KEY);
  }

  /**
   * Obtener Nombre Completo del usuario autenticado
   */
  getNombreCompleto(): string | null {
    if (this.isSuperuser()) {
      return 'Superadmin Global (Dueño del SaaS)';
    }
    return this.authState.value.nombre_completo || this.getItem(this.NOMBRE_COMPLETO_KEY);
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
    const isSuper = this.isSuperuser();
    return of({
      username: isSuper ? 'superadmin' : (currentState.username || ''),
      nombre_completo: isSuper ? 'Superadmin Global (Dueño del SaaS)' : (currentState.nombre_completo || '')
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
          const storage = this.getActiveStorage();
          storage.setItem(this.ACCESS_TOKEN_KEY, response.access);
          storage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
        }
      })
    );
  }

  /**
   * Obtener lista de permisos del usuario
   */
  getPermisos(): string[] {
    if (this.authState.value.permisos && this.authState.value.permisos.length > 0) {
      return this.authState.value.permisos;
    }
    const val = this.getItem(this.PERMISOS_KEY);
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [val];
    }
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
   * Verificar si tiene todos los permisos especificados
   */
  hasAllPermisos(permisos: string[]): boolean {
    return permisos.every(p => this.hasPermiso(p));
  }

  /**
   * Verificar si es superusuario
   */
  isSuperuser(): boolean {
    if (this.authState.value.is_superuser) return true;
    const val = this.getItem(this.IS_SUPERUSER_KEY);
    return val === 'true' || val === JSON.stringify(true);
  }

  /**
   * Verificar si es Administrador (SuperAdmin o Administrador de Empresa)
   */
  isAdmin(): boolean {
    if (this.isSuperuser()) return true;
    const roles = this.getRoles() || [];
    return roles.some(r => !!r && (
      r.toLowerCase().includes('admin') || 
      r.toLowerCase().includes('gerente')
    ));
  }

  /**
   * Obtener lista de roles del usuario
   */
  getRoles(): string[] {
    if (this.authState.value.roles && this.authState.value.roles.length > 0) {
      return this.authState.value.roles;
    }
    const val = this.getItem(this.ROLES_KEY);
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [val];
    }
  }

  /**
   * Verificar si tiene un rol específico
   */
  hasRol(rol: string): boolean {
    return this.authState.value.roles.includes(rol);
  }

  /**
   * Obtener ID de la Empresa / Tenant actual
   */
  getEmpresaId(): number | null {
    if (this.authState.value.empresa_id !== undefined && this.authState.value.empresa_id !== null) {
      return this.authState.value.empresa_id;
    }
    const val = this.getItem(this.EMPRESA_ID_KEY);
    return val ? parseInt(val, 10) : null;
  }

  /**
   * Obtener Razón Social de la Empresa / Tenant actual
   */
  getEmpresaNombre(): string | null {
    return this.authState.value.empresa_nombre || this.getItem(this.EMPRESA_NOMBRE_KEY);
  }

  /**
   * Permite al SuperAdmin seleccionar o alternar entre tenants en tiempo real
   */
  setEmpresaActiva(id: number | null, nombre?: string | null): void {
    const storage = this.getActiveStorage();
    if (id !== null && id !== undefined) {
      storage.setItem(this.EMPRESA_ID_KEY, id.toString());
    } else {
      storage.removeItem(this.EMPRESA_ID_KEY);
    }

    if (nombre) {
      storage.setItem(this.EMPRESA_NOMBRE_KEY, nombre);
    } else {
      storage.removeItem(this.EMPRESA_NOMBRE_KEY);
    }

    this.authState.next({
      ...this.authState.value,
      empresa_id: id,
      empresa_nombre: nombre || null
    });
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
      permisos: [],
      empresa_id: null,
      empresa_nombre: null
    };
  }
}