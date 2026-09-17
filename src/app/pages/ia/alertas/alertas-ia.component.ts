import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';
import { AlertasRefreshService } from '../../../services/alertas-refresh.service';
import { AlertaIa, AlertaTipo } from '../../../models/ia/alerta-ia.model';
import { Pagination } from '../../../models/pagination.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-alertas-ia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatChipsModule
  ],
  templateUrl: './alertas-ia.component.html',
  styleUrl: './alertas-ia.component.scss'
})
export class AlertasIaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly alertasUrl: string;

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;

  cargando = signal(false);
  alertas = signal<AlertaIa[]>([]);
  filtroTipo = signal<string>('');
  filtroLeida = signal<string>('');

  noLeidas = computed(() => this.alertas().filter(a => !a.leida).length);

  columnas: string[] = ['tipo', 'producto', 'categoria', 'sku', 'stock_actual', 'limite_minimo', 'deficit', 'fecha'];

  puedeEditar = false;

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private alertasRefreshService: AlertasRefreshService,
    private snackBar: MatSnackBar
  ) {
    this.alertasUrl = this.configService.getApiUrl('ia/alertas');
    this.puedeEditar = this.permisosService.tiene(PermisosService.IA_CHANGE_ALERTA);
    if (this.puedeEditar) {
      this.columnas = [...this.columnas, 'acciones'];
    }
  }

  ngOnInit(): void {
    this.cargarAlertas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarAlertas(): void {
    this.cargando.set(true);
    const filters: Record<string, any> = {};
    if (this.filtroTipo()) filters['tipo'] = this.filtroTipo();
    if (this.filtroLeida() !== '') filters['leida'] = this.filtroLeida();

    this.apiService.getWithPagination<AlertaIa>(this.alertasUrl, this.currentPage + 1, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<AlertaIa>) => {
          this.alertas.set(data.results);
          this.totalItems = data.count;
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error al cargar las alertas', 'Cerrar', { duration: 3000 });
        }
      });
  }

  onFiltroChange(): void {
    this.currentPage = 0;
    this.cargarAlertas();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarAlertas();
  }

  marcarLeida(alerta: AlertaIa): void {
    if (alerta.leida) return;
    const url = `${this.configService.getApiBaseUrl()}/ia/alertas/${alerta.id}/marcar-leida/`;
    this.http.patch<AlertaIa>(url, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertas.update(list => list.map(a => a.id === alerta.id ? { ...a, leida: true } : a));
          this.alertasRefreshService.emitirRefresh();
          this.snackBar.open('Alerta marcada como leída', 'Cerrar', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Error al marcar la alerta', 'Cerrar', { duration: 3000 });
        }
      });
  }

  marcarTodasLeidas(): void {
    const url = `${this.configService.getApiBaseUrl()}/ia/alertas/marcar-todas-leidas/`;
    this.http.patch(url, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertasRefreshService.emitirRefresh();
          this.currentPage = 0;
          this.cargarAlertas();
          this.snackBar.open('Todas las alertas marcadas como leídas', 'Cerrar', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('Error al marcar las alertas', 'Cerrar', { duration: 3000 });
        }
      });
  }

  tipoLabel(tipo: AlertaTipo): string {
    return tipo === 'stock_bajo' ? 'Stock Bajo' : 'Demanda Alta';
  }

  tipoClass(tipo: AlertaTipo): string {
    return tipo === 'stock_bajo' ? 'chip-danger' : 'chip-warning';
  }
}
