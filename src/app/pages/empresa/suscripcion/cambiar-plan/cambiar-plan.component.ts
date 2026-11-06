import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { AuthService } from '../../../../services/auth.service';
import { Plan } from '../../../../models/empresa/plan.model';
import { Suscripcion, CicloSuscripcion } from '../../../../models/empresa/suscripcion.model';
import { Subject, takeUntil, forkJoin } from 'rxjs';

@Component({
  selector: 'app-cambiar-plan',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatStepperModule, MatCardModule, MatButtonModule, MatIconModule,
    MatRadioModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './cambiar-plan.component.html',
  styleUrl: './cambiar-plan.component.scss'
})
export class CambiarPlanComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly planesUrl: string;
  private readonly suscripcionesUrl: string;

  cargando = signal(false);
  guardando = signal(false);
  planes = signal<Plan[]>([]);
  suscripcionActual = signal<Suscripcion | null>(null);

  planSeleccionado = signal<Plan | null>(null);
  cicloSeleccionado: CicloSuscripcion = 'mensual';

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.planesUrl = this.configService.getApiUrl('planes');
    this.suscripcionesUrl = this.configService.getApiUrl('suscripciones');
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    const empresaId = this.authService.getEmpresaId();
    const suscFilters: Record<string, any> = {};
    if (empresaId) {
      suscFilters['empresa_id'] = empresaId;
    }

    forkJoin({
      planes: this.apiService.getWithPagination<Plan>(this.planesUrl, 1, 100, { activos: 'true' }),
      suscripciones: this.apiService.getWithPagination<Suscripcion>(this.suscripcionesUrl, 1, 10, suscFilters)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ planes, suscripciones }) => {
          const listPlanes = Array.isArray(planes) ? planes : ((planes as any)?.results || []);
          const listSusc = Array.isArray(suscripciones) ? suscripciones : ((suscripciones as any)?.results || []);

          this.planes.set(listPlanes);
          const activa = listSusc.find((s: any) => {
            const st = (s.estado || '').toLowerCase();
            return st === 'activa' || st === 'trial';
          }) ?? listSusc[0] ?? null;

          if (activa) {
            this.suscripcionActual.set(activa);
            this.cicloSeleccionado = activa.ciclo;
          }
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error al cargar los planes disponibles', 'Cerrar', { duration: 3000 });
        }
      });
  }

  seleccionarPlan(plan: Plan): void {
    this.planSeleccionado.set(plan);
  }

  precioMostrar(plan: Plan): number {
    return this.cicloSeleccionado === 'mensual' ? plan.precio_mensual : plan.precio_anual;
  }

  confirmarCambio(): void {
    const suscripcion = this.suscripcionActual();
    const plan = this.planSeleccionado();
    if (!suscripcion || !plan) return;

    this.guardando.set(true);
    this.apiService.patch<Suscripcion>(this.suscripcionesUrl, suscripcion.id, {
      plan: plan.id,
      ciclo: this.cicloSeleccionado,
      motivo: `Actualización de suscripción a ${plan.nombre}`
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.snackBar.open(`¡Suscripción actualizada exitosamente a ${plan.nombre}!`, 'OK', { duration: 4000 });
          this.router.navigate(['/suscripcion']);
        },
        error: (err) => {
          this.guardando.set(false);
          this.snackBar.open(err?.error?.detail || 'Error al cambiar el plan', 'Cerrar', { duration: 4000 });
        }
      });
  }

  volver(): void {
    this.router.navigate(['/suscripcion']);
  }
}
