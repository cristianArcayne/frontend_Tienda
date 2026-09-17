import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';
import { Plan } from '../../../models/empresa/plan.model';
import { Suscripcion, SuscripcionCambio } from '../../../models/empresa/suscripcion.model';
import { Pagination } from '../../../models/pagination.model';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { RenovarDialogComponent } from './renovar-dialog/renovar-dialog.component';
import { CancelarDialogComponent } from './cancelar-dialog/cancelar-dialog.component';

@Component({
  selector: 'app-suscripcion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatPaginatorModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule, MatCheckboxModule, MatDividerModule, MatDialogModule
  ],
  templateUrl: './suscripcion.component.html',
  styleUrl: './suscripcion.component.scss'
})
export class SuscripcionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly suscripcionesUrl: string;
  private readonly cambiosUrl: string;

  cargando = signal(false);
  suscripcion = signal<Suscripcion | null>(null);
  planActual = signal<Plan | null>(null);
  cambios = signal<SuscripcionCambio[]>([]);
  totalCambios = 0;
  paginaCambios = 0;
  planMap = new Map<number, string>();

  columnasCambios = ['fecha', 'plan_anterior', 'plan_nuevo', 'motivo'];

  diasRestantes = computed(() => {
    const s = this.suscripcion();
    if (!s?.fecha_fin) return null;
    const fin = new Date(s.fecha_fin);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
  });

  estadoConfig = computed(() => {
    const estado = this.suscripcion()?.estado ?? 'expirada';
    const map: Record<string, { color: string; bg: string; label: string }> = {
      activa:   { color: '#2e7d32', bg: '#e8f5e9', label: 'Activa' },
      trial:    { color: '#1565c0', bg: '#e3f2fd', label: 'Trial' },
      pausada:  { color: '#e65100', bg: '#fff3e0', label: 'Pausada' },
      cancelada:{ color: '#c62828', bg: '#ffebee', label: 'Cancelada' },
      expirada: { color: '#616161', bg: '#f5f5f5', label: 'Expirada' },
    };
    return map[estado] ?? map['expirada'];
  });

  puedeCambiar = false;

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.puedeCambiar = this.permisosService.tiene(PermisosService.SEGURIDAD_CHANGE_MI_SUSCRIPCION);
    this.suscripcionesUrl = this.configService.getApiUrl('suscripciones');
    this.cambiosUrl = this.configService.getApiUrl('suscripcion-cambios');
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
      suscripciones: this.apiService.getWithPagination<Suscripcion>(this.suscripcionesUrl, 1, 10),
      planes: this.apiService.getWithPagination<Plan>(this.configService.getApiUrl('planes'), 1, 100)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ suscripciones, planes }) => {
          const activa = suscripciones.results.find(s => s.estado === 'activa' || s.estado === 'trial')
            ?? suscripciones.results[0] ?? null;
          this.suscripcion.set(activa);

          planes.results.forEach(p => this.planMap.set(p.id, p.nombre));
          if (activa) {
            this.planActual.set(planes.results.find(p => p.id === activa.plan) ?? null);
            this.cargarHistorial(activa.id, 0);
          }
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error al cargar la suscripción', 'Cerrar', { duration: 3000 });
        }
      });
  }

  cargarHistorial(suscripcionId: number, pagina: number): void {
    const url = `${this.cambiosUrl}?suscripcion_id=${suscripcionId}&page=${pagina + 1}&page_size=5`;
    this.http.get<Pagination<SuscripcionCambio>>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cambios.set(data.results);
          this.totalCambios = data.count;
        },
        error: () => {}
      });
  }

  onPageCambios(event: PageEvent): void {
    this.paginaCambios = event.pageIndex;
    const s = this.suscripcion();
    if (s) this.cargarHistorial(s.id, event.pageIndex);
  }

  toggleAutoRenovar(checked: boolean): void {
    const s = this.suscripcion();
    if (!s) return;
    this.apiService.patch<Suscripcion>(this.suscripcionesUrl, s.id, { auto_renovar: checked })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.suscripcion.set(updated);
          this.snackBar.open(
            checked ? 'Auto-renovación activada' : 'Auto-renovación desactivada',
            'Cerrar', { duration: 2500 }
          );
        },
        error: () => this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 })
      });
  }

  abrirRenovar(): void {
    const s = this.suscripcion();
    const p = this.planActual();
    if (!s || !p) return;
    const ref = this.dialog.open(RenovarDialogComponent, {
      width: '420px',
      panelClass: 'dialog-acciones',
      data: { suscripcion: s, plan: p }
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return;
      const url = `${this.suscripcionesUrl}${s.id}/renovar/`;
      this.http.post<Suscripcion>(url, { motivo: result.motivo })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.suscripcion.set(updated);
            this.snackBar.open('Suscripción renovada correctamente', 'Cerrar', { duration: 4000 });
            this.cargarHistorial(s.id, 0);
          },
          error: () => this.snackBar.open('Error al renovar', 'Cerrar', { duration: 3000 })
        });
    });
  }

  abrirCancelar(): void {
    const s = this.suscripcion();
    if (!s) return;
    const ref = this.dialog.open(CancelarDialogComponent, { width: '440px', panelClass: 'dialog-acciones' });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (!result) return;
      const url = `${this.suscripcionesUrl}${s.id}/cancelar/`;
      this.http.post<Suscripcion>(url, result)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.suscripcion.set(updated);
            this.snackBar.open('Suscripción cancelada', 'Cerrar', { duration: 4000 });
            this.cargarHistorial(s.id, 0);
          },
          error: () => this.snackBar.open('Error al cancelar', 'Cerrar', { duration: 3000 })
        });
    });
  }

  irCambiarPlan(): void {
    this.router.navigate(['/suscripcion/cambiar-plan']);
  }

  nombrePlan(id: number): string {
    return this.planMap.get(id) ?? `Plan #${id}`;
  }
}
