import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Rol } from '../../../../models/seguridad/rol.model';

@Component({
  selector: 'app-eliminar-rol',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './eliminar-rol.html',
  styleUrl: './eliminar-rol.scss'
})
export class EliminarRolComponent implements OnInit, OnDestroy {
  isDeleting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EliminarRolComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rol: Rol }
  ) {}

  ngOnInit(): void {}

  /**
   * Eliminar el rol confirmado
   */
  confirmarEliminacion(): void {
    this.isDeleting = true;
    const url = this.configService.getApiUrl(`roles`);

    this.apiService.delete(url, this.data.rol.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.snackBar.open('Rol eliminado exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isDeleting = false;
          console.error('Error al eliminar rol:', error);
          this.snackBar.open('Error al eliminar el rol', 'Cerrar', { duration: 5000 });
        }
      });
  }

  /**
   * Cancelar eliminación
   */
  cancelar(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
