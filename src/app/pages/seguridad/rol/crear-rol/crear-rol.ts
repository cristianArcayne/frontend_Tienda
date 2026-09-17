import { Component, OnInit, OnDestroy, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule, MatSelectionListChange } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Permiso } from '../../../../models/seguridad/permisos.model';
import { CrearRol } from '../../../../models/seguridad/rol.model';

@Component({
  selector: 'app-crear-rol',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './crear-rol.html',
  styleUrl: './crear-rol.scss'
})
export class CrearRolComponent implements OnInit, OnDestroy {
  form: FormGroup;
  permisos: Permiso[] = [];
  seleccionados = new Set<number>();
  busqueda = '';
  isLoading = false;
  isSaving = false;
  isEditMode = false;
  private destroy$ = new Subject<void>();
  @ViewChild('permisosList') permisosList: any;

  get permisosFiltrados(): Permiso[] {
    const term = this.busqueda.toLowerCase().trim();
    if (!term) return this.permisos;
    return this.permisos.filter(p =>
      p.nombre?.toLowerCase().includes(term) || p.codename?.toLowerCase().includes(term)
    );
  }

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CrearRolComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.rol;
    this.form = this.formBuilder.group({
      nombre: [data?.rol?.name || '', [Validators.required, Validators.minLength(3)]]
    });
    // Guardar IDs de permisos seleccionados por defecto si es edición
    if (this.isEditMode && data?.rol?.permisos) {
      this.seleccionados = new Set(data.rol.permisos.map((p: any) => p.id));
    }
  }

  ngOnInit(): void {
    this.cargarPermisos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar permisos disponibles
   */
  private cargarPermisos(): void {
    this.isLoading = true;
    const url = this.configService.getApiUrl('roles/permisos_disponibles');

    this.apiService.getAll<Permiso>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.permisos = data;
          // Los permisos se pre-selectan automáticamente desde el template
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar permisos:', error);
          this.snackBar.open('Error al cargar los permisos', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  /**
   * Guardar rol (crear o editar)
   */
  onSelectionChange(event: MatSelectionListChange): void {
    event.options.forEach(option => {
      if (option.selected) {
        this.seleccionados.add(option.value);
      } else {
        this.seleccionados.delete(option.value);
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const permisosSeleccionados = Array.from(this.seleccionados);

    const datosRol: CrearRol = {
      name: this.form.value.nombre,
      permisos_ids: permisosSeleccionados
    };

    if (this.isEditMode) {
      // Editar rol existente
      const url = this.configService.getApiUrl('roles');
      console.log(
        'Datos a enviar para actualización:', { id: this.data.rol.id, ...datosRol }
    );
      this.apiService.update(url, this.data.rol.id, datosRol)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Rol actualizado exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error al actualizar rol:', error);
            this.snackBar.open('Error al actualizar el rol', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      // Crear nuevo rol
      const url = this.configService.getApiUrl('roles');
      this.apiService.create(url, datosRol)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Rol creado exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error al crear rol:', error);
            this.snackBar.open('Error al crear el rol', 'Cerrar', { duration: 5000 });
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
