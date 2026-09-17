import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-database-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  templateUrl: './database-management.component.html',
  styleUrl: './database-management.component.scss',
})
export class DatabaseManagementComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private http = inject(HttpClient);
  private config = inject(ConfigService);
  private snackBar = inject(MatSnackBar);
  private permisosService = inject(PermisosService);
  private destroy$ = new Subject<void>();

  descargando = false;
  restaurando = false;
  archivoSeleccionado: File | null = null;

  puedeDescargarBackup = this.permisosService.tiene(PermisosService.SEGURIDAD_ADD_BACKUP);
  puedeRestaurar = this.permisosService.tiene(PermisosService.SEGURIDAD_ADD_RESTORE);

  descargarBackup(): void {
    this.descargando = true;
    const url = `${this.config.getApiBaseUrl()}/seguridad/backup/`;

    this.http
      .get(url, { responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const objectUrl = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = `backup_${new Date().toISOString().slice(0, 10)}.dump`;
          anchor.click();
          window.URL.revokeObjectURL(objectUrl);
          this.descargando = false;
          this.snackBar.open('Backup descargado correctamente.', 'Cerrar', { duration: 4000 });
        },
        error: () => {
          this.descargando = false;
          this.snackBar.open('Error al descargar el backup.', 'Cerrar', {
            duration: 5000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  abrirSelectorArchivo(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado = input.files[0];
    }
  }

  confirmarYRestaurar(): void {
    if (!this.archivoSeleccionado) return;

    const confirmado = confirm(
      '⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n' +
      'Esta acción BORRARÁ PERMANENTEMENTE todos los datos actuales de la base de datos ' +
      'y los reemplazará con el contenido del archivo seleccionado.\n\n' +
      'Esta operación NO se puede deshacer.\n\n' +
      '¿Estás completamente seguro de que deseas continuar?'
    );

    if (!confirmado) return;

    this.restaurando = true;
    const url = `${this.config.getApiBaseUrl()}/seguridad/restore/`;
    const formData = new FormData();
    formData.append('backup_file', this.archivoSeleccionado);

    this.http
      .post(url, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.restaurando = false;
          this.archivoSeleccionado = null;
          this.fileInput.nativeElement.value = '';
          this.snackBar.open('Base de datos restaurada exitosamente.', 'Cerrar', {
            duration: 5000,
            panelClass: ['snack-success'],
          });
        },
        error: () => {
          this.restaurando = false;
          this.snackBar.open('Error al restaurar la base de datos.', 'Cerrar', {
            duration: 6000,
            panelClass: ['snack-error'],
          });
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
