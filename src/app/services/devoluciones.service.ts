import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface ItemDevolucion {
  prenda_nombre: string;
  talla: string;
  color: string;
  cantidad: number;
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
  items?: ItemDevolucion[];
  venta?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DevolucionesService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private get baseUrl(): string {
    return this.configService.getApiBaseUrl();
  }

  solicitarDevolucion(payload: { venta_id: number; motivo: string; cuenta_bancaria_qr?: string }): Observable<Devolucion> {
    return this.http.post<Devolucion>(`${this.baseUrl}/devoluciones/solicitar`, payload);
  }

  getMisDevoluciones(clienteId?: string): Observable<Devolucion[]> {
    let params = new HttpParams();
    if (clienteId) {
      params = params.set('cliente_id', clienteId);
    }
    return this.http.get<any>(`${this.baseUrl}/devoluciones/mis-devoluciones`, { params }).pipe(
      map(res => (Array.isArray(res) ? res : res?.results || []))
    );
  }

  getTodasDevolucionesAdmin(): Observable<Devolucion[]> {
    return this.http.get<any>(`${this.baseUrl}/devoluciones/admin/listar`).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.results)) return res.results;
        return [];
      }),
      catchError(() => {
        const v1Url = this.baseUrl.replace(/\/api$/, '/api/v1');
        return this.http.get<any>(`${v1Url}/devoluciones/admin/listar`).pipe(
          map(res => {
            if (Array.isArray(res)) return res;
            if (res && Array.isArray(res.results)) return res.results;
            return [];
          })
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
    return this.http.put<Devolucion>(`${this.baseUrl}/devoluciones/admin/${id}/responder`, payload);
  }

  verificarElegibilidad(ventaId: number): Observable<{ elegible: boolean; horas_restantes: number; mensaje: string }> {
    return this.http.get<{ elegible: boolean; horas_restantes: number; mensaje: string }>(
      `${this.baseUrl}/devoluciones/verificar-elegibilidad/${ventaId}`
    );
  }
}
