import { Component, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Proveedor } from '../../../../models/inventario/proveedor.model';

@Component({
  selector: 'app-eliminar-proveedor',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './eliminar-proveedor.html',
  styleUrls: ['./eliminar-proveedor.scss']
})
export class EliminarProveedorComponent implements OnDestroy {
  isDeleting = false;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<EliminarProveedorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { proveedor: Proveedor }
  ) {}

  confirmarEliminacion(): void {
    this.isDeleting = true;
    this.errorMessage = null;
    const url = this.configService.getApiUrl('proveedores');

    this.apiService.delete(url, this.data.proveedor.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.snackBar.open('Proveedor eliminado exitosamente', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isDeleting = false;
          const msg = error.error?.detail || error.message || 'Error al eliminar el proveedor. Podría tener compras asociadas.';
          this.errorMessage = msg;
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          this.cdr.markForCheck();
        }
      });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
