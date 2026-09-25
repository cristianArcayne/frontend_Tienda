import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface Devolucion {
  id: number;
  venta_id: number;
  cliente_id: string;
  cliente_nombre?: string;
  fecha_solicitud: string;
  motivo: string;
  monto_reembolso: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | string;
  observacion_admin?: string;
  cuenta_bancaria_qr?: string;
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
    return this.http.get<Devolucion[]>(`${this.baseUrl}/devoluciones/mis-devoluciones`, { params });
  }

  getTodasDevolucionesAdmin(): Observable<Devolucion[]> {
    return this.http.get<Devolucion[]>(`${this.baseUrl}/devoluciones/admin/listar`);
  }

  responderDevolucion(id: number, estado: 'APROBADA' | 'RECHAZADA', observacion: string): Observable<Devolucion> {
    return this.http.put<Devolucion>(`${this.baseUrl}/devoluciones/admin/${id}/responder`, {
      estado,
      observacion
    });
  }

  verificarElegibilidad(ventaId: number): Observable<{ elegible: boolean; horas_restantes: number; mensaje: string }> {
    return this.http.get<{ elegible: boolean; horas_restantes: number; mensaje: string }>(
      `${this.baseUrl}/devoluciones/verificar-elegibilidad/${ventaId}`
    );
  }
}
