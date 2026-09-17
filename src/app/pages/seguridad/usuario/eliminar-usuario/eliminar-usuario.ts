import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
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
import { Usuario } from '../../../../models/seguridad/Usuario.model';

@Component({
  selector: 'app-eliminar-usuario',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './eliminar-usuario.html',
  styleUrl: './eliminar-usuario.scss'
})
export class EliminarUsuarioComponent implements OnInit, OnDestroy {
  isDeleting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EliminarUsuarioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { usuario: Usuario }
  ) {}

  ngOnInit(): void {}

  /**
   * Eliminar el usuario confirmado
   */
  confirmarEliminacion(): void {
    this.isDeleting = true;
    const url = this.configService.getApiUrl(`usuarios`);

    this.apiService.delete(url, this.data.usuario.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.snackBar.open('Usuario eliminado exitosamente', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isDeleting = false;
          console.error('Error al eliminar usuario:', error);
          this.snackBar.open('Error al eliminar el usuario', 'Cerrar', { duration: 5000 });
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
