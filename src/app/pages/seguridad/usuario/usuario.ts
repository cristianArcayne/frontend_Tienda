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
import { AuthService } from 'src/app/services/auth.service';
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
  displayedColumns: string[] = ['id', 'username', 'nombre', 'apellido', 'email', 'grupos', 'acciones'];
  dataSource: Usuario[] = [];

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  puedeCrear = false;
  puedeEditar = false;
  puedeEliminar = false;
  empresaNombre: string | null = null;
  isSuperuser = false;

  private apiUrl: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private permisosService: PermisosService,
    public authService: AuthService
  ) {
    this.apiUrl = this.configService.getApiUrl('usuarios');
  }

  ngOnInit(): void {
    this.empresaNombre = this.authService.getEmpresaNombre();
    this.isSuperuser = this.authService.isSuperuser();
    this.verificarPermisos();
    this.loadUsuarios();
  }

  private verificarPermisos(): void {
    const esAdmin = this.authService.isSuperuser() || this.authService.isAdmin();
    this.puedeCrear = esAdmin || this.permisosService.puedeCrearUsuario();
    this.puedeEditar = esAdmin || this.permisosService.puedeEditarUsuario();
    this.puedeEliminar = esAdmin || this.permisosService.puedeEliminarUsuario();
    
    if (this.isSuperuser) {
      this.displayedColumns = ['id', 'username', 'nombre', 'apellido', 'email', 'empresa', 'grupos', 'acciones'];
    } else {
      this.displayedColumns = ['id', 'username', 'nombre', 'apellido', 'email', 'grupos', 'acciones'];
    }
  }  

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsuarios(): void {
    this.isLoading = true;
    const filters: Record<string, any> = {};
    const empId = this.authService.getEmpresaId();
    if (!this.isSuperuser && empId) {
      filters['empresa_id'] = empId;
    }

    this.apiService.getWithPagination<Usuario>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize,
      filters
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Usuario>) => {
          this.dataSource = Array.isArray(data) ? data : (data?.results || []);
          this.totalItems = data?.count || this.dataSource.length;
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

  crearUsuario(): void {
    const dialogRef = this.dialog.open(CrearUsuarioComponent, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: false,
      panelClass: ['crear-usuario-dialog']
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

  editarUsuario(usuario: Usuario): void {
    const dialogRef = this.dialog.open(CrearUsuarioComponent, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: false,
      panelClass: ['crear-usuario-dialog'],
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
