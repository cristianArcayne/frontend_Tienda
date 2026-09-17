import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Resena, CrearResena, ActualizarResena } from '../models/inventario/resena.model';

@Injectable({
  providedIn: 'root'
})
export class ResenasService {
  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = this.configService.getApiUrl('resenas');
  }

  listarPorProducto(productoId: number): Observable<{ results: Resena[]; count: number }> {
    return this.http.get<{ results: Resena[]; count: number }>(
      `${this.apiUrl}?producto_id=${productoId}&page_size=100`
    );
  }

  crear(data: CrearResena): Observable<Resena> {
    return this.http.post<Resena>(this.apiUrl, data);
  }

  actualizar(id: number, data: ActualizarResena): Observable<Resena> {
    return this.http.patch<Resena>(`${this.apiUrl}${id}/`, data);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}
