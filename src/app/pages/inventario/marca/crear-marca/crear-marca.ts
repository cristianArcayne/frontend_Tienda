import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'app-crear-marca',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './crear-marca.html',
  styleUrl: './crear-marca.scss'
})
export class CrearMarcaComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSaving = false;
  isEditMode = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CrearMarcaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.marca;
    this.form = this.formBuilder.group({
      nombre: [
        data?.marca?.nombre || '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)]
      ]
    });
  }

  ngOnInit(): void {}

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
    const url = this.configService.getApiUrl('marcas');

    if (this.isEditMode) {
      this.apiService.update(url, this.data.marca.id, formValues)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Marca actualizada exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error al actualizar marca:', error);
            this.snackBar.open('Error al actualizar la marca', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      this.apiService.create(url, formValues)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Marca creada exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (error) => {
            this.isSaving = false;
            console.error('Error al crear marca:', error);
            this.snackBar.open('Error al crear la marca', 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
