import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login-superadmin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './login-superadmin.html',
})
export class LoginSuperadmin {
  hidePassword = true;
  isLoading = false;

  form = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.authService
      .login({
        username: this.form.value.username!,
        password: this.form.value.password!,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (!res.is_superuser) {
            this.authService.logout().subscribe();
            this.snackBar.open('Acceso denegado: se requiere superusuario', 'Cerrar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
            return;
          }
          this.router.navigate(['/superadmin/panel']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.detail || 'Usuario o contraseña incorrectos';
          this.snackBar.open(msg, 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }
}