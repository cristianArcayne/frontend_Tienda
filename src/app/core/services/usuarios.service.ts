import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioDetail, EmpresaConfig } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly apiUrl = 'http://localhost:8000/api/usuarios';

  constructor(private http: HttpClient) {}

  getUsuarios(rol?: string, search?: string): Observable<UsuarioDetail[]> {
    let params = new HttpParams();
    if (rol && rol !== 'todos') params = params.set('rol', rol);
    if (search) params = params.set('search', search);

    return this.http.get<UsuarioDetail[]>(this.apiUrl, { params });
  }

  createUsuario(userData: any): Observable<UsuarioDetail> {
    return this.http.post<UsuarioDetail>(this.apiUrl, userData);
  }

  deleteUsuario(ci: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${ci}`);
  }

  getEmpresaConfig(): Observable<EmpresaConfig> {
    return this.http.get<EmpresaConfig>(`${this.apiUrl}/empresa/config`);
  }

  updateEmpresaConfig(config: EmpresaConfig): Observable<EmpresaConfig> {
    return this.http.post<EmpresaConfig>(`${this.apiUrl}/empresa/config`, config);
  }
}
