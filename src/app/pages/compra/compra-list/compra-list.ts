import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Compra } from '../../../models/compra/compra.model';
import { CrearCompraDialogComponent } from './crear-compra-dialog/crear-compra-dialog';
import { DetalleCompraDialogComponent } from './detalle-compra-dialog/detalle-compra-dialog';

@Component({
  selector: 'app-compra-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './compra-list.html',
})
export class CompraListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'fecha', 'proveedor', 'total', 'acciones'];
  dataSource: Compra[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  puedeVer = true;
  puedeCrear = false;

  private apiUrl: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.apiUrl = this.configService.getApiUrl('compras');
    this.verificarPermisos();
  }

  ngOnInit(): void {
    if (!this.puedeVer) {
      this.snackBar.open('No tienes permiso para ver compras', 'Cerrar', { duration: 5000 });
      return;
    }
    this.loadCompras();
  }

  private verificarPermisos(): void {
    this.puedeVer = this.permisosService.puedeVerCompra();
    this.puedeCrear = this.permisosService.puedeCrearCompra();
  }

  loadCompras(): void {
    this.isLoading = true;
    this.apiService.getWithPagination<Compra>(
      this.apiUrl,
      this.currentPage + 1,
      this.pageSize
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<Compra>) => {
          this.dataSource = data.results;
          this.totalItems = data.count;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open('Error al cargar las compras', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCompras();
  }

  nuevaCompra(): void {
    if (!this.puedeCrear) {
      this.snackBar.open('No tienes permiso para registrar compras', 'Cerrar', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(CrearCompraDialogComponent, {
      width: '1000px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.currentPage = 0;
          this.loadCompras();
        }
      });
  }

  verDetalle(compra: Compra): void {
    this.dialog.open(DetalleCompraDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: { compra }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
