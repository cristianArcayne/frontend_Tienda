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
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface TallaItem {
  id: number;
  medida: string;
  tipo?: string;
  guia_medida?: string;
}

@Component({
  selector: 'app-talla',
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
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <div class="page-header d-flex justify-content-between align-items-center w-100">
          <div>
            <mat-card-title>Gestión de Tallas</mat-card-title>
            <mat-card-subtitle>Tallas comerciales para prendas textiles y calzado</mat-card-subtitle>
          </div>
          <button mat-raised-button color="primary" (click)="abrirFormulario()">
            <mat-icon class="m-r-8">add</mat-icon>
            Nueva Talla
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        <!-- Formulario Inline para Crear/Editar -->
        <div *ngIf="mostrarForm" class="p-16 m-b-16 bg-light-primary rounded" style="border: 1px dashed #1976d2;">
          <h4 class="m-b-12">{{ editandoId ? 'Editar Talla #' + editandoId : 'Registrar Nueva Talla' }}</h4>
          <div class="d-flex gap-16 flex-wrap align-items-center">
            <mat-form-field appearance="outline" style="min-width: 140px;">
              <mat-label>Medida / Talla</mat-label>
              <input matInput [(ngModel)]="formData.medida" placeholder="Ej. S, M, L, 38, 42" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="min-width: 180px;">
              <mat-label>Tipo de Prenda</mat-label>
              <mat-select [(ngModel)]="formData.tipo">
                <mat-option value="Ropa Superior">Ropa Superior (Poleras, Camisas)</mat-option>
                <mat-option value="Pantalones">Pantalones & Jeans</mat-option>
                <mat-option value="Calzado">Calzado</mat-option>
                <mat-option value="Accesorio">Accesorios</mat-option>
                <mat-option value="General">General</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
              <mat-label>Guía de Medida (Opcional)</mat-label>
              <input matInput [(ngModel)]="formData.guia_medida" placeholder="Ej. Pecho 96-100cm, Cintura 80cm" />
            </mat-form-field>

            <div class="d-flex gap-8">
              <button mat-raised-button color="primary" [disabled]="!formData.medida || guardando" (click)="guardarTalla()">
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

        <div *ngIf="!isLoading && tallas.length > 0" class="table-responsive">
          <table mat-table [dataSource]="tallas" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef style="width: 70px;">ID</th>
              <td mat-cell *matCellDef="let element">{{ element.id }}</td>
            </ng-container>

            <ng-container matColumnDef="medida">
              <th mat-header-cell *matHeaderCellDef>Talla / Medida</th>
              <td mat-cell *matCellDef="let element">
                <span class="badge bg-primary text-white p-x-12 p-y-4 rounded font-weight-bold" style="font-size: 14px;">
                  {{ element.medida }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let element">{{ element.tipo || 'General' }}</td>
            </ng-container>

            <ng-container matColumnDef="guia_medida">
              <th mat-header-cell *matHeaderCellDef>Guía de Medida</th>
              <td mat-cell *matCellDef="let element">{{ element.guia_medida || '-' }}</td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Acciones</th>
              <td mat-cell *matCellDef="let element" style="text-align: center;">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="editarTalla(element)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminarTalla(element)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <div *ngIf="!isLoading && tallas.length === 0" class="p-24 text-center text-muted">
          <mat-icon style="font-size: 40px; height: 40px; width: 40px; color: #aaa;">straighten</mat-icon>
          <p class="m-t-8">No hay tallas registradas todavía.</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .badge { display: inline-block; }
    .gap-8 { gap: 8px; }
    .gap-16 { gap: 16px; }
    .bg-light-primary { background-color: #f0f7ff; }
  `]
})
export class TallaComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'medida', 'tipo', 'guia_medida', 'acciones'];
  tallas: TallaItem[] = [];
  isLoading = false;
  guardando = false;
  mostrarForm = false;
  editandoId: number | null = null;

  formData: { medida: string; tipo: string; guia_medida: string } = {
    medida: '',
    tipo: 'Ropa Superior',
    guia_medida: ''
  };

  private destroy$ = new Subject<void>();
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    const base = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
    this.apiUrl = `${base}/tallas/`;
  }

  ngOnInit(): void {
    this.cargarTallas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarTallas(): void {
    this.isLoading = true;
    this.http.get<TallaItem[]>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.tallas = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar tallas:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar tallas', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.formData = { medida: '', tipo: 'Ropa Superior', guia_medida: '' };
    this.mostrarForm = true;
  }

  editarTalla(item: TallaItem): void {
    this.editandoId = item.id;
    this.formData = {
      medida: item.medida,
      tipo: item.tipo || 'Ropa Superior',
      guia_medida: item.guia_medida || ''
    };
    this.mostrarForm = true;
  }

  cancelarFormulario(): void {
    this.mostrarForm = false;
    this.editandoId = null;
  }

  guardarTalla(): void {
    if (!this.formData.medida) return;
    this.guardando = true;

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}${this.editandoId}`, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Talla actualizada con éxito', 'OK', { duration: 3000 });
            this.cargarTallas();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al actualizar talla', 'Cerrar', { duration: 4000 });
          }
        });
    } else {
      this.http.post(this.apiUrl, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Talla registrada con éxito', 'OK', { duration: 3000 });
            this.cargarTallas();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al registrar talla', 'Cerrar', { duration: 4000 });
          }
        });
    }
  }

  eliminarTalla(item: TallaItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      data: {
        titulo: 'Eliminar Talla',
        mensaje: `¿Estás seguro de que deseas eliminar la talla "${item.medida}"?`,
        submensaje: 'Esta acción no se puede deshacer.',
        textoBoton: 'Eliminar'
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmado => {
      if (!confirmado) return;

      this.http.delete(`${this.apiUrl}${item.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Talla eliminada con éxito', 'OK', { duration: 3000 });
            this.cargarTallas();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.detail || 'No se puede eliminar la talla porque está en uso', 'Cerrar', { duration: 5000 });
          }
        });
    });
  }
}
