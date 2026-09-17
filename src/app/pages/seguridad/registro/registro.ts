import { Component, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

function passwordSegura(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (!v) return null;
  const errors: ValidationErrors = {};
  if (v.length < 8)          errors['minlength']   = true;
  if (!/[a-z]/.test(v))      errors['noLowercase'] = true;
  if (!/[A-Z]/.test(v))      errors['noUppercase'] = true;
  if (!/[0-9]/.test(v))      errors['noNumber']    = true;
  if (!/[^a-zA-Z0-9]/.test(v)) errors['noSymbol'] = true;
  return Object.keys(errors).length ? errors : null;
}
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../services/config.service';
import { RegistrarCliente } from '../../../models/seguridad/Usuario.model';

@Component({
  selector: 'app-registro',
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
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class RegistroComponent implements OnDestroy {
  tenantName: string = '';
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;

  form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    apellido: new FormControl('', [Validators.required]),
    fecha_nacimiento: new FormControl<Date | null>(null, [Validators.required]),
    email: new FormControl('', [Validators.email]),
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl('', [Validators.required, passwordSegura]),
    confirmPassword: new FormControl('', [Validators.required, passwordSegura]),
  });

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private http: HttpClient
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

  get passwordReqs() {
    const v = this.f['password']?.value || '';
    return {
      length:    v.length >= 8,
      lowercase: /[a-z]/.test(v),
      uppercase: /[A-Z]/.test(v),
      number:    /[0-9]/.test(v),
      symbol:    /[^a-zA-Z0-9]/.test(v),
    };
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  submit(): void {
    if (this.form.invalid) return;

    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.snackBar.open('Las contraseñas no coinciden', 'Cerrar', { duration: 5000 });
      return;
    }

    this.isLoading = true;

    const fecha = this.form.value.fecha_nacimiento;
    const fechaStr = fecha instanceof Date
      ? fecha.toISOString().split('T')[0]
      : '';

    const url = this.configService.getApiUrl('usuarios/registrar_cliente');
    const body: RegistrarCliente = {
      username: this.form.value.username || '',
      password: this.form.value.password || '',
      nombre: this.form.value.nombre || '',
      apellido: this.form.value.apellido || '',
      fecha_nacimiento: fechaStr,
      ...(this.form.value.email ? { email: this.form.value.email } : {}),
    };

    this.http.post<RegistrarCliente>(url, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open('¡Cuenta creada! Ya podés iniciar sesión.', 'Cerrar', { duration: 4000 });
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.error || err.error?.detail || 'Error al crear la cuenta';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
        },
      });
  }
}
