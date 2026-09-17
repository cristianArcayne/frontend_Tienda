import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { Venta } from '../../../models/venta/venta.model';

@Component({
  selector: 'app-eliminar-venta',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './eliminar-venta.html',
})
export class EliminarVentaComponent implements OnDestroy {
  isDeleting = false;

  private apiUrl: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EliminarVentaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { venta: Venta }
  ) {
    this.apiUrl = this.configService.getApiUrl('ventas');
  }

  confirmar(): void {
    this.isDeleting = true;
    this.apiService.delete<Venta>(this.apiUrl, this.data.venta.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Venta eliminada exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.snackBar.open('Error al eliminar la venta', 'Cerrar', { duration: 5000 });
          this.isDeleting = false;
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
