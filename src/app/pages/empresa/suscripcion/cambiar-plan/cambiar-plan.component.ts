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
    private snackBar: MatSnackBar
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
    forkJoin({
      planes: this.apiService.getWithPagination<Plan>(this.planesUrl, 1, 100, { activos: 'true' }),
      suscripciones: this.apiService.getWithPagination<Suscripcion>(this.suscripcionesUrl, 1, 10)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ planes, suscripciones }) => {
          this.planes.set(planes.results);
          const activa = suscripciones.results
            .find(s => s.estado === 'activa' || s.estado === 'trial');
          if (activa) {
            this.suscripcionActual.set(activa);
            this.cicloSeleccionado = activa.ciclo;
          }
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
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
      ciclo: this.cicloSeleccionado
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.snackBar.open(`Plan cambiado a ${plan.nombre} correctamente`, 'Cerrar', { duration: 4000 });
          this.router.navigate(['/suscripcion']);
        },
        error: () => {
          this.guardando.set(false);
          this.snackBar.open('Error al cambiar el plan', 'Cerrar', { duration: 3000 });
        }
      });
  }

  volver(): void {
    this.router.navigate(['/suscripcion']);
  }
}
