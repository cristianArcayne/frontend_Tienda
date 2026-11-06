import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';

@Component({
  selector: 'app-registrar-empresa-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './registrar-empresa-modal.html',
  styleUrls: ['./registrar-empresa-modal.scss'],
})
export class RegistrarEmpresaModal {
  isSubmitting = false;

  form: FormGroup = this.fb.group({
    plan: [1, Validators.required],
    ciclo: ['mensual', Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['password123', [Validators.required, Validators.minLength(6)]],
    metodo_pago: ['tarjeta'],
    tarjeta_numero: ['4242424242424242'],
    tarjeta_exp: ['12/28'],
    tarjeta_cvc: ['123'],
  });

  constructor(
    public dialogRef: MatDialogRef<RegistrarEmpresaModal>,
    private fb: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {}

  registrarEmpresa(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const base = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
    const url = `${base}/empresas/registrar`;

    const val = this.form.value;
    const payload = {
      nombre: val.nombre,
      correo: val.correo,
      plan: val.plan,
      ciclo: val.ciclo,
      metodo_pago: 'tarjeta',
      tarjeta_numero: val.tarjeta_numero || '4242424242424242',
      tarjeta_exp: val.tarjeta_exp || '12/28',
      tarjeta_cvc: val.tarjeta_cvc || '123',
      titular: val.nombre,
      super_admin: {
        username: val.username,
        email: val.email,
        password: val.password,
        password_confirm: val.password
      }
    };

    this.apiService.create(url, payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        const msg = res?.mensaje || `¡Empresa '${val.nombre}' registrada y activada exitosamente con Stripe!`;
        this.snackBar.open(msg, 'OK', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Error al registrar empresa:', err);
        const errorMsg = err.error?.detail || err.error?.mensaje || 'Error al registrar empresa en la plataforma.';
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
      }
    });
  }
}

