import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Pagination } from '../models/pagination.model';

export interface ProductoCompraHistorial {
  id: number;
  producto_id: number;
  producto_nombre: string;
  variante_id: number;
  variante_sku: string;
  cantidad: number;
  precio_unitario: string | number;
  precio_subtotal: string | number;
}

export interface CompraHistorial {
  compra_id: number;
  fecha: string;
  total: string | number;
  estado: 'pendiente' | 'completado' | 'cancelado' | string;
  tipo: string;
  cantidad_productos: number;
  productos: ProductoCompraHistorial[];
  descuento_fidelizacion: string | number;
}

export interface FiltrosHistorialCompras {
  estado?: string | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class HistorialComprasService {
  private readonly endpoint = 'ventas/historial-cliente';

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  listar(
    page = 1,
    pageSize = 10,
    filtros: FiltrosHistorialCompras = {}
  ): Observable<Pagination<CompraHistorial>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<Pagination<CompraHistorial>>(
      this.configService.getApiUrl(this.endpoint),
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  getTenantSchema(): string {
    const tenantDesdeSubdominio = this.configService.getCurrentTenant();
    const tenantGuardado = localStorage.getItem('tenant_schema');
    const tenant = tenantDesdeSubdominio || tenantGuardado || 'public';

    return tenant.replace(/-/g, '_');
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-tenant': this.getTenantSchema(),
      'Content-Type': 'application/json'
    });
  }
}
