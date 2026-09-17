import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';
import { Pagination } from '../../../models/pagination.model';
import { Venta } from '../../../models/venta/venta.model';
import { EliminarVentaComponent } from '../eliminar-venta/eliminar-venta';

@Component({
  selector: 'app-venta-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './venta-list.html',
})
export class VentaListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'fecha', 'tipo', 'estado', 'usuario', 'precio_total'];
  dataSource: Venta[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  puedeCrear = false;
  puedeEliminar = false;
  puedeVer = true;

  private apiUrl: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.apiUrl = this.configService.getApiUrl('ventas');
    this.verificarPermisos();
  }

  ngOnInit(): void {
    if (!this.puedeVer) {
      this.snackBar.open('No tienes permiso para ver ventas', 'Cerrar', { duration: 5000 });
      return;
    }
    this.loadVentas();
  }

  private verificarPermisos(): void {
    this.puedeVer = this.permisosService.puedeVerVenta();
    this.puedeCrear = this.permisosService.puedeCrearVenta();
    this.puedeEliminar = this.permisosService.puedeEliminarVenta();
    if (this.puedeVer) {
      this.displayedColumns = ['id', 'fecha', 'tipo', 'estado', 'usuario', 'precio_total', 'acciones'];
    }
  }

  loadVentas(): void {
    this.isLoading = true;
    this.apiService.getWithPagination<Venta>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Venta>) => {
          this.dataSource = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open('Error al cargar las ventas', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadVentas();
  }

  nuevaVenta(): void {
    if (!this.puedeCrear) {
      this.snackBar.open('No tienes permiso para crear ventas', 'Cerrar', { duration: 5000 });
      return;
    }
    this.router.navigate(['/ventas/nueva']);
  }

  verDetalle(venta: Venta): void {
    this.router.navigate(['/ventas', venta.id]);
  }

  eliminarVenta(venta: Venta): void {
    if (!this.puedeEliminar) {
      this.snackBar.open('No tienes permiso para eliminar ventas', 'Cerrar', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(EliminarVentaComponent, {
      width: '500px',
      data: { venta }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.currentPage = 0;
          this.loadVentas();
        }
      });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'completado': return 'badge bg-success';
      case 'pendiente': return 'badge bg-warning';
      case 'cancelado': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'presencial': return 'badge bg-info';
      case 'digital': return 'badge bg-primary';
      default: return 'badge bg-secondary';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
