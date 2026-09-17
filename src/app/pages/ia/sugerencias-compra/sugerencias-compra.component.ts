import { Component, OnInit, OnDestroy, signal } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';
import { SugerenciaCompra, SugerenciaEstado } from '../../../models/ia/sugerencia-compra.model';
import { Pagination } from '../../../models/pagination.model';
import { GestionarSugerenciaDialogComponent } from './gestionar-sugerencia-dialog/gestionar-sugerencia-dialog';

@Component({
  selector: 'app-sugerencias-compra',
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
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './sugerencias-compra.component.html',
  styleUrl: './sugerencias-compra.component.scss'
})
export class SugerenciasCompraComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly sugerenciasUrl: string;

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;

  cargando = signal(false);
  sugerencias = signal<SugerenciaCompra[]>([]);
  filtroEstado = signal<string>('pendiente');

  columnas: string[] = ['proveedor', 'estado', 'lineas', 'total_estimado', 'fecha_creacion', 'acciones'];

  puedeGestionar = false;

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.sugerenciasUrl = this.configService.getApiUrl('ia/sugerencias-compra');
    this.puedeGestionar = this.permisosService.tiene(PermisosService.IA_CHANGE_SUGERENCIACOMPRA);
  }

  ngOnInit(): void {
    this.cargarSugerencias();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarSugerencias(): void {
    this.cargando.set(true);
    const filters: Record<string, any> = {};
    if (this.filtroEstado()) filters['estado'] = this.filtroEstado();

    this.apiService.getWithPagination<SugerenciaCompra>(this.sugerenciasUrl, this.currentPage + 1, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<SugerenciaCompra>) => {
          this.sugerencias.set(data.results);
          this.totalItems = data.count;
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.snackBar.open('Error al cargar las sugerencias de compra', 'Cerrar', { duration: 3000 });
        }
      });
  }

  onFiltroChange(): void {
    this.currentPage = 0;
    this.cargarSugerencias();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarSugerencias();
  }

  gestionar(sugerencia: SugerenciaCompra): void {
    const ref = this.dialog.open(GestionarSugerenciaDialogComponent, {
      width: '760px',
      maxHeight: '90vh',
      data: { sugerencia }
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((seModifico) => {
        if (seModifico) {
          this.cargarSugerencias();
        }
      });
  }

  estadoLabel(estado: SugerenciaEstado): string {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'aprobada': return 'Aprobada';
      case 'descartada': return 'Descartada';
      default: return estado;
    }
  }

  estadoClass(estado: SugerenciaEstado): string {
    switch (estado) {
      case 'pendiente': return 'chip-warning';
      case 'aprobada': return 'chip-success';
      case 'descartada': return 'chip-danger';
      default: return '';
    }
  }
}