import { Component, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../services/config.service';
import { AuthService } from '../../../services/auth.service';

import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-autenticacion',
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
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './autenticacion.html',
  styleUrl: './autenticacion.scss',
})
export class Autenticacion implements OnDestroy {
  tenantName: string = '';
  hidePassword = true;
  isLoading = false;

  form = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private configService: ConfigService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.tenantName = this.formatTenantName();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private formatTenantName(): string {
    const tenant = this.configService.getCurrentTenant();
    if (!tenant) return '[Desarrollo Local]';
    return tenant
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  submit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;

    const credentials = {
      username: this.form.value.username || '',
      password: this.form.value.password || '',
    };

    this.authService.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackBar.open(`¡Bienvenido ${response.username}!`, 'Cerrar', { duration: 3000 });
          setTimeout(() => {
            const esClienteUnico = this.isClienteOnly(response.roles, response.is_superuser);
            const destino = esClienteUnico ? '/extra/catalogo' : '/';
            this.router.navigate([destino]);
          }, 500);
        },
        error: (error) => {
          this.isLoading = false;
          const errorMessage = error.error?.detail || 'Error al iniciar sesión';
          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  private isClienteOnly(roles?: string[], isSuperuser?: boolean): boolean {
    if (isSuperuser) return false;
    if (!roles || roles.length !== 1) return false;
    return roles[0]?.toLowerCase() === 'cliente';
  }
}
