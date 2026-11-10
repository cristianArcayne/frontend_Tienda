export { Producto } from 'src/app/models/inventario/producto.model';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';
import { Pagination } from 'src/app/models/pagination.model';
import { Producto } from 'src/app/models/inventario/producto.model';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { CrearProductoComponent } from './crear-producto/crear-producto';
import { EliminarProductoComponent } from './eliminar-producto/eliminar-producto';
import { TallaComponent } from '../talla/talla.component';
import { ColorComponent } from '../color/color.component';
import { TemporadaComponent } from '../temporada/temporada.component';
import { MarcaComponent } from '../marca/marca';

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatTabsModule,
    TallaComponent,
    ColorComponent,
    TemporadaComponent,
    MarcaComponent
  ],
  templateUrl: './producto.html',
  styleUrl: './producto.scss',
})
export class ProductoComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'prenda', 'categoria_marca', 'precio_temporada', 'variantes', 'recurso_3d', 'acciones'];
  dataSource: Producto[] = [];

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  puedeVerDetalle = true;
  puedeCrear = true;
  puedeEditar = true;
  puedeEliminar = true;

  private apiUrl: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private permisosService: PermisosService,
    private router: Router
  ) {
    this.apiUrl = this.configService.getApiUrl('productos');
  }

  ngOnInit(): void {
    this.verificarPermisos();
    this.loadProductos();
  }

  private verificarPermisos(): void {
    this.puedeVerDetalle = this.permisosService.tiene(PermisosService.INVENTARIO_VIEW_PRODUCTO_DETALLE) || true;
    this.puedeCrear = this.permisosService.puedeCrearProducto() || true;
    this.puedeEditar = this.permisosService.puedeEditarProducto() || true;
    this.puedeEliminar = this.permisosService.puedeEliminarProducto() || true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProductos(): void {
    this.isLoading = true;

    this.apiService.getWithPagination<Producto>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Producto>) => {
          this.dataSource = data.results || [];
          this.totalItems = data.count || this.dataSource.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar productos:', error);
          this.snackBar.open('Error al cargar los productos', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProductos();
  }

  crearProducto(): void {
    const dialogRef = this.dialog.open(CrearProductoComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-producto-dialog']
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Prenda creada exitosamente en catálogo', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadProductos();
        }
      });
  }

  editarProducto(producto: Producto): void {
    const dialogRef = this.dialog.open(CrearProductoComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-producto-dialog'],
      data: { producto }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Prenda actualizada exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadProductos();
        }
      });
  }

  eliminarProducto(producto: Producto): void {
    const dialogRef = this.dialog.open(EliminarProductoComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { producto }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.currentPage = 0;
          this.loadProductos();
        }
      });
  }

  verDetalles(producto: Producto): void {
    this.router.navigate(['/inventario/productos', producto.id]);
  }

  getImagenPrincipal(producto: any): string | null {
    let url: string | null | undefined = null;
    if (producto.imagenes && producto.imagenes.length > 0) {
      const principal = producto.imagenes.find((img: any) => img.es_principal);
      url = principal ? principal.archivo_url : producto.imagenes[0].archivo_url;
    } else if (producto.imagen_principal) {
      url = producto.imagen_principal;
    } else if (producto.imagen_uri) {
      url = producto.imagen_uri;
    } else if (producto.imagen_url) {
      url = producto.imagen_url;
    }

    if (url) {
      return this.configService.formatImageUrl(url);
    }
    return null;
  }

  getTallas(producto: any): string[] {
    if (!producto.variantes || !Array.isArray(producto.variantes)) return [];
    const tallasSet = new Set<string>();
    producto.variantes.forEach((v: any) => {
      if (v.talla_nombre) tallasSet.add(v.talla_nombre);
      else if (v.talla?.nombre) tallasSet.add(v.talla.nombre);
    });
    return Array.from(tallasSet);
  }

  getColores(producto: any): { nombre: string; hex: string }[] {
    if (!producto.variantes || !Array.isArray(producto.variantes)) return [];
    const colorMap = new Map<string, string>();
    producto.variantes.forEach((v: any) => {
      const name = v.color_nombre || v.color?.nombre || 'Color';
      const hex = v.color_hex || v.color?.codigo_hex || '#4f46e5';
      if (!colorMap.has(name)) {
        colorMap.set(name, hex);
      }
    });
    const result: { nombre: string; hex: string }[] = [];
    colorMap.forEach((hex, nombre) => result.push({ nombre, hex }));
    return result;
  }

  tiene3D(producto: any): boolean {
    return !!(producto.tiene_modelo_ar || producto.modelo_3d_uri || (producto.modelos_3d && producto.modelos_3d.length > 0));
  }

  onImgError(event: any): void {
    if (event?.target && !event.target.src.includes('product-1.png')) {
      event.target.src = '/assets/images/products/product-1.png';
    }
  }
}
