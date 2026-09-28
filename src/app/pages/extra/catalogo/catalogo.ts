import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { ComparadorService } from 'src/app/services/comparador.service';
import { FavoritosService } from 'src/app/services/favoritos.service';
import { CartService } from 'src/app/services/cart.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialModule } from 'src/app/material.module';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SeleccionarVarianteDialogComponent } from './seleccionar-variante-dialog/seleccionar-variante-dialog.component';
import { CrearReservaDialogComponent } from '../../reservas/crear-reserva-dialog/crear-reserva-dialog.component';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria_nombre: string;
  categoria: number;
  imagen_principal: string;
  precio_base?: number;
  precio_minimo: number;
  precio_promocional?: number | null;
  porcentaje_descuento?: number;
  en_oferta?: boolean;
  calificacion_promedio: number | null;
  total_resenas: number;
  stock_total?: number;
  disponible_en_sucursal?: boolean;
  variantes?: any[];
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Sucursal {
  id: number;
  nombre: string;
  ciudad: string;
  direccion?: string;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MaterialModule,
    FormsModule
  ],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.scss']
})
export class CatalogoComponent implements OnInit, AfterViewInit, OnDestroy {
  productos: Producto[] = [];
  categorias: Categoria[] = [];
  sucursales: Sucursal[] = [];

  categoriaSeleccionada: number | null = null;
  sucursalSeleccionadaId: number | null = null;
  terminoBusqueda: string = '';

  cargando: boolean = true;
  cargandoMas: boolean = false;
  hayMas: boolean = false;
  paginaActual: number = 1;
  favoritosIds: Set<number> = new Set();
  comparadorIds: Set<number> = new Set();
  cantidadComparador = 0;

  @ViewChild('sentinel') sentinelRef!: ElementRef;
  private observer!: IntersectionObserver;
  private searchSubject = new Subject<string>();

  puedeVerDetalle = false;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private configService: ConfigService,
    private comparadorService: ComparadorService,
    private favoritosService: FavoritosService,
    private cartService: CartService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private permisosService: PermisosService
  ) {
    this.puedeVerDetalle = this.permisosService.tiene(PermisosService.INVENTARIO_VIEW_PRODUCTO_DETALLE);
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.terminoBusqueda = term;
      this.cargarProductos();
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarSucursales();
    this.cargarProductos();

    this.favoritosService.favoritos$.subscribe(favoritos => {
      this.favoritosIds = new Set(favoritos.map(f => f.producto_id));
    });

    this.comparadorService.ids$.subscribe(ids => {
      this.comparadorIds = new Set(ids);
      this.cantidadComparador = ids.length;
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.cargarMasProductos();
      }
    }, { threshold: 0.1 });

    if (this.sentinelRef) {
      this.observer.observe(this.sentinelRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  cargarCategorias(): void {
    const url = this.configService.getApiUrl('categorias');
    this.apiService.getWithPagination<Categoria>(url, 1, 100).subscribe({
      next: (res: any) => {
        this.categorias = Array.isArray(res) ? res : (res?.results || []);
      },
      error: () => {}
    });
  }

  cargarSucursales(): void {
    const url = this.configService.getApiUrl('sucursales');
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.sucursales = Array.isArray(res) ? res : (res.results || []);
      },
      error: () => {}
    });
  }

  cambiarSucursal(): void {
    this.cargarProductos();
  }

  getNombreSucursalSeleccionada(): string {
    if (!this.sucursalSeleccionadaId) return 'Todas las Tiendas';
    const s = this.sucursales.find(suc => suc.id === this.sucursalSeleccionadaId);
    return s ? `${s.nombre} (${s.ciudad})` : 'Sucursal';
  }

  cargarProductos(): void {
    this.cargando = true;
    this.paginaActual = 1;
    this.productos = [];
    this.hayMas = false;

    const url = this.configService.getApiUrl('catalogo');
    const filtros: Record<string, any> = {};
    if (this.categoriaSeleccionada) filtros['categoria'] = this.categoriaSeleccionada;
    if (this.terminoBusqueda) filtros['search'] = this.terminoBusqueda;
    if (this.sucursalSeleccionadaId) filtros['sucursal_id'] = this.sucursalSeleccionadaId;

    this.apiService.getWithPagination<Producto>(url, 1, 12, filtros).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.results || []);
        this.productos = items;
        this.hayMas = Array.isArray(res) ? false : !!res?.next;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al cargar productos del catálogo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarMasProductos(): void {
    if (this.cargandoMas || !this.hayMas) return;
    this.cargandoMas = true;
    this.paginaActual++;

    const url = this.configService.getApiUrl('catalogo');
    const filtros: Record<string, any> = {};
    if (this.categoriaSeleccionada) filtros['categoria'] = this.categoriaSeleccionada;
    if (this.terminoBusqueda) filtros['search'] = this.terminoBusqueda;
    if (this.sucursalSeleccionadaId) filtros['sucursal_id'] = this.sucursalSeleccionadaId;

    this.apiService.getWithPagination<Producto>(url, this.paginaActual, 12, filtros).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.results || []);
        this.productos = [...this.productos, ...items];
        this.hayMas = Array.isArray(res) ? false : !!res?.next;
        this.cargandoMas = false;
      },
      error: () => {
        this.paginaActual--;
        this.cargandoMas = false;
      }
    });
  }

  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  seleccionarCategoria(id: number | null): void {
    this.categoriaSeleccionada = id;
    this.cargarProductos();
  }

  verDetalles(id: number): void {
    if (!this.puedeVerDetalle) return;
    this.router.navigate(['/inventario/productos', id]);
  }

  esFavorito(productoId: number): boolean {
    return this.favoritosIds.has(productoId);
  }

  esComparado(productoId: number): boolean {
    return this.comparadorIds.has(productoId);
  }

  toggleComparador(prod: Producto): void {
    if (this.esComparado(prod.id)) {
      this.comparadorService.quitar(prod.id);
      this.snackBar.open(`${prod.nombre} quitado del comparador`, 'Cerrar', { duration: 2000 });
      return;
    }

    const resultado = this.comparadorService.agregar(prod.id, prod.nombre);
    this.snackBar.open(resultado.mensaje, 'Cerrar', { duration: 2500 });
  }

  irComparador(): void {
    this.router.navigate(['/extra/comparador']);
  }

  toggleFavorito(prod: Producto): void {
    if (this.esFavorito(prod.id)) {
      this.favoritosService.eliminarPorProducto(prod.id).subscribe({
        next: () => {
          this.snackBar.open(`${prod.nombre} eliminado de favoritos`, 'Cerrar', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Error al quitar de favoritos', 'Cerrar', { duration: 3000 });
        }
      });
    } else {
      this.favoritosService.agregar(prod.id).subscribe({
        next: () => {
          this.snackBar.open(`${prod.nombre} agregado a favoritos`, 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          this.snackBar.open(err.error?.error || 'Error al agregar a favoritos', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  agregarAlCarrito(prod: Producto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const variantes = prod.variantes || [];
    if (variantes.length === 0) {
      this.snackBar.open('Este producto no tiene variantes configuradas', 'Cerrar', { duration: 3000 });
      return;
    }

    // Si tiene una sola variante y hay stock
    if (variantes.length === 1) {
      const v = variantes[0];
      const stock = v.stock ?? v.cantidad ?? 0;
      if (stock <= 0) {
        this.snackBar.open(`Producto agotado en ${this.getNombreSucursalSeleccionada()}`, 'Cerrar', { duration: 3000 });
        return;
      }

      this.cartService.agregarProducto(v.id, 1).subscribe({
        next: () => {
          this.snackBar.open(`¡${prod.nombre} añadido al carrito!`, 'Ver Carrito', {
            duration: 3500,
            horizontalPosition: 'right',
            verticalPosition: 'top'
          }).onAction().subscribe(() => {
            this.router.navigate(['/extra/carrito']);
          });
        },
        error: (err) => {
          this.snackBar.open(err.error?.detail || err.error?.error || 'No se pudo añadir al carrito', 'Cerrar', { duration: 3000 });
        }
      });
      return;
    }

    // Múltiples variantes (Tallas/Colores): abrir diálogo de selección
    const dialogRef = this.dialog.open(SeleccionarVarianteDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        producto: prod,
        sucursalId: this.sucursalSeleccionadaId,
        sucursalNombre: this.getNombreSucursalSeleccionada()
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res && res.varianteId) {
        this.cartService.agregarProducto(res.varianteId, res.cantidad || 1).subscribe({
          next: () => {
            this.snackBar.open(`¡${prod.nombre} añadido al carrito!`, 'Ver Carrito', {
              duration: 3500,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            }).onAction().subscribe(() => {
              this.router.navigate(['/extra/carrito']);
            });
          },
          error: (err) => {
            this.snackBar.open(err.error?.detail || err.error?.error || 'No se pudo añadir al carrito', 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }

  iniciarReserva(prod: Producto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const dialogRef = this.dialog.open(CrearReservaDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: {
        producto: prod
      }
    });

    dialogRef.afterClosed().subscribe((creada) => {
      if (creada) {
        this.snackBar.open('¡Prenda reservada con éxito! Puedes gestionarla en Mis Reservas.', 'Ver Reservas', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }).onAction().subscribe(() => {
          this.router.navigate(['/reservas']);
        });
      }
    });
  }

  getImagenUrl(url: string | null): string {
    if (!url) return 'assets/images/products/product-1.png';
    const formatted = this.configService.formatImageUrl(url);
    return formatted || 'assets/images/products/product-1.png';
  }

  onImgError(event: any): void {
    if (event && event.target && !event.target.src.includes('product-1.png')) {
      event.target.src = 'assets/images/products/product-1.png';
    }
  }

  getEstrellas(calificacion: number): string[] {
    const estrellas: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(calificacion)) {
        estrellas.push('star');
      } else if (i - calificacion < 1 && i - calificacion > 0) {
        estrellas.push('star_half');
      } else {
        estrellas.push('star_border');
      }
    }
    return estrellas;
  }

  probarConIA(prod: Producto, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/extra/vestidor'], {
      queryParams: {
        ropaId: prod.id,
        ropaNombre: prod.nombre,
        ropaImagen: prod.imagen_principal || ''
      }
    });
  }
}
