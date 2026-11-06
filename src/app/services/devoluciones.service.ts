import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface ItemDevolucion {
  detalle_id?: number;
  variante_id?: number;
  ropa_id?: number;
  prenda_nombre: string;
  talla: string;
  color: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen_url?: string;
}

export interface Devolucion {
  id: number;
  venta_id: number;
  cliente_id: string;
  cliente_nombre?: string;
  cliente_ci?: string;
  fecha_solicitud: string;
  fecha_respuesta?: string;
  motivo: string;
  motivo_completo?: string;
  monto_reembolso: number;
  estado: 'PENDIENTE' | 'SOLICITADA' | 'APROBADA' | 'RECHAZADA' | string;
  observacion_admin?: string;
  respuesta_admin?: string;
  cuenta_bancaria_qr?: string;
  horas_transcurridas?: number;
  es_elegible_garantia_7dias?: boolean;
  items?: ItemDevolucion[];
  venta?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DevolucionesService {
  readonly devolucionesUpdated$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private get baseUrl(): string {
    return this.configService.getApiBaseUrl();
  }

  private get v1Url(): string {
    return `${this.baseUrl}/v1/devoluciones`;
  }

  private get compatUrl(): string {
    return `${this.baseUrl}/devoluciones`;
  }

  getMetricas(): Observable<any> {
    return this.http.get<any>(`${this.v1Url}/metricas`).pipe(
      catchError(() => this.http.get<any>(`${this.compatUrl}/metricas`)),
      catchError(() => of({
        total_solicitudes: 0,
        pendientes_count: 0,
        aprobadas_count: 0,
        rechazadas_count: 0,
        total_reembolsos_bs: 0,
        cambios_talla_count: 0,
        tasa_aprobacion_porcentaje: 100
      }))
    );
  }

  getVentasRecientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.v1Url}/ventas-recientes`).pipe(
      catchError(() => this.http.get<any[]>(`${this.compatUrl}/ventas-recientes`)),
      catchError(() => of([]))
    );
  }

  getVariantesDisponibles(sucursalId: number = 1, ropaId?: number): Observable<any[]> {
    let url = `${this.v1Url}/variantes-disponibles?sucursal_id=${sucursalId}`;
    if (ropaId) url += `&ropa_id=${ropaId}`;
    return this.http.get<any[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  verificarElegibilidad(ventaId: number): Observable<any> {
    return this.http.get<any>(`${this.v1Url}/verificar-elegibilidad/${ventaId}`).pipe(
      catchError(() => this.http.get<any>(`${this.compatUrl}/verificar-elegibilidad/${ventaId}`))
    );
  }

  solicitarDevolucion(payload: { venta_id: number; motivo: string; cuenta_bancaria_qr?: string; cliente_id?: string }): Observable<any> {
    return this.http.post<any>(`${this.v1Url}/solicitar`, payload).pipe(
      catchError(() => this.http.post<any>(`${this.compatUrl}/solicitar`, payload)),
      tap(() => this.devolucionesUpdated$.next())
    );
  }

  procesarCambioTalla(payload: {
    venta_id: number;
    variante_devuelta_id: number;
    nueva_variante_id: number;
    cantidad: number;
    motivo: string;
    cliente_id?: string;
    metodo_pago_diferencia?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.v1Url}/cambio-talla`, payload).pipe(
      catchError(() => this.http.post<any>(`${this.compatUrl}/cambio-talla`, payload)),
      tap(() => this.devolucionesUpdated$.next())
    );
  }

  getTodasDevolucionesAdmin(estado?: string): Observable<Devolucion[]> {
    let url = `${this.v1Url}/admin/listar`;
    if (estado && estado !== 'TODOS') {
      url += `?estado=${estado}`;
    }
    return this.http.get<any>(url).pipe(
      map(res => (Array.isArray(res) ? res : res?.results || [])),
      catchError(() => {
        let compat = `${this.compatUrl}/admin/listar`;
        if (estado && estado !== 'TODOS') compat += `?estado=${estado}`;
        return this.http.get<any>(compat).pipe(
          map(res => (Array.isArray(res) ? res : res?.results || [])),
          catchError(() => of([]))
        );
      })
    );
  }

  responderDevolucion(id: number, estado: 'APROBADA' | 'RECHAZADA', observacion: string): Observable<Devolucion> {
    const payload = {
      estado,
      observacion,
      respuesta_admin: observacion
    };
    return this.http.put<Devolucion>(`${this.v1Url}/admin/${id}/responder`, payload).pipe(
      catchError(() => this.http.put<Devolucion>(`${this.compatUrl}/admin/${id}/responder`, payload)),
      tap(() => this.devolucionesUpdated$.next())
    );
  }

  getConteoPendientes(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.v1Url}/admin/pendientes-count`).pipe(
      map(res => res?.count || 0),
      catchError(() => this.http.get<{ count: number }>(`${this.compatUrl}/admin/pendientes-count`).pipe(
        map(res => res?.count || 0),
        catchError(() => of(0))
      ))
    );
  }
}
