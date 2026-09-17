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
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-crear-variante',
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
  templateUrl: './crear-variante.html',
  styleUrl: './crear-variante.scss'
})
export class CrearVarianteComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSaving = false;
  isEditMode = false;
  private isClienteRole = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    public dialogRef: MatDialogRef<CrearVarianteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.variante;
    this.isClienteRole = this.calcularEsCliente();

    this.form = this.formBuilder.group({
      sku: [data?.variante?.sku || '', [Validators.required, Validators.maxLength(100)]],
      precio: [data?.variante?.precio || '', [Validators.required, Validators.min(0)]],
      cantidad: [data?.variante?.cantidad || 0, [Validators.required, Validators.min(0)]],
      costo_ponderado: [data?.variante?.costo_ponderado || '', [Validators.required, Validators.min(0)]],
      limite_cantidad: [data?.variante?.limite_cantidad || 0, [Validators.required, Validators.min(0)]]
    });

    if (this.isClienteRole) {
      this.removerValidacionesCostos();
    }
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isCliente(): boolean {
    return this.isClienteRole;
  }

  private calcularEsCliente(): boolean {
    if (this.authService.isSuperuser()) {
      return false;
    }

    const roles = this.authService.getRoles();
    return roles.length === 1 && roles[0]?.toLowerCase() === 'cliente';
  }

  private removerValidacionesCostos(): void {
    const costoControl = this.form.get('costo_ponderado');
    const limiteControl = this.form.get('limite_cantidad');

    if (costoControl) {
      costoControl.clearValidators();
      if (costoControl.value === null || costoControl.value === '') {
        costoControl.setValue(0);
      }
      costoControl.updateValueAndValidity();
    }

    if (limiteControl) {
      limiteControl.clearValidators();
      if (limiteControl.value === null || limiteControl.value === '') {
        limiteControl.setValue(0);
      }
      limiteControl.updateValueAndValidity();
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValues = this.form.value;
    const url = this.configService.getApiUrl('variantes');

    const varianteData = {
      sku: formValues.sku,
      precio: Number(formValues.precio),
      cantidad: Number(formValues.cantidad),
      costo_ponderado: Number(formValues.costo_ponderado),
      limite_cantidad: Number(formValues.limite_cantidad),
      producto_id: Number(this.data.producto_id)
    };

    if (this.isEditMode) {
      this.apiService.update(url, this.data.variante.id, varianteData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.snackBar.open('Variante actualizada exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error updating variante:', err);
            this.snackBar.open('Error al actualizar la variante', 'Cerrar', { duration: 5000 });
          }
        });
    } else {
      this.apiService.create(url, varianteData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving = false;
            this.snackBar.open('Variante creada exitosamente', 'OK', { duration: 3000 });
            this.dialogRef.close(response);
          },
          error: (err) => {
            this.isSaving = false;
            console.error('Error creating variante:', err);
            this.snackBar.open('Error al crear la variante', 'Cerrar', { duration: 5000 });
          }
        });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
