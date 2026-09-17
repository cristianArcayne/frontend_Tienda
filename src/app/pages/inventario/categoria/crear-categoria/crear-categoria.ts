import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { Subject, takeUntil } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Categoria } from '../../../../models/inventario/categoria.model';

@Component({
  selector: 'app-crear-categoria',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './crear-categoria.html',
  styleUrl: './crear-categoria.scss'
})
export class CrearCategoriaComponent implements OnInit, OnDestroy {
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
    public dialogRef: MatDialogRef<CrearCategoriaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.categoria;
    
    this.form = this.formBuilder.group({
      nombre: [
        data?.categoria?.nombre || '', 
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ]
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValues = this.form.value;
    const url = this.configService.getApiUrl('categorias');

    if (this.isEditMode) {
      this.apiService.update(url, this.data.categoria.id, formValues)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Categoría actualizada exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error al actualizar categoría:', error);
            this.snackBar.open('Error al actualizar la categoría', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      this.apiService.create(url, formValues)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Categoría creada exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error al crear categoría:', error);
            this.snackBar.open('Error al crear la categoría', 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}