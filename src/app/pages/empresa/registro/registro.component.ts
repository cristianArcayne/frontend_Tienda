import { AuthService } from 'src/app/services/auth.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { Plan } from 'src/app/models/empresa/plan.model';
import { EmpresaRegistroPayload } from 'src/app/models/empresa/empresa-registro.model';

@Component({
  selector: 'app-empresa-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class EmpresaRegistroComponent implements OnInit {
  planes: Plan[] = [];
  isLoadingPlanes = false;
  isSubmitting = false;
  errorMessage = '';

  form: FormGroup = this.formBuilder.group({
    plan: [null, Validators.required],
    ciclo: ['mensual', Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correo: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    password_confirm: ['', [Validators.required, Validators.minLength(6)]],
    metodo_pago: ['tarjeta'],
    titular: [''],
    tarjeta_numero: [''],
    tarjeta_exp: [''],
    tarjeta_cvc: ['']
  });

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.isLoadingPlanes = true;
    this.errorMessage = '';
    const url = this.configService.getApiUrl('planes');

    this.apiService.getWithPagination<Plan>(url, 1, 100, { activos: 1 })
      .subscribe({
        next: (data: any) => {
          this.planes = data.results || (Array.isArray(data) ? data : []);
          this.aplicarPlanDesdeUrl();
          if (!this.form.get('plan')?.value && this.planes.length > 0) {
            this.form.patchValue({ plan: this.planes[0].id });
          }
          this.isLoadingPlanes = false;
        },
        error: (error) => {
          console.error('Error al cargar planes desde API, usando definicion de catalogo:', error);
          this.planes = [
            {
              id: 1,
              codigo: 'BASICO',
              nombre: 'Plan Básico',
              descripcion: 'Plan para boutiques emergentes: hasta 2 sucursales, ventas POS, vestidor virtual AR y reservas.',
              precio_mensual: 99.0,
              precio_anual: 990.0,
              limite_sucursales: 2,
              limite_usuarios: 5,
              soporta_ia: false,
              soporta_offline: true,
              activo: true
            },
            {
              id: 2,
              codigo: 'PROFESIONAL',
              nombre: 'Plan Profesional',
              descripcion: 'Plan empresarial: hasta 10 sucursales, Reportes por Voz con IA, Analítica ML y Restore.',
              precio_mensual: 299.0,
              precio_anual: 2990.0,
              limite_sucursales: 10,
              limite_usuarios: 25,
              soporta_ia: true,
              soporta_offline: true,
              activo: true
            }
          ];
          this.form.patchValue({ plan: 1 });
          this.isLoadingPlanes = false;
        }
      });
  }

  getPlanSeleccionado(): Plan | undefined {
    const planId = this.form.get('plan')?.value;
    return this.planes.find((plan) => plan.id === planId);
  }

  private aplicarPlanDesdeUrl(): void {
    const planParam = this.route.snapshot.queryParamMap.get('plan');
    if (!planParam) {
      return;
    }

    const planId = Number(planParam);
    if (Number.isNaN(planId)) {
      return;
    }

    const existePlan = this.planes.some((plan) => plan.id === planId);
    if (existePlan) {
      this.form.patchValue({ plan: planId });
    }
  }

  getPrecio(plan: Plan, ciclo: 'mensual' | 'anual'): number {
    return ciclo === 'mensual' ? plan.precio_mensual : plan.precio_anual;
  }

  esPlanGratis(): boolean {
    const plan = this.getPlanSeleccionado();
    if (!plan) {
      return false;
    }
    const ciclo = this.form.get('ciclo')?.value;
    const precio = ciclo === 'anual' ? plan.precio_anual : plan.precio_mensual;
    return precio === 0;
  }

  getPrecioActual(): number {
    const plan = this.getPlanSeleccionado();
    if (!plan) return 0;
    const ciclo = this.form.get('ciclo')?.value || 'mensual';
    return ciclo === 'anual' ? plan.precio_anual : plan.precio_mensual;
  }

  registrarEmpresa(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.form.value.password !== this.form.value.password_confirm) {
      this.snackBar.open('Las contraseñas no coinciden', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const url = this.configService.getApiUrl('empresas/registrar');

    const payload: EmpresaRegistroPayload = {
      nombre: this.form.value.nombre,
      correo: this.form.value.correo,
      plan: this.form.value.plan,
      ciclo: this.form.value.ciclo,
      metodo_pago: this.form.value.metodo_pago || 'tarjeta',
      tarjeta_numero: this.form.value.tarjeta_numero || '4242424242424242',
      tarjeta_exp: this.form.value.tarjeta_exp || '12/28',
      tarjeta_cvc: this.form.value.tarjeta_cvc || '123',
      titular: this.form.value.titular || this.form.value.nombre,
      super_admin: {
        username: this.form.value.username,
        email: this.form.value.email,
        password: this.form.value.password,
        password_confirm: this.form.value.password_confirm
      }
    };

    this.apiService.create(url, payload)
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          let msg = response?.mensaje || '¡Empresa registrada exitosamente!';
          if (response?.pago) {
            msg = `¡Pago de $${response.pago.monto} procesado exitosamente vía ${response.pago.metodo}! ${msg}`;
          }
          const isAuth = this.authService.isAuthenticated();
          const targetUrl = isAuth ? '/superadmin/panel' : '/login';
          const targetMsg = isAuth ? `${msg} Redirigiendo al panel de empresas...` : `${msg} Redirigiendo al login...`;
          this.snackBar.open(targetMsg, 'OK', { duration: 3500 });

          setTimeout(() => {
            this.router.navigate([targetUrl]);
          }, 1500);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error al registrar empresa:', error);
          const errorMsg = error.error?.detail || 'No se pudo registrar la empresa.';
          this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        }
      });
  }
}
