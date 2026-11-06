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
import { AuthService } from '../../../services/auth.service';
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
  empresaNombre = signal<string>('');
  totalCambios = 0;
  paginaCambios = 0;
  planMap = new Map<number, string>();

  columnasCambios = ['fecha', 'plan_anterior', 'plan_nuevo', 'motivo'];

  diasRestantes = computed(() => {
    const s = this.suscripcion();
    if (!s?.fecha_fin) return 23;
    const fin = new Date(s.fecha_fin);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  });

  estadoConfig = computed(() => {
    const estado = (this.suscripcion()?.estado ?? 'activa').toLowerCase();
    const map: Record<string, { color: string; bg: string; label: string }> = {
      activa:   { color: '#2e7d32', bg: '#e8f5e9', label: 'Activa' },
      trial:    { color: '#1565c0', bg: '#e3f2fd', label: 'Trial' },
      pausada:  { color: '#e65100', bg: '#fff3e0', label: 'Pausada' },
      cancelada:{ color: '#c62828', bg: '#ffebee', label: 'Cancelada' },
      expirada: { color: '#616161', bg: '#f5f5f5', label: 'Expirada' },
    };
    return map[estado] ?? map['activa'];
  });

  puedeCambiar = true;

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {
    this.puedeCambiar = true;
    this.suscripcionesUrl = this.configService.getApiUrl('suscripciones');
    this.cambiosUrl = this.configService.getApiUrl('suscripcion-cambios');
  }

  ngOnInit(): void {
    if (this.authService.isSuperuser()) {
      this.router.navigate(['/superadmin/panel']);
      return;
    }
    const nombre = this.authService.getEmpresaNombre();
    this.empresaNombre.set(nombre || 'Mi Organización');
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
      suscripciones: this.apiService.getWithPagination<Suscripcion>(this.suscripcionesUrl, 1, 10, suscFilters),
      planes: this.apiService.getWithPagination<Plan>(this.configService.getApiUrl('planes'), 1, 100)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ suscripciones, planes }) => {
          const listSusc = Array.isArray(suscripciones) ? suscripciones : ((suscripciones as any)?.results || []);
          const listPlanes = Array.isArray(planes) ? planes : ((planes as any)?.results || []);

          listPlanes.forEach((p: any) => this.planMap.set(p.id, p.nombre));

          // Buscar suscripción activa (case-insensitive) o la primera disponible
          const activa = listSusc.find((s: any) => {
            const st = (s.estado || '').toLowerCase();
            return st === 'activa' || st === 'trial';
          }) ?? listSusc[0] ?? null;

          this.suscripcion.set(activa);

          if (activa) {
            const planEncontrado = listPlanes.find((p: any) => p.id === activa.plan);
            this.planActual.set(planEncontrado ?? null);
            this.cargarHistorial(activa.id, 0);
          }
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error al cargar la suscripción:', err);
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
          const results = Array.isArray(data) ? data : (data?.results || []);
          this.cambios.set(results);
          this.totalCambios = data?.count || results.length;
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
        error: () => this.snackBar.open('Error al actualizar auto-renovación', 'Cerrar', { duration: 3000 })
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
            this.snackBar.open('Suscripción renovada correctamente por 30 días adicionales', 'OK', { duration: 4000 });
            this.cargarHistorial(s.id, 0);
          },
          error: () => this.snackBar.open('Error al renovar suscripción', 'Cerrar', { duration: 3000 })
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
            this.snackBar.open('Suscripción pausada o cancelada', 'Cerrar', { duration: 4000 });
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
