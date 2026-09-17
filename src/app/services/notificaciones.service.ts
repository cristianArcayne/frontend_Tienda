import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Producto } from '../models/inventario/producto.model';
import { Pagination } from '../models/pagination.model';
import {
  CrearPromocionPayload,
  NotificacionPush,
  PruebaNotificacionPayload,
  Promocion,
  SuscripcionPushPayload,
} from '../models/notificaciones.model';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  getPromociones(): Observable<Pagination<Promocion>> {
    return this.http.get<Pagination<Promocion>>(
      this.getApiUrl('promociones'),
      { headers: this.getHeaders() }
    );
  }

  crearPromocion(payload: CrearPromocionPayload): Observable<Promocion> {
    return this.http.post<Promocion>(
      this.getApiUrl('promociones'),
      payload,
      { headers: this.getHeaders() }
    );
  }

  publicarPromocion(id: number | string): Observable<Promocion> {
    return this.http.post<Promocion>(
      `${this.getApiUrl('promociones')}${id}/publicar/`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getNotificaciones(): Observable<NotificacionPush[] | { results?: NotificacionPush[]; count?: number }> {
    return this.http.get<NotificacionPush[] | { results?: NotificacionPush[]; count?: number }>(
      this.getApiUrl('notificaciones'),
      { headers: this.getHeaders() }
    );
  }

  suscribirse(payload: SuscripcionPushPayload): Observable<NotificacionPush> {
    return this.http.post<NotificacionPush>(
      `${this.getApiUrl('notificaciones')}suscribirse/`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  desuscribirse(endpoint: string): Observable<unknown> {
    return this.http.post(
      `${this.getApiUrl('notificaciones')}desuscribirse/`,
      { endpoint },
      { headers: this.getHeaders() }
    );
  }

  getProductos(): Observable<Producto[] | { results?: Producto[]; count?: number }> {
    const params = new HttpParams()
      .set('page', '1')
      .set('page_size', '1000');

    return this.http.get<Producto[] | { results?: Producto[]; count?: number }>(
      this.getApiUrl('productos'),
      { headers: this.getHeaders(), params }
    );
  }

  async getVapidPublicKey(): Promise<Record<string, unknown>> {
    return this.fetchVapidResponse('vapid-public-key/');
  }

  probar(payload: PruebaNotificacionPayload): Observable<unknown> {
    return this.http.post(
      `${this.getApiUrl('notificaciones')}probar/`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  private getApiUrl(endpoint: string): string {
    return this.configService.getApiUrl(endpoint);
  }

  private async fetchVapidResponse(path: string): Promise<Record<string, unknown>> {
    const url = `${this.configService.getApiBaseUrl()}/notificaciones/${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const rawBody = await response.text();
    console.log('Respuesta VAPID raw:', {
      url,
      status: response.status,
      body: rawBody,
    });

    if (!response.ok) {
      throw new Error(`No se pudo obtener VAPID (${response.status})`);
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      throw new Error('La respuesta VAPID no es JSON valido');
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    });
  }
}
