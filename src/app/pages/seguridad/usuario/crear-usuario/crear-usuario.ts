import { Component, OnInit, OnDestroy, Inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';

import { Subject, takeUntil } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { AuthService } from '../../../../services/auth.service';
import { Rol } from '../../../../models/seguridad/rol.model';
import { Pagination } from '../../../../models/pagination.model';

function passwordSegura(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (!v) return null;
  const errors: ValidationErrors = {};
  if (v.length < 8)             errors['minlength']   = true;
  if (!/[a-z]/.test(v))         errors['noLowercase'] = true;
  if (!/[A-Z]/.test(v))         errors['noUppercase'] = true;
  if (!/[0-9]/.test(v))         errors['noNumber']    = true;
  if (!/[^a-zA-Z0-9]/.test(v))  errors['noSymbol']    = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-crear-usuario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatSnackBarModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule
  ],
  templateUrl: './crear-usuario.html',
  styleUrl: './crear-usuario.scss'
})
export class CrearUsuarioComponent implements OnInit, OnDestroy {
  form: FormGroup;
  roles: Rol[] = [];
  rolesSeleccionadosPorDefecto: number[] = [];
  empresas: any[] = [];
  sucursales: any[] = [];
  
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  
  isSuperuser = false;
  empresaActualNombre: string | null = null;
  empresaActualId: number | null = null;
  
  // Variables para paginación de roles
  rolesPageSize = 20;
  rolesCurrentPage = 0;
  rolesTotalItems = 0;
  nextRolesUrl: string | null = null;
  previousRolesUrl: string | null = null;
  
  grupoIdUsuario: number | null = null;
  Math = Math;
  
  private destroy$ = new Subject<void>();
  @ViewChild('rolesList') rolesList: any;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private apiService: ApiService,
    private configService: ConfigService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CrearUsuarioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.usuario;
    this.isSuperuser = this.authService.isSuperuser();
    this.empresaActualNombre = this.authService.getEmpresaNombre();
    this.empresaActualId = this.authService.getEmpresaId();
    
    const usuarioEdit = data?.usuario;
    const initialEmpresaId = usuarioEdit?.empresa_id || (this.isSuperuser ? 1 : this.empresaActualId);

    this.form = this.formBuilder.group({
      username: [
        usuarioEdit?.username || '',
        [Validators.required, Validators.minLength(3)]
      ],
      nombre: [
        usuarioEdit?.nombre || '',
        [Validators.required]
      ],
      apellido: [
        usuarioEdit?.apellido || '',
        [Validators.required]
      ],
      email: [
        usuarioEdit?.email || '',
        [Validators.email]
      ],
      ci: [
        usuarioEdit?.ci || ''
      ],
      telefono: [
        usuarioEdit?.telefono || ''
      ],
      password: [
        usuarioEdit?.password || '',
        this.isEditMode ? [passwordSegura] : [Validators.required, passwordSegura]
      ],
      empresa_id: [
        initialEmpresaId,
        Validators.required
      ],
      sucursal_id: [
        usuarioEdit?.sucursal_id || null
      ],
      grupo_id: ['', Validators.required]
    });

    if (this.isEditMode) {
      this.form.get('username')?.disable();
    }
  }

  get passwordReqs() {
    const v = this.form.get('password')?.value || '';
    return {
      length:    v.length >= 8,
      lowercase: /[a-z]/.test(v),
      uppercase: /[A-Z]/.test(v),
      number:    /[0-9]/.test(v),
      symbol:    /[^a-zA-Z0-9]/.test(v),
    };
  }

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarEmpresas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarEmpresas(): void {
    const base = this.configService.getApiBaseUrl().replace(/\/api\/?$/, '');
    if (this.isSuperuser) {
      this.http.get<any[]>(`${base}/api/v1/empresas/`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.empresas = Array.isArray(data) ? data : ((data as any)?.results || []);
            const selectedEmp = this.form.get('empresa_id')?.value;
            if (selectedEmp) {
              this.cargarSucursales(selectedEmp);
            }
          },
          error: (err) => console.error('Error cargando empresas:', err)
        });
    } else {
      if (this.empresaActualId) {
        this.cargarSucursales(this.empresaActualId);
      }
    }
  }

  onEmpresaSelected(empresaId: number): void {
    this.form.patchValue({ sucursal_id: null });
    this.cargarSucursales(empresaId);
  }

  cargarSucursales(empresaId: number): void {
    if (!empresaId) {
      this.sucursales = [];
      return;
    }
    const base = this.configService.getApiBaseUrl().replace(/\/api\/?$/, '');
    this.http.get<any>(`${base}/api/v1/sucursales/?empresa_id=${empresaId}&page_size=50`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.sucursales = Array.isArray(res) ? res : (res?.results || []);
        },
        error: () => {
          this.sucursales = [];
        }
      });
  }

  private cargarRoles(): void {
    this.isLoading = true;
    const url = this.configService.getApiUrl('roles');

    this.apiService.getWithPagination<Rol>(
      url,
      this.rolesCurrentPage + 1,
      this.rolesPageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Rol>) => {
          this.roles = data.results;
          this.rolesTotalItems = data.count;
          this.nextRolesUrl = data.next;
          this.previousRolesUrl = data.previous;
          this.isLoading = false;
          
          if (this.isEditMode && this.data?.usuario?.grupos && this.data.usuario.grupos.length > 0) {
            const grupoNombre = this.data.usuario.grupos[0];
            const rolEncontrado = this.roles.find(r => r.name === grupoNombre || r.nombre === grupoNombre);
            if (rolEncontrado) {
              this.grupoIdUsuario = rolEncontrado.id;
              this.rolesSeleccionadosPorDefecto = [rolEncontrado.id];
              this.form.patchValue({ grupo_id: rolEncontrado.id });
            }
          } else if (this.roles.length > 0 && !this.form.get('grupo_id')?.value) {
            // Preseleccionar por defecto Vendedor o el primero disponible
            const defaultRol = this.roles.find(r => (r.name || r.nombre || '').toLowerCase().includes('vendedor')) || this.roles[0];
            this.form.patchValue({ grupo_id: defaultRol.id });
            this.rolesSeleccionadosPorDefecto = [defaultRol.id];
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar roles:', error);
          this.snackBar.open('Error al cargar los roles', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  nextRolesPage(): void {
    if (!this.nextRolesUrl) return;
    this.isLoading = true;
    this.apiService.getNextPage<Rol>(this.nextRolesUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Rol>) => {
          this.roles = data.results;
          this.rolesTotalItems = data.count;
          this.nextRolesUrl = data.next;
          this.previousRolesUrl = data.previous;
          this.rolesCurrentPage++;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  previousRolesPage(): void {
    if (!this.previousRolesUrl) return;
    this.isLoading = true;
    this.apiService.getNextPage<Rol>(this.previousRolesUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Rol>) => {
          this.roles = data.results;
          this.rolesTotalItems = data.count;
          this.nextRolesUrl = data.next;
          this.previousRolesUrl = data.previous;
          this.rolesCurrentPage--;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  onRolSelected(event: MatSelectionListChange): void {
    if (event.options.length > 0) {
      const selectedRolId = event.options[0].value;
      this.form.patchValue({ grupo_id: selectedRolId });
      this.rolesSeleccionadosPorDefecto = [selectedRolId];
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa los campos requeridos correctamente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValues = this.form.getRawValue();
    
    const datosUsuario: any = {
      username: formValues.username,
      nombre: formValues.nombre,
      apellido: formValues.apellido,
      email: formValues.email || '',
      ci: formValues.ci || '',
      telefono: formValues.telefono || '',
      grupo_id: formValues.grupo_id,
      empresa_id: Number(formValues.empresa_id),
      sucursal_id: formValues.sucursal_id ? Number(formValues.sucursal_id) : null
    };

    if (!this.isEditMode || formValues.password) {
      datosUsuario.password = formValues.password;
    }

    const url = this.configService.getApiUrl('usuarios');

    if (this.isEditMode) {
      this.apiService.update(url, this.data.usuario.id, datosUsuario)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Usuario actualizado exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            const msg = error.error?.detail || error.error?.error || 'Error al actualizar usuario';
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      this.apiService.create(url, datosUsuario)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Usuario creado exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            const msg = error.error?.detail || error.error?.error || 'Error al crear usuario';
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
