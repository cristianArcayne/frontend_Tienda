import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface DetalleReserva {
  id?: number;
  variante_id: number;
  cantidad: number;
  cod_barra?: string;
  prenda_nombre?: string;
  talla?: string;
  color?: string;
  precio_unitario?: number;
  subtotal?: number;
}

export interface Reserva {
  id: number;
  fecha: string;
  fecha_limite: string;
  hora_estimada: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA' | 'EXPIRADA' | string;
  cliente_id: string;
  sucursal_id: number;
  sucursal_nombre?: string;
  cliente_nombre?: string;
  detalles: DetalleReserva[];
  total_estimado: number;
}

export interface ReservaCreatePayload {
  cliente_id: string;
  sucursal_id: number;
  hora_estimada?: string;
  detalles: {
    variante_id: number;
    cantidad: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private get baseUrl(): string {
    return this.configService.getApiBaseUrl();
  }

  /**
   * Obtener reservas de un cliente específico (o las del usuario actual)
   */
  getMisReservas(clienteCi?: string): Observable<Reserva[]> {
    let params = new HttpParams();
    if (clienteCi) {
      params = params.set('cliente_ci', clienteCi);
    }
    return this.http.get<Reserva[]>(`${this.baseUrl}/reservas/mis-reservas`, { params });
  }

  /**
   * Obtener todas las reservas de la cadena (para vista de personal / cajero / admin)
   */
  getTodasReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.baseUrl}/reservas/`);
  }

  /**
   * Crear nueva reserva Web-to-Store (apartado 48h y congelamiento de stock)
   */
  crearReserva(payload: ReservaCreatePayload): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/reservas/crear`, payload);
  }

  /**
   * Confirmar retiro presencial y pago en mostrador (descarga stock físico y libera reservado)
   */
  confirmarRetiro(reservaId: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/reservas/${reservaId}/confirmar-retiro`, {});
  }

  /**
   * Cancelar reserva (libera el stock reservado)
   */
  cancelarReserva(reservaId: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/reservas/${reservaId}/cancelar`, {});
  }

  /**
   * Expirar automáticamente reservas con más de 48 horas de antigüedad
   */
  expirarVencidas(): Observable<{ mensaje: string; reservas_expiradas: number; unidades_stock_liberadas: number }> {
    return this.http.post<any>(`${this.baseUrl}/reservas/expirar-antiguas`, {});
  }

  /**
   * Obtener listado de sucursales activas
   */
  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sucursales/`);
  }
}
