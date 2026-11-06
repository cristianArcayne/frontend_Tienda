import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface DetalleTraspasoItem {
  id: number;
  variante_id: number;
  ropa_nombre: string;
  sku: string;
  talla: string;
  color: string;
  color_hex?: string;
  imagen_uri?: string;
  cantidad: number;
}

export interface TraspasoItem {
  id: number;
  sucursal_origen_id: number;
  sucursal_origen_nombre: string;
  sucursal_origen_ciudad: string;
  sucursal_destino_id: number;
  sucursal_destino_nombre: string;
  sucursal_destino_ciudad: string;
  estado: string; // 'SOLICITADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO'
  observacion?: string;
  fecha_solicitud?: string;
  fecha_recepcion?: string;
  solicitado_por_ci?: string;
  total_unidades: number;
  guia_remision_codigo?: string;
  guia_remision_qr?: string;
  detalles: DetalleTraspasoItem[];
}

export interface TraspasoMetricas {
  total_traspasos: number;
  solicitados_count: number;
  en_transito_count: number;
  recibidos_count: number;
  cancelados_count: number;
  total_prendas_trasladadas: number;
  sucursal_mas_activa: string;
}

export interface VarianteDisponible {
  variante_id: number;
  ropa_id: number;
  ropa_nombre: string;
  sku: string;
  talla: string;
  color: string;
  color_hex: string;
  precio: number;
  imagen_uri?: string;
  stock_fisico: number;
  stock_disponible: number;
}

@Injectable({
  providedIn: 'root'
})
export class TraspasosService {
  private apiBase: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiBase = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
  }

  getMetricas(empresaId?: number): Observable<TraspasoMetricas> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa_id', empresaId.toString());
    return this.http.get<TraspasoMetricas>(`${this.apiBase}/traspasos/metricas`, { params });
  }

  getTraspasos(estado?: string, sucursalId?: number, empresaId?: number): Observable<TraspasoItem[]> {
    let params = new HttpParams();
    if (estado && estado !== 'TODOS') params = params.set('estado', estado);
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (empresaId) params = params.set('empresa_id', empresaId.toString());
    return this.http.get<TraspasoItem[]>(`${this.apiBase}/traspasos/`, { params });
  }

  getTraspasoById(id: number): Observable<TraspasoItem> {
    return this.http.get<TraspasoItem>(`${this.apiBase}/traspasos/${id}`);
  }

  getGuiaRemision(id: number): Observable<TraspasoItem> {
    return this.http.get<TraspasoItem>(`${this.apiBase}/traspasos/${id}/guia-remision`);
  }

  getVariantesDisponibles(sucursalId: number): Observable<VarianteDisponible[]> {
    return this.http.get<VarianteDisponible[]>(`${this.apiBase}/traspasos/variantes-disponibles/${sucursalId}`);
  }

  crearTraspaso(payload: any): Observable<TraspasoItem> {
    return this.http.post<TraspasoItem>(`${this.apiBase}/traspasos/`, payload);
  }

  despacharTraspaso(id: number): Observable<TraspasoItem> {
    return this.http.post<TraspasoItem>(`${this.apiBase}/traspasos/${id}/despachar`, {});
  }

  confirmarRecepcion(id: number): Observable<TraspasoItem> {
    return this.http.post<TraspasoItem>(`${this.apiBase}/traspasos/${id}/confirmar-recepcion`, {});
  }

  confirmarRecepcionConDiscrepancia(id: number, payload: any): Observable<TraspasoItem> {
    return this.http.post<TraspasoItem>(`${this.apiBase}/traspasos/${id}/confirmar-recepcion-discrepancia`, payload);
  }

  cancelarTraspaso(id: number): Observable<TraspasoItem> {
    return this.http.post<TraspasoItem>(`${this.apiBase}/traspasos/${id}/cancelar`, {});
  }

  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/sucursales/`);
  }
}

