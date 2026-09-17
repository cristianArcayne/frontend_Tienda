import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface RecuperacionResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecuperacionService {

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  solicitarRecuperacion(username: string): Observable<RecuperacionResponse> {
    const url = `${this.configService.getApiBaseUrl()}/recuperar-password/solicitar/`;
    return this.http.post<RecuperacionResponse>(url, { username });
  }

  verificarCodigo(username: string, codigo: string): Observable<RecuperacionResponse> {
    const url = `${this.configService.getApiBaseUrl()}/recuperar-password/verificar/`;
    return this.http.post<RecuperacionResponse>(url, { username, codigo });
  }

  cambiarPassword(username: string, codigo: string, nueva_password: string): Observable<RecuperacionResponse> {
    const url = `${this.configService.getApiBaseUrl()}/recuperar-password/cambiar/`;
    return this.http.post<RecuperacionResponse>(url, { username, codigo, nueva_password });
  }
}
