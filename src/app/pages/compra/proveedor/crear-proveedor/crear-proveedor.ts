import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Proveedor } from '../../../../models/inventario/proveedor.model';

@Component({
  selector: 'app-crear-proveedor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './crear-proveedor.html',
  styleUrls: ['./crear-proveedor.scss']
})
export class CrearProveedorComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSaving = false;
  isEditMode = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CrearProveedorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.proveedor;

    this.form = this.formBuilder.group({
      nombre: [
        data?.proveedor?.nombre || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(200)]
      ],
      direccion: [
        data?.proveedor?.direccion || '',
        [Validators.maxLength(500)]
      ],
      telefono: [
        data?.proveedor?.telefono || '',
        [Validators.maxLength(50)]
      ]
    });
  }

  ngOnInit(): void {
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValues = this.form.value;
    const url = this.configService.getApiUrl('proveedores');

    if (this.isEditMode) {
      this.apiService.update(url, this.data.proveedor.id, formValues)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Proveedor actualizado exitosamente', 'OK', { duration: 3000 });
            this.cdr.markForCheck();
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            this.snackBar.open('Error al actualizar el proveedor', 'Cerrar', { duration: 5000 });
            this.cdr.markForCheck();
          }
        });
    } else {
      this.apiService.create(url, formValues)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Proveedor creado exitosamente', 'OK', { duration: 3000 });
            this.cdr.markForCheck();
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            this.snackBar.open('Error al crear el proveedor', 'Cerrar', { duration: 5000 });
            this.cdr.markForCheck();
          }
        });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
