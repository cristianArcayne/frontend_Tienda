import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { AlertasRefreshService } from '../../../services/alertas-refresh.service';
import { Prediccion } from '../../../models/ia/prediccion-ia.model';
import { Pagination } from '../../../models/pagination.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-prediccion-ia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './prediccion-ia.component.html',
  styleUrl: './prediccion-ia.component.scss'
})
export class PrediccionIaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly prediccionUrl: string;

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;

  cargando = signal(false);
  haCargado = signal(false);
  predicciones = signal<Prediccion[]>([]);
  soloAlerta = signal(false);
  fechaHasta = signal<Date | null>(null);

  conAlerta = computed(() => this.predicciones().filter(p => p.alerta).length);
  sinAlerta = computed(() => this.predicciones().filter(p => !p.alerta).length);

  readonly hoy = new Date();
  columnas = ['categoria', 'producto', 'sku', 'stock_actual', 'limite_minimo', 'demanda_proyectada', 'deficit', 'alerta'];

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private alertasRefreshService: AlertasRefreshService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.prediccionUrl = this.configService.getApiUrl('ia/prediccion-detalle');
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarPrediccion(): void {
    this.cargando.set(true);
    const filters: Record<string, any> = {};
    const fecha = this.fechaHasta();
    if (fecha) filters['fecha_hasta'] = this.formatearFecha(fecha);
    if (this.soloAlerta()) filters['solo_alerta'] = 'true';

    this.apiService.getWithPagination<Prediccion>(
      this.prediccionUrl,
      this.currentPage + 1,
      this.pageSize,
      filters
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Prediccion>) => {
          this.predicciones.set(data.results);
          this.totalItems = data.count;
          this.haCargado.set(true);
          this.cargando.set(false);
          this.alertasRefreshService.emitirRefresh();
          const conAlerta = data.results.filter(p => p.alerta).length;
          if (conAlerta > 0) {
            const ref = this.snackBar.open(
              `${conAlerta} variante${conAlerta > 1 ? 's' : ''} con alerta de reabastecimiento`,
              'Ver alertas',
              { duration: 8000, panelClass: 'snack-alerta' }
            );
            ref.onAction().subscribe(() => this.router.navigate(['/ia/alertas']));
          }
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error al cargar las predicciones', 'Cerrar', { duration: 3000 });
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarPrediccion();
  }

  onFechaChange(date: Date | null): void {
    if (date) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (date < hoy) {
        this.snackBar.open('Selecciona una fecha actual o futura', 'Cerrar', { duration: 3000 });
        return;
      }
    }
    this.fechaHasta.set(date);
    if (this.haCargado()) {
      this.currentPage = 0;
      this.cargarPrediccion();
    }
  }

  onToggleAlerta(checked: boolean): void {
    this.soloAlerta.set(checked);
    if (this.haCargado()) {
      this.currentPage = 0;
      this.cargarPrediccion();
    }
  }

  private formatearFecha(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
