import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { Pagination } from 'src/app/models/pagination.model';
import { Usuario } from 'src/app/models/seguridad/Usuario.model';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { PermisosService } from 'src/app/services/permisos.service';
import { CrearUsuarioComponent } from './crear-usuario/crear-usuario';
import { EliminarUsuarioComponent } from './eliminar-usuario/eliminar-usuario';

@Component({
  selector: 'app-usuario',
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
  templateUrl: './usuario.html',
  styleUrl: './usuario.scss',
})
export class UsuarioComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'username', 'email', 'nombre', 'apellido', 'grupos', 'is_superuser'];
  dataSource: Usuario[] = [];

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
    this.apiUrl = this.configService.getApiUrl('usuarios');
  }

  ngOnInit(): void {
    this.verificarPermisos();
    this.loadUsuarios();
  }

  private verificarPermisos(): void {
    this.puedeCrear = this.permisosService.puedeCrearUsuario();
    this.puedeEditar = this.permisosService.puedeEditarUsuario();
    this.puedeEliminar = this.permisosService.puedeEliminarUsuario();
    if (this.puedeEditar || this.puedeEliminar) {
      this.displayedColumns = ['id', 'username', 'email', 'nombre', 'apellido', 'grupos', 'is_superuser', 'acciones'];
    }
  }  

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsuarios(): void {
    this.isLoading = true;

    this.apiService.getWithPagination<Usuario>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Usuario>) => {
          this.dataSource = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar usuarios:', error);
          this.snackBar.open('Error al cargar los usuarios', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsuarios();
  }

  /**
   * Abrir modal para crear nuevo usuario
   */
  crearUsuario(): void {
    const dialogRef = this.dialog.open(CrearUsuarioComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-usuario-dialog']
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Usuario creado exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadUsuarios();
        }
      });
  }

  /**
   * Editar usuario
   */
  editarUsuario(usuario: Usuario): void {
    const dialogRef = this.dialog.open(CrearUsuarioComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      panelClass: ['crear-usuario-dialog'],
      data: { usuario }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.snackBar.open('Usuario actualizado exitosamente', 'OK', { duration: 3000 });
          this.currentPage = 0;
          this.loadUsuarios();
        }
      });
  }

  /**
   * Eliminar usuario
   */
  eliminarUsuario(usuario: Usuario): void {
    const dialogRef = this.dialog.open(EliminarUsuarioComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { usuario }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.currentPage = 0;
          this.loadUsuarios();
        }
      });
  }
}
