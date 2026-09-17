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
import { Categoria } from '../../../../models/inventario/categoria.model';

@Component({
  selector: 'app-eliminar-categoria',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './eliminar-categoria.html',
  styleUrl: './eliminar-categoria.scss'
})
export class EliminarCategoriaComponent implements OnDestroy {
  isDeleting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EliminarCategoriaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { categoria: Categoria }
  ) {}

  confirmarEliminacion(): void {
    this.isDeleting = true;
    const url = this.configService.getApiUrl('categorias');

    this.apiService.delete(url, this.data.categoria.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.snackBar.open('Categoría eliminada exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isDeleting = false;
          console.error('Error al eliminar categoría:', error);
          this.snackBar.open('Error al eliminar la categoría', 'Cerrar', { duration: 5000 });
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