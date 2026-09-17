import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirm: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
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
        next: (data) => {
          this.planes = data.results || [];
          this.aplicarPlanDesdeUrl();
          this.isLoadingPlanes = false;
        },
        error: (error) => {
          console.error('Error al cargar planes:', error);
          this.errorMessage = 'No se pudieron cargar los planes.';
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
          this.snackBar.open('Empresa registrada correctamente', 'OK', { duration: 4000 });

          const dominio = response?.dominio;
          if (dominio) {
            const protocol = window.location.protocol;
            const port = window.location.port ? `:${window.location.port}` : '';
            window.location.href = `${protocol}//${dominio}${port}/login`;
            return;
          }

          this.form.reset({ ciclo: 'mensual' });
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error al registrar empresa:', error);
          this.snackBar.open('No se pudo registrar la empresa', 'Cerrar', { duration: 5000 });
        }
      });
  }
}
