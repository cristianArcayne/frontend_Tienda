import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { ComparadorService } from 'src/app/services/comparador.service';
import { FavoritosService } from 'src/app/services/favoritos.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialModule } from 'src/app/material.module';
import { Subject } from 'rxjs';

import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria_nombre: string;
  categoria: number;
  imagen_principal: string;
  precio_minimo: number;
  calificacion_promedio: number | null;
  total_resenas: number;
}

interface Categoria {
  id: number;
  nombre: string;
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
  categoriaSeleccionada: number | null = null;
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
    private apiService: ApiService,
    private configService: ConfigService,
    private comparadorService: ComparadorService,
    private favoritosService: FavoritosService,
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
    this.apiService.getWithPagination<Categoria>(url, 1, 100).subscribe(res => {
      this.categorias = res.results;
    });
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

    this.apiService.getWithPagination<Producto>(url, 1, 10, filtros).subscribe({
      next: (res) => {
        this.productos = res.results;
        this.hayMas = !!res.next;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 });
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

    this.apiService.getWithPagination<Producto>(url, this.paginaActual, 10, filtros).subscribe({
      next: (res) => {
        this.productos = [...this.productos, ...res.results];
        this.hayMas = !!res.next;
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
}
