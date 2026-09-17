import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface ProductoFavorito {
  id: number;
  usuario: number;
  producto_id: number;
  producto_nombre: string;
  producto_precio: number;
  producto_imagen: string | null;
  creado_en: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private apiUrl: string;
  private favoritosSubject = new BehaviorSubject<ProductoFavorito[]>([]);
  private cantidadSubject = new BehaviorSubject<number>(0);
  public favoritos$ = this.favoritosSubject.asObservable();
  public cantidadFavoritos$ = this.cantidadSubject.asObservable();

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = this.configService.getApiUrl('favoritos');
    this.cargarFavoritos();
  }

  cargarFavoritos(): void {
    this.http.get<any>(`${this.apiUrl}?page_size=100`).subscribe({
      next: (res) => {
        const lista = res.results || [];
        this.favoritosSubject.next(lista);
        this.cantidadSubject.next(res.count || lista.length);
      },
      error: (err) => console.error('Error al cargar favoritos', err)
    });
  }

  listar(page: number, pageSize: number = 10, filters?: { categoria?: number | null; marca?: number | null }): Observable<any> {
    let params: any = { page: page, page_size: pageSize };
    if (filters?.categoria) params.categoria = filters.categoria;
    if (filters?.marca) params.marca = filters.marca;
    return this.http.get<any>(this.apiUrl, { params });
  }

  agregar(productoId: number): Observable<ProductoFavorito> {
    return this.http.post<ProductoFavorito>(this.apiUrl, {
      producto_id: productoId
    }).pipe(
      tap(() => this.cargarFavoritos())
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`).pipe(
      tap(() => this.cargarFavoritos())
    );
  }

  eliminarPorProducto(productoId: number): Observable<void> {
    const favorito = this.favoritosSubject.value.find(f => f.producto_id === productoId);
    if (favorito) {
      return this.eliminar(favorito.id);
    }
    return new Observable<void>(subscriber => {
      subscriber.next();
      subscriber.complete();
    });
  }

  obtenerCantidadItems(): number {
    return this.cantidadSubject.value;
  }
}
