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
import { Subject, takeUntil } from 'rxjs';
import { Pagination } from 'src/app/models/pagination.model';
import { Marca } from 'src/app/models/inventario/marca.model';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { CrearMarcaComponent } from './crear-marca/crear-marca';
import { EliminarMarcaComponent } from './eliminar-marca/eliminar-marca';

@Component({
  selector: 'app-marca',
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
    MatDialogModule
  ],
  templateUrl: './marca.html',
  styleUrl: './marca.scss',
})
export class MarcaComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'nombre'];
  dataSource: Marca[] = [];

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

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
    private permisosService: PermisosService
  ) {
    this.apiUrl = this.configService.getApiUrl('marcas');
  }

  ngOnInit(): void {
    this.verificarPermisos();
    this.loadMarcas();
  }

  private verificarPermisos(): void {
    this.puedeCrear = this.permisosService.puedeCrearMarca();
    this.puedeEditar = this.permisosService.puedeEditarMarca();
    this.puedeEliminar = this.permisosService.puedeEliminarMarca();
    if (this.puedeEditar || this.puedeEliminar) {
      this.displayedColumns = ['id', 'nombre', 'acciones'];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMarcas(): void {
    this.isLoading = true;

    this.apiService.getWithPagination<Marca>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Marca>) => {
          this.dataSource = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar marcas:', error);
          this.snackBar.open('Error al cargar las marcas', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadMarcas();
  }

  crearMarca(): void {
    const dialogRef = this.dialog.open(CrearMarcaComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Marca creada exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadMarcas();
        }
      });
  }

  editarMarca(marca: Marca): void {
    const dialogRef = this.dialog.open(CrearMarcaComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false,
      data: { marca }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Marca actualizada exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadMarcas();
        }
      });
  }

  eliminarMarca(marca: Marca): void {
    const dialogRef = this.dialog.open(EliminarMarcaComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { marca }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.currentPage = 0;
          this.loadMarcas();
        }
      });
  }
}
