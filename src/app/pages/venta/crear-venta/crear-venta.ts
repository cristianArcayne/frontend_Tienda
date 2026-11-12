import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { EvaluationModeService } from '../../../services/evaluation-mode.service';
import { Venta } from '../../../models/venta/venta.model';
import { Producto } from '../../../models/inventario/producto.model';
import { ProcesarPagoDialogComponent } from '../detalle-venta/procesar-pago-dialog/procesar-pago-dialog';

interface VarianteDisponible {
  id: number;
  sku: string;
  precio: number;
  cantidad: number;
  producto_nombre: string;
  producto: number;
}

interface ProductoConVariantes {
  producto_id: number;
  producto_nombre: string;
  categoria_nombre: string;
  marca_nombre: string;
  imagen_url: string | null;
  variantes: VarianteDisponible[];
}

interface CartItem {
  variante_producto_id: number;
  sku: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  stock_original: number;
}

interface UsuarioOption {
  id: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
}

export interface SucursalOption {
  id: number;
  nombre: string;
  ciudad?: string;
  direccion?: string;
  empresa_id?: number;
}

@Component({
  selector: 'app-crear-venta',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
  ],
  templateUrl: './crear-venta.html',
})
export class CrearVentaComponent implements OnInit, OnDestroy {
  variantes: VarianteDisponible[] = [];
  productos: Producto[] = [];

  allProductGroups: ProductoConVariantes[] = [];
  filteredProductGroups: ProductoConVariantes[] = [];
  pagedProductGroups: ProductoConVariantes[] = [];

  searchTerm = '';
  cantidadesSeleccionadas: { [varianteId: number]: number } = {};

  currentPageProductos = 0;
  pageSizeProductos = 5;

  // CU-09 Flujo Alternativo 3a: Stock Local Insuficiente
  @ViewChild('stockInsuficienteDialog') stockInsuficienteDialogRef!: TemplateRef<any>;
  varianteSeleccionadaAgotada: VarianteDisponible | null = null;

  cartItems: CartItem[] = [];
  usuarios: UsuarioOption[] = [];
  filteredUsuarios: UsuarioOption[] = [];
  usuarioSearchTerm = '';
  selectedUsuarioObj: UsuarioOption | null = null;

  isLoading = false;
  isLoadingUsuarios = false;
  isSubmitting = false;

  // Estado de Red y Resiliencia Offline (CU-09 Segundo Parcial)
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  modoOfflineForzado = false;
  pendingSyncCount = 0;
  isSyncingCola = false;
  ultimaVentaOffline: any = null;
  readonly QUEUE_KEY = 'fashionstore_pending_sync_queue';

  displayedColumnsCart: string[] = ['producto', 'cantidad', 'precio_unitario', 'subtotal', 'acciones'];

  // Sucursales físicas de la empresa (Discriminación de stock por tienda)
  sucursales: SucursalOption[] = [];
  selectedSucursalId: number | null = null;
  selectedSucursalNombre: string = '';
  isLoadingSucursales = false;

  private apiUrlVariantes: string;
  private apiUrlProductos: string;
  private apiUrlUsuarios: string;
  private apiUrlVentas: string;
  private apiUrlSucursales: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    public evalMode: EvaluationModeService
  ) {
    this.apiUrlVariantes = this.configService.getApiUrl('variantes');
    this.apiUrlProductos = this.configService.getApiUrl('productos');
    this.apiUrlUsuarios = this.configService.getApiUrl('usuarios');
    this.apiUrlVentas = this.configService.getApiUrl('ventas');
    this.apiUrlSucursales = this.configService.getApiUrl('sucursales');
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
    this.actualizarContadorCola();
    this.isLoading = true;
    this.loadSucursales();
    this.loadUsuarios();
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.snackBar.open('🟢 Conexión restablecida con el servidor central', 'OK', { duration: 3000 });
    if (this.pendingSyncCount > 0 && !this.modoOfflineForzado) {
      this.sincronizarColaOffline();
    }
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.snackBar.open('🔴 Red desconectada: Terminal POS operando en modo Offline-First con IndexedDB/Local', 'OK', { duration: 4000 });
  };

  get enModoOffline(): boolean {
    return !this.isOnline || this.modoOfflineForzado;
  }

  toggleModoOfflineSimulado(): void {
    this.modoOfflineForzado = !this.modoOfflineForzado;
    if (this.modoOfflineForzado) {
      this.snackBar.open('⚠️ Simulación Offline activada: Las ventas se encolarán en outbox local pending_sync', 'OK', { duration: 3500 });
    } else {
      this.snackBar.open('🟢 Simulación desactivada. Comprobando enlace y cola outbox...', 'OK', { duration: 3000 });
      if (this.pendingSyncCount > 0) {
        this.sincronizarColaOffline();
      }
    }
  }

  actualizarContadorCola(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      this.pendingSyncCount = Array.isArray(queue) ? queue.length : 0;
    } catch {
      this.pendingSyncCount = 0;
    }
  }

  encolarVentaOffline(body: any, metodoPago: string = 'EFECTIVO'): void {
    const offlineUuid = `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const facNumero = `FAC-CONTINGENCIA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const codControl = `${Math.random().toString(36).substring(2, 4).toUpperCase()}-${Math.random().toString(36).substring(4, 6).toUpperCase()}-${Math.random().toString(36).substring(6, 8).toUpperCase()}`;
    
    const rawAuthEmpresa = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_empresa_id') : null;
    const empresaId = rawAuthEmpresa ? Number(rawAuthEmpresa) : 1;

    const ventaOffline = {
      ...body,
      sucursal_id: this.selectedSucursalId || 1,
      sucursal_nombre: this.selectedSucursalNombre,
      offline_uuid: offlineUuid,
      codigo_transaccion: offlineUuid,
      nro_factura: facNumero,
      codigo_control: codControl,
      fecha_registro_local: new Date().toISOString(),
      metodo: metodoPago.toLowerCase(),
      tipo: 'presencial',
      estado: 'completado',
      empresa_id: empresaId
    };

    try {
      const raw = localStorage.getItem(this.QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(ventaOffline);
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      this.actualizarContadorCola();

      // Descuento local inmediato de stock físico en la vista POS para no sobre-vender
      for (const item of this.cartItems) {
        const v = this.variantes.find(varItem => varItem.id === item.variante_producto_id);
        if (v) {
          v.cantidad = Math.max(0, v.cantidad - item.cantidad);
        }
      }
      this.buildProductGroups();

      this.ultimaVentaOffline = {
        uuid: offlineUuid,
        nro_factura: facNumero,
        sucursal: this.selectedSucursalNombre,
        total: this.totalCarrito,
        cliente: body.cliente_nombre || 'Consumidor Final',
        nit: body.nit_cliente || '0',
        metodo: metodoPago,
        codigo_control: codControl,
        cant_items: this.cartItems.reduce((acc, it) => acc + it.cantidad, 0),
        items: [...this.cartItems]
      };

      this.cartItems = [];
      this.isSubmitting = false;

      this.snackBar.open(
        `🧾 ¡Venta POS registrada en contingencia Offline! Encolada en 'pending_sync' (${offlineUuid})`,
        'OK',
        { duration: 7000 }
      );
    } catch (e) {
      console.error('Error al guardar en cola offline:', e);
      this.snackBar.open('Error al guardar en cola local', 'Cerrar', { duration: 4000 });
      this.isSubmitting = false;
    }
  }

  sincronizarColaOffline(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    if (!queue || queue.length === 0) {
      this.snackBar.open('No hay ventas pendientes de sincronización en la cola', 'OK', { duration: 3000 });
      return;
    }

    if (this.modoOfflineForzado) {
      this.modoOfflineForzado = false;
      this.snackBar.open('🟢 Restableciendo conexión online para sincronizar cola outbox...', 'OK', { duration: 2500 });
    }

    this.isSyncingCola = true;
    const urlSync = this.configService.getApiUrl('ventas') + 'sincronizar-lote';

    this.apiService.create<any>(urlSync, { ventas: queue })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.isSyncingCola = false;
          if (resp && resp.total_exitosas > 0) {
            localStorage.removeItem(this.QUEUE_KEY);
            this.actualizarContadorCola();
            this.snackBar.open(
              `🚀 ¡Sincronización completada! ${resp.total_exitosas} ventas consolidadas en base central con Factura Fiscal.`,
              'OK',
              { duration: 6000 }
            );
            this.loadVariantes(); // Recargar stock actualizado desde central
          } else {
            const errDetalle = resp?.resultados?.[0]?.detalle || 'Error desconocido';
            this.snackBar.open(
              `⚠️ No se pudieron consolidar las ventas pendientes: ${errDetalle.substring(0, 100)}`,
              'Cerrar',
              { duration: 7000 }
            );
          }
        },
        error: (err) => {
          this.isSyncingCola = false;
          console.error('Error sincronizando cola offline:', err);
          this.snackBar.open('Error al sincronizar cola con servidor central. Se conservarán en outbox para reintento.', 'Cerrar', { duration: 5000 });
        }
      });
  }

  limpiarColaOffline(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.QUEUE_KEY);
    this.actualizarContadorCola();
    this.snackBar.open('🗑️ Cola outbox vaciada correctamente', 'OK', { duration: 3000 });
  }

  cerrarModalTicket(): void {
    this.ultimaVentaOffline = null;
  }

  get totalCarrito(): number {
    return this.cartItems.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  }

  get carritoValido(): boolean {
    return this.cartItems.length > 0 && (!!this.selectedUsuarioObj || this.usuarioSearchTerm.trim().length > 0);
  }

  finalizarVenta(): void {
    if (!this.carritoValido) return;

    this.isSubmitting = true;
    const cliTerm = this.usuarioSearchTerm.trim() || 'Consumidor Final';
    const cliCi = this.selectedUsuarioObj ? this.selectedUsuarioObj.username : cliTerm;
    const cliNombre = this.selectedUsuarioObj ? `${this.selectedUsuarioObj.nombre || ''} ${this.selectedUsuarioObj.apellido || ''}`.trim() : cliTerm;

    const body = {
      tipo: 'presencial',
      estado: 'pendiente',
      precio_total: this.totalCarrito,
      sucursal_id: this.selectedSucursalId || 1,
      usuario_id: this.selectedUsuarioObj ? this.selectedUsuarioObj.id : 1001,
      cliente_ci: cliCi,
      cliente_nombre: cliNombre,
      razon_social: cliNombre,
      nit_cliente: cliCi,
      metodo: 'efectivo',
      detalles: this.cartItems.map(item => ({
        variante_producto_id: item.variante_producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      })),
    };

    if (this.enModoOffline) {
      this.encolarVentaOffline(body, 'EFECTIVO');
      return;
    }

    this.apiService.create<Venta>(this.apiUrlVentas, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (venta) => {
          this.snackBar.open(`Venta #${venta.id} creada exitosamente`, 'OK', { duration: 3000 });
          this.router.navigate(['/ventas', venta.id]);
        },
        error: (err) => {
          if (err.status === 0 || err.status >= 500) {
            this.snackBar.open('⚠️ Servidor no disponible. Activando contingencia offline...', 'OK', { duration: 3500 });
            this.encolarVentaOffline(body, 'EFECTIVO');
          } else {
            const msg = err.error?.detail || err.error?.[0] || 'Error al crear la venta';
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
            this.isSubmitting = false;
          }
        }
      });
  }

  pagarYFinalizarVenta(): void {
    if (!this.carritoValido) return;

    const dialogRef = this.dialog.open(ProcesarPagoDialogComponent, {
      width: '450px',
      disableClose: true,
      data: { total: this.totalCarrito }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.isSubmitting = true;
        const cliTerm = this.usuarioSearchTerm.trim() || 'Consumidor Final';
        const cliCi = this.selectedUsuarioObj ? this.selectedUsuarioObj.username : cliTerm;
        const cliNombre = this.selectedUsuarioObj ? `${this.selectedUsuarioObj.nombre || ''} ${this.selectedUsuarioObj.apellido || ''}`.trim() : cliTerm;
        
        const body = {
          tipo: 'presencial',
          estado: 'completado',
          precio_total: this.totalCarrito,
          sucursal_id: this.selectedSucursalId || 1,
          usuario_id: this.selectedUsuarioObj ? this.selectedUsuarioObj.id : 1001,
          cliente_ci: cliCi,
          cliente_nombre: cliNombre,
          razon_social: cliNombre,
          nit_cliente: cliCi,
          metodo: result.metodo,
          detalles: this.cartItems.map(item => ({
            variante_producto_id: item.variante_producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          })),
        };

        if (this.enModoOffline) {
          this.encolarVentaOffline(body, result.metodo.toUpperCase());
          return;
        }

        this.apiService.create<Venta>(this.apiUrlVentas, body)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (venta) => {
              const metodoFormateado = result.metodo.toUpperCase();
              this.snackBar.open(`¡Venta #${venta.id} pagada vía ${metodoFormateado} y guardada con éxito!`, 'OK', { duration: 5000 });
              this.router.navigate(['/ventas', venta.id]);
            },
            error: (err) => {
              if (err.status === 0 || err.status >= 500) {
                this.snackBar.open('⚠️ Servidor no disponible. Guardando venta offline en cola pending_sync...', 'OK', { duration: 4000 });
                this.encolarVentaOffline(body, result.metodo.toUpperCase());
              } else {
                const msg = err.error?.detail || err.error?.[0] || 'Error al registrar la venta pagada';
                this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
                this.isSubmitting = false;
              }
            }
          });
      }
    });
  }

  private getProductoImagen(productoId: number): string | null {
    const prod = this.productos.find(p => p.id === productoId);
    if (!prod) return null;
    let url: string | null | undefined = null;
    if (prod.imagenes?.length) {
      const principal = prod.imagenes.find(i => i.es_principal);
      url = principal ? principal.archivo_url : prod.imagenes[0].archivo_url;
    } else {
      const prodAny = prod as any;
      url = prodAny.imagen_principal || prodAny.imagen_url || prodAny.imagen_uri;
    }
    return url ? this.configService.formatImageUrl(url) : null;
  }

  private buildProductGroups(): void {
    const grouped = new Map<number, ProductoConVariantes>();

    for (const v of this.variantes) {
      if (!grouped.has(v.producto)) {
        const prod = this.productos.find(p => p.id === v.producto);
        grouped.set(v.producto, {
          producto_id: v.producto,
          producto_nombre: v.producto_nombre,
          categoria_nombre: prod?.categoria_nombre || '',
          marca_nombre: prod?.marca_nombre || '',
          imagen_url: this.getProductoImagen(v.producto),
          variantes: [],
        });
      }
      grouped.get(v.producto)!.variantes.push(v);
    }

    // Asegurar que prendas del catálogo sin variantes registradas también aparezcan en el mostrador (CU-09 Flujo 3a)
    for (const p of this.productos) {
      if (!grouped.has(p.id)) {
        grouped.set(p.id, {
          producto_id: p.id,
          producto_nombre: p.nombre,
          categoria_nombre: p.categoria_nombre || '',
          marca_nombre: p.marca_nombre || '',
          imagen_url: this.getProductoImagen(p.id),
          variantes: [{
            id: -(p.id),
            sku: `${p.nombre.substring(0, 4).toUpperCase()}-STD`,
            precio: Number(p.precio_minimo || (p as any).precio || 0),
            cantidad: 0,
            producto_nombre: p.nombre,
            producto: p.id
          }],
        });
      }
    }

    this.allProductGroups = Array.from(grouped.values());
    this.applyFilterAndPagination();
    this.isLoading = false;
  }

  private applyFilterAndPagination(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredProductGroups = [...this.allProductGroups];
    } else {
      this.filteredProductGroups = this.allProductGroups.filter(g =>
        g.producto_nombre.toLowerCase().includes(term) ||
        (g.categoria_nombre && g.categoria_nombre.toLowerCase().includes(term)) ||
        (g.marca_nombre && g.marca_nombre.toLowerCase().includes(term)) ||
        g.variantes.some(v => v.sku.toLowerCase().includes(term))
      );
    }

    const start = this.currentPageProductos * this.pageSizeProductos;
    const end = start + this.pageSizeProductos;
    this.pagedProductGroups = this.filteredProductGroups.slice(start, end);
  }

  loadSucursales(): void {
    this.isLoadingSucursales = true;
    this.apiService.getAll<SucursalOption>(this.apiUrlSucursales)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.isLoadingSucursales = false;
          const list: SucursalOption[] = Array.isArray(data) ? data : (data?.results || []);
          this.sucursales = list;
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem('fashionstore_pos_cached_sucursales', JSON.stringify(list));
            } catch {}
          }
          if (list.length > 0) {
            const savedId = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('pos_sucursal_id')) : null;
            const match = list.find(s => s.id === savedId);
            this.selectedSucursalId = match ? match.id : list[0].id;
            this.actualizarNombreSucursal();
          }
          this.loadVariantes(this.selectedSucursalId);
        },
        error: () => {
          this.isLoadingSucursales = false;
          if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('fashionstore_pos_cached_sucursales');
            if (cached) {
              try {
                this.sucursales = JSON.parse(cached);
                if (this.sucursales.length > 0) {
                  this.selectedSucursalId = this.sucursales[0].id;
                  this.actualizarNombreSucursal();
                }
              } catch {}
            }
          }
          this.loadVariantes(this.selectedSucursalId);
        }
      });
  }

  onSucursalChange(sucursalId: number): void {
    this.selectedSucursalId = sucursalId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pos_sucursal_id', sucursalId.toString());
    }
    this.actualizarNombreSucursal();
    if (this.cartItems.length > 0) {
      this.snackBar.open(`📍 Sucursal cambiada a: ${this.selectedSucursalNombre}. Se actualizó el stock físico del mostrador.`, 'OK', { duration: 4000 });
      this.cartItems = [];
    }
    this.isLoading = true;
    this.loadVariantes(this.selectedSucursalId);
  }

  actualizarNombreSucursal(): void {
    const s = this.sucursales.find(x => x.id === this.selectedSucursalId);
    this.selectedSucursalNombre = s ? `${s.nombre}${s.ciudad ? ' (' + s.ciudad + ')' : ''}` : (this.selectedSucursalId ? `Sucursal #${this.selectedSucursalId}` : '');
  }

  loadVariantes(sucursalId?: number | null): void {
    const targetSuc = sucursalId || this.selectedSucursalId;
    let url = this.apiUrlVariantes;
    if (targetSuc) {
      url += `?sucursal_id=${targetSuc}`;
    }

    this.apiService.getWithPagination<VarianteDisponible>(url, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Mantener todas las variantes, incluso con stock 0, para permitir la verificación del Flujo 3a (Stock Insuficiente)
          this.variantes = Array.isArray(data?.results) ? data.results : [];
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(`fashionstore_pos_cached_variantes_suc_${targetSuc || 'default'}`, JSON.stringify(this.variantes));
            } catch {}
          }
          this.loadProductos();
        },
        error: () => {
          if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem(`fashionstore_pos_cached_variantes_suc_${targetSuc || 'default'}`);
            if (cached) {
              try {
                this.variantes = JSON.parse(cached);
                this.snackBar.open(`📦 Stock de ${this.selectedSucursalNombre} cargado desde caché local (Modo Offline PWA)`, 'OK', { duration: 4000 });
              } catch {}
            }
          }
          this.loadProductos();
        }
      });
  }

  loadProductos(): void {
    this.apiService.getWithPagination<Producto>(this.apiUrlProductos, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.productos = data.results;
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem('fashionstore_pos_cached_productos', JSON.stringify(this.productos));
            } catch {}
          }
          this.buildProductGroups();
        },
        error: () => {
          if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('fashionstore_pos_cached_productos');
            if (cached) {
              try {
                this.productos = JSON.parse(cached);
              } catch {}
            }
          }
          this.buildProductGroups();
        }
      });
  }

  loadUsuarios(): void {
    this.isLoadingUsuarios = true;
    this.apiService.getWithPagination<UsuarioOption>(this.apiUrlUsuarios, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.usuarios = data.results;
          this.filteredUsuarios = data.results;
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem('fashionstore_pos_cached_usuarios', JSON.stringify(this.usuarios));
            } catch {}
          }
          this.isLoadingUsuarios = false;
        },
        error: () => {
          if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('fashionstore_pos_cached_usuarios');
            if (cached) {
              try {
                this.usuarios = JSON.parse(cached);
                this.filteredUsuarios = this.usuarios;
              } catch {}
            }
          }
          this.isLoadingUsuarios = false;
        }
      });
  }

  onSearchChange(): void {
    this.currentPageProductos = 0;
    this.applyFilterAndPagination();
  }

  onPageChangeProductos(event: PageEvent): void {
    this.currentPageProductos = event.pageIndex;
    this.applyFilterAndPagination();
  }

  filtrarUsuarios(): void {
    const term = this.usuarioSearchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredUsuarios = this.usuarios;
    } else {
      this.filteredUsuarios = this.usuarios.filter(u =>
        u.username.toLowerCase().includes(term) ||
        (u.nombre && u.nombre.toLowerCase().includes(term)) ||
        (u.apellido && u.apellido.toLowerCase().includes(term))
      );
    }
  }

  onUsuarioSelected(event: any): void {
    this.selectedUsuarioObj = event.option.value;
    this.usuarioSearchTerm = `${event.option.value.username} — ${event.option.value.nombre || ''} ${event.option.value.apellido || ''}`.trim();
  }

  limpiarUsuario(): void {
    this.selectedUsuarioObj = null;
    this.usuarioSearchTerm = '';
    this.filteredUsuarios = this.usuarios;
  }

  decrementarCantidad(varianteId: number): void {
    const actual = this.cantidadesSeleccionadas[varianteId] || 1;
    if (actual > 1) {
      this.cantidadesSeleccionadas[varianteId] = actual - 1;
    }
  }

  incrementarCantidad(varianteId: number): void {
    const variante = this.variantes.find(v => v.id === varianteId)
      || this.allProductGroups.flatMap(g => g.variantes).find(v => v.id === varianteId);
    if (!variante) return;
    if (variante.cantidad <= 0) {
      this.advertirStockInsuficiente(variante);
      return;
    }
    const actual = this.cantidadesSeleccionadas[varianteId] || 1;
    if (actual < variante.cantidad) {
      this.cantidadesSeleccionadas[varianteId] = actual + 1;
    }
  }

  validarCantidad(varianteId: number, max: number): void {
    const val = this.cantidadesSeleccionadas[varianteId];
    if (max <= 0) {
      this.cantidadesSeleccionadas[varianteId] = 0;
      return;
    }
    if (!val || val < 1 || isNaN(val)) {
      this.cantidadesSeleccionadas[varianteId] = 1;
    } else if (val > max) {
      this.cantidadesSeleccionadas[varianteId] = max;
    }
  }

  agregarAlCarrito(varianteId: number): void {
    const variante = this.variantes.find(v => v.id === varianteId)
      || this.allProductGroups.flatMap(g => g.variantes).find(v => v.id === varianteId);
    if (!variante) return;

    // CU-09 Flujo Alternativo 3a: Stock local insuficiente (0 existencias físicas)
    if (variante.cantidad <= 0) {
      this.advertirStockInsuficiente(variante);
      return;
    }

    const cantidad = this.cantidadesSeleccionadas[varianteId] || 1;

    const enCarrito = this.cartItems
      .filter(item => item.variante_producto_id === varianteId)
      .reduce((sum, item) => sum + item.cantidad, 0);

    if (enCarrito + cantidad > variante.cantidad) {
      this.advertirStockInsuficiente(variante);
      return;
    }

    const existente = this.cartItems.find(
      item => item.variante_producto_id === varianteId
    );

    if (existente) {
      this.cartItems = this.cartItems.map(item =>
        item.variante_producto_id === varianteId
          ? { ...item, cantidad: item.cantidad + cantidad }
          : item
      );
    } else {
      this.cartItems = [
        ...this.cartItems,
        {
          variante_producto_id: variante.id,
          sku: variante.sku,
          producto_nombre: variante.producto_nombre,
          cantidad: cantidad,
          precio_unitario: Number(variante.precio),
          stock_original: variante.cantidad,
        },
      ];
    }

    this.cantidadesSeleccionadas[varianteId] = 1;
  }

  // --- CU-09 Flujo Alternativo 3a: Stock Local Insuficiente ---
  advertirStockInsuficiente(variante: VarianteDisponible): void {
    this.varianteSeleccionadaAgotada = variante;
    if (this.stockInsuficienteDialogRef) {
      this.dialog.open(this.stockInsuficienteDialogRef, {
        width: '520px',
        disableClose: true
      });
    } else {
      const confirmacion = confirm(
        `[CU-09 Flujo Alternativo 3a] Stock local insuficiente.\n\n` +
        `El sistema advierte que según la última base de datos sincronizada no hay existencias físicas en '${this.selectedSucursalNombre}'.\n\n` +
        `Artículo: ${variante.producto_nombre} (${variante.sku})\n` +
        `Stock disponible: ${variante.cantidad} unidades.\n\n` +
        `¿Desea confirmar la anulación al cajero?`
      );
      if (confirmacion) {
        this.confirmarAnulacionStock();
      }
    }
  }

  confirmarAnulacionStock(): void {
    const sku = this.varianteSeleccionadaAgotada?.sku || 'artículo';
    this.dialog.closeAll();
    this.snackBar.open(
      `🚫 [Flujo Alternativo 3a] Confirmada anulación por el cajero: '${sku}' no cuenta con existencias físicas en ${this.selectedSucursalNombre}.`,
      'Entendido',
      { duration: 6000 }
    );
    this.varianteSeleccionadaAgotada = null;
  }

  cancelarAdvertenciaStock(): void {
    this.dialog.closeAll();
    this.varianteSeleccionadaAgotada = null;
  }

  eliminarDelCarrito(index: number): void {
    this.cartItems = this.cartItems.filter((_, i) => i !== index);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
