import { Component, OnInit, OnDestroy, Inject, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';

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
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { Subject, takeUntil } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Rol } from '../../../../models/seguridad/rol.model';
import { Pagination } from '../../../../models/pagination.model';

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
    MatIconModule
  ],
  templateUrl: './crear-usuario.html',
  styleUrl: './crear-usuario.scss'
})
export class CrearUsuarioComponent implements OnInit, OnDestroy {
  form: FormGroup;
  roles: Rol[] = [];
  rolesSeleccionadosPorDefecto: number[] = [];
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  
  // Variables para paginación
  rolesPageSize = 10;
  rolesCurrentPage = 0;
  rolesTotalItems = 0;
  nextRolesUrl: string | null = null;
  previousRolesUrl: string | null = null;
  
  // Guardar el grupo_id del usuario siendo editado
  grupoIdUsuario: number | null = null;
  
  // Exponer Math al template
  Math = Math;
  
  private destroy$ = new Subject<void>();
  @ViewChild('rolesList') rolesList: any;

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CrearUsuarioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.usuario;
    // En edición, el backend solo envía nombres de grupos, buscaremos el ID en cargarRoles
    // Por ahora, usamos el primer grupo si existe
    this.grupoIdUsuario = null;
    
    this.form = this.formBuilder.group({
      username: [
        data?.usuario?.username || '',
        [Validators.required, Validators.minLength(3)]
      ],
      email: [
        data?.usuario?.email || '',
        [Validators.email]
      ],
      password: [
        data?.usuario?.password || '',
        this.isEditMode
          ? [passwordSegura]
          : [Validators.required, passwordSegura]
      ],
      grupo_id: ['', Validators.required]
    });

    // Deshabilitar username en modo edición
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar roles disponibles con paginación
   */
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
          
          // En edición: buscar el rol que coincida con los grupos del usuario
          if (this.isEditMode && this.data?.usuario?.grupos && this.data.usuario.grupos.length > 0) {
            const grupoNombre = this.data.usuario.grupos[0];
            const rolEncontrado = this.roles.find(r => r.name === grupoNombre);
            if (rolEncontrado) {
              this.grupoIdUsuario = rolEncontrado.id;
              this.rolesSeleccionadosPorDefecto = [rolEncontrado.id];
              this.form.patchValue({ grupo_id: rolEncontrado.id });
            }
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

  /**
   * Ir a la siguiente página de roles
   */
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
          
          // Pre-seleccionar el rol del usuario si está en edición y está en la nueva página
          if (this.isEditMode && this.data?.usuario?.grupos && this.data.usuario.grupos.length > 0) {
            const grupoNombre = this.data.usuario.grupos[0];
            const rolEncontrado = this.roles.find(r => r.name === grupoNombre);
            if (rolEncontrado) {
              this.grupoIdUsuario = rolEncontrado.id;
              this.rolesSeleccionadosPorDefecto = [rolEncontrado.id];
            }
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar siguiente página de roles:', error);
          this.snackBar.open('Error al cargar roles', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  /**
   * Ir a la página anterior de roles
   */
  previousRolesPage(): void {
    if (!this.previousRolesUrl) return;

    this.isLoading = true;
    this.apiService.getPreviousPage<Rol>(this.previousRolesUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Rol>) => {
          this.roles = data.results;
          this.rolesTotalItems = data.count;
          this.nextRolesUrl = data.next;
          this.previousRolesUrl = data.previous;
          this.rolesCurrentPage--;
          this.isLoading = false;
          
          // Pre-seleccionar el rol del usuario si está en edición y está en la página anterior
          if (this.isEditMode && this.data?.usuario?.grupos && this.data.usuario.grupos.length > 0) {
            const grupoNombre = this.data.usuario.grupos[0];
            const rolEncontrado = this.roles.find(r => r.name === grupoNombre);
            if (rolEncontrado) {
              this.grupoIdUsuario = rolEncontrado.id;
              this.rolesSeleccionadosPorDefecto = [rolEncontrado.id];
            }
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar página anterior de roles:', error);
          this.snackBar.open('Error al cargar roles', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  /**
   * Actualizar el valor del grupo_id cuando se selecciona un rol
   */
  onRolSelected(event: MatSelectionListChange): void {
    if (event.options.length > 0) {
      const selectedRolId = event.options[0].value;
      this.form.patchValue({ grupo_id: selectedRolId });
    }
  }

  /**
   * Guardar usuario (crear o editar)
   */
  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;

    // Usar getRawValue() para incluir campos deshabilitados (como username en edición)
    const formValues = this.form.getRawValue();
    
    // En edición, no enviar password si está vacío
    let datosUsuario: any = {
      username: formValues.username,
      grupo_id: formValues.grupo_id
    };

    // Email: en edición siempre se envía (permite también vaciarlo)
    // En creación solo si tiene valor
    if (this.isEditMode) {
      datosUsuario.email = formValues.email || '';
    } else if (formValues.email) {
      datosUsuario.email = formValues.email;
    }

    // Solo incluir password si tiene contenido o si es creación
    if (!this.isEditMode || formValues.password) {
      datosUsuario.password = formValues.password;
    }

    if (this.isEditMode) {
      console.log('Datos a enviar para actualizar usuario:', datosUsuario);
      // Editar usuario existente
      const url = this.configService.getApiUrl('usuarios');
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
            console.error('Error al actualizar usuario:', error);
            this.snackBar.open('Error al actualizar el usuario', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      // Crear nuevo usuario
      const url = this.configService.getApiUrl('usuarios');
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
            console.error('Error al crear usuario:', error);
            this.snackBar.open('Error al crear el usuario', 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  /**
   * Cerrar modal sin guardar
   */
  cancelar(): void {
    this.dialogRef.close();
  }
}
