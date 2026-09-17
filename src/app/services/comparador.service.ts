import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface CaracteristicaComparacion {
  etiqueta: string;
  campo: string;
  valores: Record<string, string | number | null>;
}

export interface VarianteComparacion {
  id: number;
  sku: string;
  precio: string | number;
  cantidad: number;
  limite_cantidad?: number;
}

export interface ProductoComparado {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: number;
  categoria_nombre?: string;
  marca?: number;
  marca_nombre?: string;
  precio_minimo?: string | number | null;
  stock_total?: number | null;
  material?: string | null;
  color?: string | null;
  dimensiones?: string | null;
  imagen_principal?: string | null;
  variantes?: VarianteComparacion[];
  descuento_activo?: {
    id: number;
    titulo: string;
    tipo_descuento: string;
    valor_descuento: string | number;
  } | null;
  calificacion_promedio?: number | null;
  total_resenas?: number;
}

export interface ComparadorResponse {
  success: boolean;
  total: number;
  producto_ids: number[];
  columnas: string[];
  caracteristicas: CaracteristicaComparacion[];
  productos: ProductoComparado[];
}

export interface ProductoSeleccionadoComparador {
  id: number;
  nombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComparadorService {
  readonly minProductos = 2;
  readonly maxProductos = 4;

  private readonly storagePrefix = 'comparador_producto_ids_';
  private idsSubject = new BehaviorSubject<number[]>([]);
  private seleccionadosSubject = new BehaviorSubject<ProductoSeleccionadoComparador[]>([]);
  ids$ = this.idsSubject.asObservable();
  seleccionados$ = this.seleccionadosSubject.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.guardarSeleccionados(this.leerSeleccionados(), false);
  }

  get ids(): number[] {
    return this.idsSubject.value;
  }

  get seleccionados(): ProductoSeleccionadoComparador[] {
    return this.seleccionadosSubject.value;
  }

  getTenantSchema(): string {
    const tenantDesdeSubdominio = this.configService.getCurrentTenant();
    const tenantGuardado = localStorage.getItem('tenant_schema');
    const tenant = tenantDesdeSubdominio || tenantGuardado || 'public';

    return tenant.replace(/-/g, '_');
  }

  estaSeleccionado(productoId: number): boolean {
    return this.ids.includes(productoId);
  }

  agregar(productoId: number, nombre = `Producto ${productoId}`): { ok: boolean; mensaje: string } {
    if (this.estaSeleccionado(productoId)) {
      return { ok: false, mensaje: 'Este producto ya esta en el comparador' };
    }

    if (this.ids.length >= this.maxProductos) {
      return { ok: false, mensaje: `Solo puedes comparar hasta ${this.maxProductos} productos` };
    }

    this.guardarSeleccionados([...this.seleccionados, { id: productoId, nombre }]);
    return { ok: true, mensaje: 'Producto agregado al comparador' };
  }

  quitar(productoId: number): void {
    this.guardarSeleccionados(this.seleccionados.filter(producto => producto.id !== productoId));
  }

  vaciar(): void {
    this.guardarSeleccionados([]);
  }

  comparar(productoIds = this.ids): Observable<ComparadorResponse> {
    return this.http.post<ComparadorResponse>(
      this.configService.getApiUrl('comparador'),
      { producto_ids: productoIds },
      { headers: this.getHeaders() }
    );
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-tenant': this.getTenantSchema(),
      'Content-Type': 'application/json'
    });
  }

  private getStorageKey(): string {
    return `${this.storagePrefix}${this.getTenantSchema()}`;
  }

  private leerSeleccionados(): ProductoSeleccionadoComparador[] {
    const raw = localStorage.getItem(this.getStorageKey());
    if (!raw) return [];

    try {
      const guardados = JSON.parse(raw);
      if (!Array.isArray(guardados)) return [];

      return guardados
        .map(item => {
          if (typeof item === 'number') {
            return { id: item, nombre: `Producto ${item}` };
          }

          const id = Number(item?.id);
          const nombre = typeof item?.nombre === 'string' && item.nombre.trim()
            ? item.nombre.trim()
            : `Producto ${id}`;

          return { id, nombre };
        })
        .filter(producto => Number.isInteger(producto.id) && producto.id > 0)
        .slice(0, this.maxProductos);
    } catch {
      return [];
    }
  }

  private guardarSeleccionados(
    productos: ProductoSeleccionadoComparador[],
    persistir = true
  ): void {
    const porId = new Map<number, ProductoSeleccionadoComparador>();

    productos.forEach(producto => {
      const id = Number(producto.id);
      if (!Number.isInteger(id) || id <= 0 || porId.has(id)) return;

      porId.set(id, {
        id,
        nombre: producto.nombre?.trim() || `Producto ${id}`
      });
    });

    const normalizados = Array.from(porId.values()).slice(0, this.maxProductos);

    if (persistir) {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(normalizados));
    }

    this.seleccionadosSubject.next(normalizados);
    this.idsSubject.next(normalizados.map(producto => producto.id));
  }
}
