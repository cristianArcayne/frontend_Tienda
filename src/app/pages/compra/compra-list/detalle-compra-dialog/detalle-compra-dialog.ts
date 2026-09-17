import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Compra } from '../../../../models/compra/compra.model';
import { DetalleCompra } from '../../../../models/compra/detalle-compra.model';

@Component({
  selector: 'app-detalle-compra-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './detalle-compra-dialog.html',
})
export class DetalleCompraDialogComponent implements OnInit, OnDestroy {
  detalles: DetalleCompra[] = [];
  displayedColumns: string[] = ['producto', 'cantidad', 'costo_unitario', 'subtotal'];
  isLoading = false;

  private apiUrlCompras: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { compra: Compra }
  ) {
    this.apiUrlCompras = this.configService.getApiUrl('compras');
  }

  ngOnInit(): void {
    this.isLoading = true;
    const url = `${this.apiUrlCompras}${this.data.compra.id}/detalles/`;

    this.apiService.getAll<DetalleCompra>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detalles) => {
          this.detalles = detalles;
          this.isLoading = false;
        },
        error: () => {
          this.snackBar.open('Error al cargar el detalle de compra', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
