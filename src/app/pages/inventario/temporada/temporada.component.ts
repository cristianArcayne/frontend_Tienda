import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface TemporadaItem {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-temporada',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <div class="page-header d-flex justify-content-between align-items-center w-100">
          <div>
            <mat-card-title>Gestión de Temporadas Comerciales</mat-card-title>
            <mat-card-subtitle>Primavera-Verano, Otoño-Invierno, Escolar, Colecciones Especiales</mat-card-subtitle>
          </div>
          <button mat-raised-button color="primary" (click)="abrirFormulario()">
            <mat-icon class="m-r-8">wb_sunny</mat-icon>
            Nueva Temporada
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        <!-- Formulario Inline para Crear/Editar -->
        <div *ngIf="mostrarForm" class="p-16 m-b-16 bg-light-primary rounded" style="border: 1px dashed #1976d2;">
          <h4 class="m-b-12">{{ editandoId ? 'Editar Temporada #' + editandoId : 'Registrar Nueva Temporada' }}</h4>
          <div class="d-flex gap-16 flex-wrap align-items-center">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 260px;">
              <mat-label>Nombre de la Temporada</mat-label>
              <input matInput [(ngModel)]="formData.nombre" placeholder="Ej. Primavera - Verano 2026, Temporada Escolar" required />
            </mat-form-field>

            <div class="d-flex gap-8">
              <button mat-raised-button color="primary" [disabled]="!formData.nombre || guardando" (click)="guardarTemporada()">
                <mat-icon *ngIf="!guardando">check</mat-icon>
                <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
                Guardar
              </button>
              <button mat-button (click)="cancelarFormulario()">Cancelar</button>
            </div>
          </div>
        </div>

        <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="!isLoading && temporadas.length > 0" class="table-responsive">
          <table mat-table [dataSource]="temporadas" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef style="width: 70px;">ID</th>
              <td mat-cell *matCellDef="let element">{{ element.id }}</td>
            </ng-container>

            <ng-container matColumnDef="icono">
              <th mat-header-cell *matHeaderCellDef style="width: 60px;"></th>
              <td mat-cell *matCellDef="let element">
                <mat-icon [style.color]="getIconColor(element.nombre)">{{ getSeasonIcon(element.nombre) }}</mat-icon>
              </td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre de Temporada / Colección</th>
              <td mat-cell *matCellDef="let element">
                <strong style="font-size: 15px;">{{ element.nombre }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Acciones</th>
              <td mat-cell *matCellDef="let element" style="text-align: center;">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="editarTemporada(element)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminarTemporada(element)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <div *ngIf="!isLoading && temporadas.length === 0" class="p-24 text-center text-muted">
          <mat-icon style="font-size: 40px; height: 40px; width: 40px; color: #aaa;">wb_sunny</mat-icon>
          <p class="m-t-8">No hay temporadas comerciales registradas todavía.</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .gap-8 { gap: 8px; }
    .gap-16 { gap: 16px; }
    .bg-light-primary { background-color: #f0f7ff; }
  `]
})
export class TemporadaComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'icono', 'nombre', 'acciones'];
  temporadas: TemporadaItem[] = [];
  isLoading = false;
  guardando = false;
  mostrarForm = false;
  editandoId: number | null = null;

  formData: { nombre: string } = { nombre: '' };

  private destroy$ = new Subject<void>();
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    const base = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
    this.apiUrl = `${base}/parametros/temporadas`;
  }

  ngOnInit(): void {
    this.cargarTemporadas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSeasonIcon(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    if (n.includes('veran') || n.includes('sol')) return 'wb_sunny';
    if (n.includes('inviern') || n.includes('frio') || n.includes('nieve')) return 'ac_unit';
    if (n.includes('otoñ') || n.includes('otono')) return 'eco';
    if (n.includes('primav')) return 'local_florist';
    if (n.includes('escolar') || n.includes('colegio')) return 'school';
    return 'calendar_today';
  }

  getIconColor(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    if (n.includes('veran')) return '#f59e0b';
    if (n.includes('inviern')) return '#0284c7';
    if (n.includes('otoñ') || n.includes('otono')) return '#d97706';
    if (n.includes('primav')) return '#10b981';
    if (n.includes('escolar')) return '#6366f1';
    return '#64748b';
  }

  cargarTemporadas(): void {
    this.isLoading = true;
    this.http.get<TemporadaItem[]>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.temporadas = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar temporadas:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar temporadas', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.formData = { nombre: '' };
    this.mostrarForm = true;
  }

  editarTemporada(item: TemporadaItem): void {
    this.editandoId = item.id;
    this.formData = { nombre: item.nombre };
    this.mostrarForm = true;
  }

  cancelarFormulario(): void {
    this.mostrarForm = false;
    this.editandoId = null;
  }

  guardarTemporada(): void {
    if (!this.formData.nombre) return;
    this.guardando = true;

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}/${this.editandoId}`, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Temporada actualizada con éxito', 'OK', { duration: 3000 });
            this.cargarTemporadas();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al actualizar temporada', 'Cerrar', { duration: 4000 });
          }
        });
    } else {
      this.http.post(this.apiUrl, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Temporada registrada con éxito', 'OK', { duration: 3000 });
            this.cargarTemporadas();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al registrar temporada', 'Cerrar', { duration: 4000 });
          }
        });
    }
  }

  eliminarTemporada(item: TemporadaItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      data: {
        titulo: 'Eliminar Temporada',
        mensaje: `¿Estás seguro de que deseas eliminar la temporada "${item.nombre}"?`,
        submensaje: 'Esta acción no se puede deshacer.',
        textoBoton: 'Eliminar'
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmado => {
      if (!confirmado) return;

      this.http.delete(`${this.apiUrl}/${item.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Temporada eliminada con éxito', 'OK', { duration: 3000 });
            this.cargarTemporadas();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.detail || 'No se puede eliminar la temporada porque tiene prendas asociadas', 'Cerrar', { duration: 5000 });
          }
        });
    });
  }
}
