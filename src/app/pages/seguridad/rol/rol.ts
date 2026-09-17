import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Rol } from '../../../models/seguridad/rol.model';
import { Pagination } from '../../../models/pagination.model';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';
import { CrearRolComponent } from './crear-rol/crear-rol';
import { EliminarRolComponent } from './eliminar-rol/eliminar-rol';

@Component({
  selector: 'app-rol',
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
    MatChipsModule
  ],
  templateUrl: './rol.html',
  styleUrl: './rol.scss',
})
export class RolComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'name', 'permisos'];
  dataSource: Rol[] = [];

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
    this.apiUrl = this.configService.getApiUrl('roles');
  }

  ngOnInit(): void {
    this.verificarPermisos();
    this.loadRoles();
  }

  private verificarPermisos(): void {
    this.puedeCrear = this.permisosService.puedeCrearRol();
    this.puedeEditar = this.permisosService.puedeEditarRol();
    this.puedeEliminar = this.permisosService.puedeEliminarRol();
    if (this.puedeEditar || this.puedeEliminar) {
      this.displayedColumns = ['id', 'name', 'permisos', 'acciones'];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar roles de la página actual
   */
  loadRoles(): void {
    this.isLoading = true;

    this.apiService.getWithPagination<Rol>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Rol>) => {
          this.dataSource = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar roles:', error);
          this.snackBar.open('Error al cargar los roles', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  /**
   * Manejar cambio de página
   */
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRoles();
  }

  /**
   * Abrir modal para crear nuevo rol
   */
  crearRol(): void {
    const dialogRef = this.dialog.open(CrearRolComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-rol-dialog']
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Rol creado exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadRoles();
        }
      });
  }

  /**
   * Editar rol
   */
  editRol(rol: Rol): void {
    const dialogRef = this.dialog.open(CrearRolComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-rol-dialog'],
      data: { rol }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Rol actualizado exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadRoles();
        }
      });
  }

  /**
   * Eliminar rol
   */
  deleteRol(rol: Rol): void {
    const dialogRef = this.dialog.open(EliminarRolComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { rol }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadRoles();
        }
      });
  }

  /**
   * Obtener cantidad de permisos
   */
  getPermisoCount(rol: Rol): number {
    return rol.permisos?.length || 0;
  }
}

