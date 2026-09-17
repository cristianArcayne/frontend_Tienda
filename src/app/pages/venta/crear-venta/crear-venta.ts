import { Component, OnInit, OnDestroy } from '@angular/core';
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

  cartItems: CartItem[] = [];
  usuarios: UsuarioOption[] = [];
  filteredUsuarios: UsuarioOption[] = [];
  usuarioSearchTerm = '';
  selectedUsuarioObj: UsuarioOption | null = null;

  isLoading = false;
  isLoadingUsuarios = false;
  isSubmitting = false;

  displayedColumnsCart: string[] = ['producto', 'cantidad', 'precio_unitario', 'subtotal', 'acciones'];

  private apiUrlVariantes: string;
  private apiUrlProductos: string;
  private apiUrlUsuarios: string;
  private apiUrlVentas: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
  ) {
    this.apiUrlVariantes = this.configService.getApiUrl('variantes');
    this.apiUrlProductos = this.configService.getApiUrl('productos');
    this.apiUrlUsuarios = this.configService.getApiUrl('usuarios');
    this.apiUrlVentas = this.configService.getApiUrl('ventas');
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.loadVariantes();
    this.loadUsuarios();
  }

  get totalCarrito(): number {
    return this.cartItems.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  }

  get carritoValido(): boolean {
    return this.cartItems.length > 0 && !!this.selectedUsuarioObj;
  }

  private getProductoImagen(productoId: number): string | null {
    const prod = this.productos.find(p => p.id === productoId);
    if (prod?.imagenes?.length) {
      const principal = prod.imagenes.find(i => i.es_principal);
      return principal ? principal.archivo_url : prod.imagenes[0].archivo_url;
    }
    return null;
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
        g.producto_nombre.toLowerCase().includes(term)
      );
    }

    const start = this.currentPageProductos * this.pageSizeProductos;
    const end = start + this.pageSizeProductos;
    this.pagedProductGroups = this.filteredProductGroups.slice(start, end);
  }

  loadVariantes(): void {
    this.apiService.getWithPagination<VarianteDisponible>(this.apiUrlVariantes, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.variantes = data.results.filter(v => v.cantidad > 0);
          this.loadProductos();
        },
        error: () => {
          this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  loadProductos(): void {
    this.apiService.getWithPagination<Producto>(this.apiUrlProductos, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.productos = data.results;
          this.buildProductGroups();
        },
        error: () => {
          this.productos = [];
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
          this.isLoadingUsuarios = false;
        },
        error: () => {
          this.snackBar.open('Error al cargar usuarios', 'Cerrar', { duration: 5000 });
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
    const variante = this.variantes.find(v => v.id === varianteId);
    if (!variante) return;
    const actual = this.cantidadesSeleccionadas[varianteId] || 1;
    if (actual < variante.cantidad) {
      this.cantidadesSeleccionadas[varianteId] = actual + 1;
    }
  }

  validarCantidad(varianteId: number, max: number): void {
    const val = this.cantidadesSeleccionadas[varianteId];
    if (!val || val < 1 || isNaN(val)) {
      this.cantidadesSeleccionadas[varianteId] = 1;
    } else if (val > max) {
      this.cantidadesSeleccionadas[varianteId] = max;
    }
  }

  agregarAlCarrito(varianteId: number): void {
    const variante = this.variantes.find(v => v.id === varianteId);
    if (!variante) return;

    const cantidad = this.cantidadesSeleccionadas[varianteId] || 1;

    const enCarrito = this.cartItems
      .filter(item => item.variante_producto_id === varianteId)
      .reduce((sum, item) => sum + item.cantidad, 0);

    if (enCarrito + cantidad > variante.cantidad) {
      this.snackBar.open(
        `Stock insuficiente. Disponible: ${variante.cantidad - enCarrito}`,
        'OK', { duration: 3000 }
      );
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

  eliminarDelCarrito(index: number): void {
    this.cartItems = this.cartItems.filter((_, i) => i !== index);
  }

  finalizarVenta(): void {
    if (!this.carritoValido) return;

    this.isSubmitting = true;

    const body = {
      tipo: 'presencial',
      estado: 'pendiente',
      precio_total: this.totalCarrito,
      usuario_id: this.selectedUsuarioObj!.id,
      detalles: this.cartItems.map(item => ({
        variante_producto_id: item.variante_producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      })),
    };

    this.apiService.create<Venta>(this.apiUrlVentas, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (venta) => {
          this.snackBar.open(`Venta #${venta.id} creada exitosamente`, 'OK', { duration: 3000 });
          this.router.navigate(['/ventas', venta.id]);
        },
        error: (err) => {
          const msg = err.error?.detail || err.error?.[0] || 'Error al crear la venta';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          this.isSubmitting = false;
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
        
        const body = {
          tipo: 'presencial',
          estado: 'completado', // Completado directamente al pagar
          precio_total: this.totalCarrito,
          usuario_id: this.selectedUsuarioObj!.id,
          detalles: this.cartItems.map(item => ({
            variante_producto_id: item.variante_producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          })),
        };

        this.apiService.create<Venta>(this.apiUrlVentas, body)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (venta) => {
              const metodoFormateado = result.metodo.toUpperCase();
              this.snackBar.open(`¡Venta #${venta.id} pagada vía ${metodoFormateado} y guardada con éxito!`, 'OK', { duration: 5000 });
              this.router.navigate(['/ventas', venta.id]);
            },
            error: (err) => {
              const msg = err.error?.detail || err.error?.[0] || 'Error al registrar la venta pagada';
              this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
              this.isSubmitting = false;
            }
          });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
