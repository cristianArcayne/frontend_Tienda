import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { Categoria } from 'src/app/models/inventario/categoria.model';
import { Pagination } from 'src/app/models/pagination.model';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { CrearCategoriaComponent } from './crear-categoria/crear-categoria';
import { EliminarCategoriaComponent } from './eliminar-categoria/eliminar-categoria';
import { MarcaComponent } from '../marca/marca';
import { TallaComponent } from '../talla/talla.component';
import { ColorComponent } from '../color/color.component';
import { TemporadaComponent } from '../temporada/temporada.component';

@Component({
  selector: 'app-categoria',
  standalone: true,
  imports: [
    CommonModule,
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
    MarcaComponent,
    TallaComponent,
    ColorComponent,
    TemporadaComponent
  ],
  templateUrl: './categoria.html',
  styleUrl: './categoria.scss',
})
export class CategoriaComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'nombre'];
  dataSource: Categoria[] = [];
  isLoading = false;
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;

  puedeVerCategoria = false;
  puedeCrear = false;
  puedeEditar = false;
  puedeEliminar = false;
  puedeVerMarca = false;

  private destroy$ = new Subject<void>();
  private apiUrl: string;

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.apiUrl = this.configService.getApiUrl('categorias');
  }

  ngOnInit(): void {
    this.loadCategorias();

    this.puedeVerCategoria = this.permisosService.puedeVerCategoria();
    this.puedeCrear = this.permisosService.puedeCrearCategoria();
    this.puedeEditar = this.permisosService.puedeEditarCategoria();
    this.puedeEliminar = this.permisosService.puedeEliminarCategoria();
    this.puedeVerMarca = this.permisosService.puedeVerMarca();
    if (this.puedeEditar || this.puedeEliminar) {
      this.displayedColumns = ['id', 'nombre', 'acciones'];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategorias(): void {
    this.isLoading = true;

    this.apiService.getWithPagination<Categoria>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          if (Array.isArray(data)) {
            this.dataSource = data;
            this.totalItems = data.length;
          } else {
            this.dataSource = data?.results || [];
            this.totalItems = data?.count || 0;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar categorías:', error);
          this.snackBar.open('Error al cargar las categorías', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCategorias();
  }

  crearCategoria(): void {
    const dialogRef = this.dialog.open(CrearCategoriaComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-categoria-dialog']
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Categoría creada exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadCategorias();
        }
      });
  }

  editarCategoria(categoria: Categoria): void {
    const dialogRef = this.dialog.open(CrearCategoriaComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-categoria-dialog'],
      data: { categoria }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Categoría actualizada exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadCategorias();
        }
      });
  }

  eliminarCategoria(categoria: Categoria): void {
    const dialogRef = this.dialog.open(EliminarCategoriaComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { categoria }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Categoría eliminada exitosamente', 'OK', { duration: 3000 });
          this.loadCategorias();
        }
      });
  }
}
export { Categoria };