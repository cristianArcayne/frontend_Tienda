import { Component, OnDestroy, Inject } from '@angular/core';
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
import { Marca } from '../../../../models/inventario/marca.model';

@Component({
  selector: 'app-eliminar-marca',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './eliminar-marca.html',
  styleUrl: './eliminar-marca.scss'
})
export class EliminarMarcaComponent implements OnDestroy {
  isDeleting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EliminarMarcaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { marca: Marca }
  ) {}

  confirmarEliminacion(): void {
    this.isDeleting = true;
    const url = this.configService.getApiUrl('marcas');

    this.apiService.delete(url, this.data.marca.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.snackBar.open('Marca eliminada exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isDeleting = false;
          console.error('Error al eliminar marca:', error);
          this.snackBar.open('Error al eliminar la marca', 'Cerrar', { duration: 5000 });
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
