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
import { Subject, takeUntil } from 'rxjs';
import { Pagination } from 'src/app/models/pagination.model';
import { Producto } from 'src/app/models/inventario/producto.model';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { CrearProductoComponent } from './crear-producto/crear-producto';
import { EliminarProductoComponent } from './eliminar-producto/eliminar-producto';

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
    MatDialogModule
  ],
  templateUrl: './producto.html',
  styleUrl: './producto.scss',
})
export class ProductoComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'nombre', 'categoria_nombre', 'marca_nombre', 'imagenes'];
  dataSource: Producto[] = [];

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  puedeVerDetalle = false;
  puedeCrear = false;
  puedeEditar = false;
  puedeEliminar = false;

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
    this.puedeVerDetalle = this.permisosService.tiene(PermisosService.INVENTARIO_VIEW_PRODUCTO_DETALLE);
    this.puedeCrear = this.permisosService.puedeCrearProducto();
    this.puedeEditar = this.permisosService.puedeEditarProducto();
    this.puedeEliminar = this.permisosService.puedeEliminarProducto();
    if (this.puedeVerDetalle || this.puedeEditar || this.puedeEliminar) {
      this.displayedColumns = ['id', 'nombre', 'categoria_nombre', 'marca_nombre', 'imagenes', 'acciones'];
    }
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
          this.dataSource = data.results;
          this.totalItems = data.count;
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
          this.snackBar.open('Producto creado exitosamente', 'OK', { duration: 3000 });
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
          this.snackBar.open('Producto actualizado exitosamente', 'OK', { duration: 3000 });
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

  getImagenPrincipal(producto: Producto): string | null {
    if (producto.imagenes && producto.imagenes.length > 0) {
      const principal = producto.imagenes.find(img => img.es_principal);
      return principal ? principal.archivo_url : producto.imagenes[0].archivo_url;
    }
    return null;
  }
}
