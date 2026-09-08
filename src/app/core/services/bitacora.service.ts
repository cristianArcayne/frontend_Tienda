import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BitacoraEntry } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class BitacoraService {
  private readonly apiUrl = 'http://localhost:8000/api/bitacora';

  constructor(private http: HttpClient) {}

  getBitacoras(filter?: { limit?: number; offset?: number; search?: string; id_usuario?: string }): Observable<BitacoraEntry[]> {
    let params = new HttpParams();
    if (filter?.limit) params = params.set('limit', filter.limit.toString());
    if (filter?.offset) params = params.set('offset', filter.offset.toString());
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.id_usuario) params = params.set('id_usuario', filter.id_usuario);

    return this.http.get<BitacoraEntry[]>(this.apiUrl, { params });
  }
}
