import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { RecuperacionService } from '../../../services/recuperacion.service';
import { ConfigService } from '../../../services/config.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatStepperModule,
  ],
  templateUrl: './recuperar-password.component.html',
  styleUrl: './recuperar-password.component.scss',
})
export class RecuperarPasswordComponent {
  tenantName: string = '';

  // Controla el paso actual: 1 = username, 2 = código, 3 = nueva contraseña, 4 = éxito
  paso = 1;
  isLoading = false;

  // Guardamos el username y código entre pasos
  usernameConfirmado = '';
  codigoConfirmado = '';
  // Mensaje del backend con el email enmascarado (ej: "Se envió código a ju****@gmail.com")
  mensajeEnvio = '';

  hidePassword = true;
  hideConfirm = true;

  // Formulario paso 1: username
  formUsername = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });

  // Formulario paso 2: código
  formCodigo = new FormGroup({
    codigo: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(8),
    ]),
  });

  // Formulario paso 3: nueva contraseña
  formPassword = new FormGroup(
    {
      nueva_password: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmar_password: new FormControl('', [Validators.required]),
    },
    { validators: this.passwordsIguales }
  );

  constructor(
    private recuperacionService: RecuperacionService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    const tenant = this.configService.getCurrentTenant();
    this.tenantName = tenant
      ? tenant.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '[Desarrollo Local]';
  }

  // ── Validador personalizado ─────────────────────────────────────────────────
  private passwordsIguales(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('nueva_password')?.value;
    const confirm = group.get('confirmar_password')?.value;
    return pass === confirm ? null : { noCoinciden: true };
  }

  // ── Paso 1: solicitar código ────────────────────────────────────────────────
  solicitarCodigo(): void {
    if (this.formUsername.invalid) return;

    this.isLoading = true;
    const username = this.formUsername.value.username!;

    this.recuperacionService.solicitarRecuperacion(username).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.usernameConfirmado = username;
          this.mensajeEnvio = res.mensaje || 'Código enviado al correo registrado';
          this.paso = 2;
          this.snackBar.open(this.mensajeEnvio, 'Cerrar', { duration: 5000 });
        } else {
          this.snackBar.open(res.error || 'Error al enviar el código', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error || 'Error de conexión';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }

  // ── Paso 2: verificar código ────────────────────────────────────────────────
  verificarCodigo(): void {
    if (this.formCodigo.invalid) return;

    this.isLoading = true;
    const codigo = (this.formCodigo.value.codigo || '').toUpperCase();

    this.recuperacionService.verificarCodigo(this.usernameConfirmado, codigo).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.codigoConfirmado = codigo;
          this.paso = 3;
        } else {
          this.snackBar.open(res.error || 'Código inválido', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error || 'Error de conexión';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }

  // ── Paso 3: cambiar contraseña ──────────────────────────────────────────────
  cambiarPassword(): void {
    if (this.formPassword.invalid) return;

    this.isLoading = true;

    this.recuperacionService
      .cambiarPassword(
        this.usernameConfirmado,
        this.codigoConfirmado,
        this.formPassword.value.nueva_password!
      )
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.success) {
            this.paso = 4;
          } else {
            this.snackBar.open(res.error || 'Error al cambiar la contraseña', 'Cerrar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          }
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.error || 'Error de conexión';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
        },
      });
  }

  // ── Reenviar código ─────────────────────────────────────────────────────────
  reenviarCodigo(): void {
    this.isLoading = true;
    this.recuperacionService.solicitarRecuperacion(this.usernameConfirmado).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.formCodigo.reset();
          this.snackBar.open(res.mensaje || 'Se envió un nuevo código al correo', 'Cerrar', { duration: 5000 });
        } else {
          this.snackBar.open(res.error || 'Error al reenviar el código', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error || 'Error de conexión';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }
}
