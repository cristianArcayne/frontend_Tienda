import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface DetalleCarrito {
  id: number;
  variante_producto: number;
  variante_producto_info: any;
  cantidad: number;
  subtotal: number;
}

export interface BeneficioFidelizacion {
  acumulado: number;
  monto_minimo: number;
  monto_descuento: number;
  activo: boolean;
  usado: boolean;
  elegible: boolean;
}

export interface Carrito {
  id: number;
  usuario: number;
  usuario_username: string;
  detalles: DetalleCarrito[];
  total: number;
  fecha_actualizacion: string;
  beneficio_fidelizacion: BeneficioFidelizacion;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl: string;
  private carritoSubject = new BehaviorSubject<Carrito | null>(null);
  public carrito$ = this.carritoSubject.asObservable();

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = this.configService.getApiUrl('carrito');
    this.cargarCarrito();
  }

  cargarCarrito(): void {
    this.http.get<Carrito>(`${this.apiUrl}mi_carrito/`).subscribe({
      next: (carrito) => this.carritoSubject.next(carrito),
      error: (err) => console.error('Error al cargar el carrito', err)
    });
  }

  agregarProducto(varianteId: number, cantidad: number = 1): Observable<Carrito> {
    return this.http.post<Carrito>(`${this.apiUrl}agregar_producto/`, {
      variante_id: varianteId,
      cantidad: cantidad
    }).pipe(
      tap(carrito => this.carritoSubject.next(carrito))
    );
  }

  actualizarCantidad(varianteId: number, cantidad: number): Observable<Carrito> {
    return this.http.post<Carrito>(`${this.apiUrl}actualizar_cantidad/`, {
      variante_id: varianteId,
      cantidad: cantidad
    }).pipe(
      tap(carrito => this.carritoSubject.next(carrito))
    );
  }

  eliminarProducto(varianteId: number): Observable<Carrito> {
    return this.http.post<Carrito>(`${this.apiUrl}quitar_producto/`, {
      variante_id: varianteId
    }).pipe(
      tap(carrito => this.carritoSubject.next(carrito))
    );
  }

  vaciarCarrito(): Observable<Carrito> {
    return this.http.post<Carrito>(`${this.apiUrl}vaciar/`, {}).pipe(
      tap(carrito => this.carritoSubject.next(carrito))
    );
  }

  descargarPdf(config?: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}descargar_pdf/`, config || {}, {
      responseType: 'blob'
    });
  }

  obtenerCantidadItems(): number {
    const carrito = this.carritoSubject.value;
    if (!carrito || !carrito.detalles) return 0;
    return carrito.detalles.reduce((acc, item) => acc + item.cantidad, 0);
  }
}
