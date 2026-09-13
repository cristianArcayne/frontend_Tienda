import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, LoginResponse, ForgotPasswordResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8000/api/auth';
  private readonly TOKEN_KEY = 'atelier_token';
  private readonly USER_KEY = 'atelier_user';

  // Signals reactivos para estado de usuario
  currentUser = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: { login_id: string; password: string; remember_me?: boolean }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        this.setSession(res);
      })
    );
  }

  guestLogin(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/guest-login`, {}).pipe(
      tap(res => {
        this.setSession(res);
      })
    );
  }

  register(data: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        this.setSession(res);
      })
    );
  }

  forgotPassword(login_id: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/forgot-password`, { login_id });
  }

  resetPassword(payload: { reset_token: string; new_password: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, payload);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.token.set(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const userRole = user.rol.toLowerCase().trim();
    const normalizedRoles = roles.map(r => r.toLowerCase().trim());
    
    if (normalizedRoles.includes(userRole)) return true;
    if ((userRole === 'trabajador' || userRole === 'empleado') && 
        (normalizedRoles.includes('trabajador') || normalizedRoles.includes('empleado'))) {
      return true;
    }
    return false;
  }

  getToken(): string | null {
    return this.token();
  }

  private setSession(res: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.access_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.token.set(res.access_token);
    this.currentUser.set(res.user);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }
}
