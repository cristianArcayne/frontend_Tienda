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

export interface ColorItem {
  id: number;
  nombre: string;
  codigo_hex: string;
}

@Component({
  selector: 'app-color',
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
            <mat-card-title>Gestión de Colores</mat-card-title>
            <mat-card-subtitle>Paleta cromática oficial y códigos HEX para variantes de prendas</mat-card-subtitle>
          </div>
          <button mat-raised-button color="primary" (click)="abrirFormulario()">
            <mat-icon class="m-r-8">palette</mat-icon>
            Nuevo Color
          </button>
        </div>
      </mat-card-header>

      <mat-card-content>
        <!-- Formulario Inline para Crear/Editar -->
        <div *ngIf="mostrarForm" class="p-16 m-b-16 bg-light-primary rounded" style="border: 1px dashed #1976d2;">
          <h4 class="m-b-12">{{ editandoId ? 'Editar Color #' + editandoId : 'Registrar Nuevo Color' }}</h4>
          <div class="d-flex gap-16 flex-wrap align-items-center">
            <mat-form-field appearance="outline" style="min-width: 200px;">
              <mat-label>Nombre del Color</mat-label>
              <input matInput [(ngModel)]="formData.nombre" placeholder="Ej. Azul Marino, Rojo Carmín" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="min-width: 150px;">
              <mat-label>Código HEX</mat-label>
              <input matInput [(ngModel)]="formData.codigo_hex" placeholder="#1E3A8A" required />
            </mat-form-field>

            <div class="d-flex align-items-center gap-8">
              <label style="font-size: 13px; color: #555;">Selector:</label>
              <input type="color" [(ngModel)]="formData.codigo_hex" style="width: 44px; height: 44px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid #ccc;" />
              <div class="color-preview" [style.backgroundColor]="formData.codigo_hex" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2);"></div>
            </div>

            <div class="d-flex gap-8 m-l-auto">
              <button mat-raised-button color="primary" [disabled]="!formData.nombre || guardando" (click)="guardarColor()">
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

        <div *ngIf="!isLoading && colores.length > 0" class="table-responsive">
          <table mat-table [dataSource]="colores" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef style="width: 70px;">ID</th>
              <td mat-cell *matCellDef="let element">{{ element.id }}</td>
            </ng-container>

            <ng-container matColumnDef="muestra">
              <th mat-header-cell *matHeaderCellDef style="width: 80px;">Muestra</th>
              <td mat-cell *matCellDef="let element">
                <div [style.backgroundColor]="element.codigo_hex || '#ccc'"
                     style="width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #bbb; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"
                     [matTooltip]="element.codigo_hex">
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre del Color</th>
              <td mat-cell *matCellDef="let element">
                <strong style="font-size: 15px;">{{ element.nombre }}</strong>
              </td>
            </ng-container>

            <ng-container matColumnDef="codigo_hex">
              <th mat-header-cell *matHeaderCellDef>Código HEX</th>
              <td mat-cell *matCellDef="let element">
                <code class="p-x-8 p-y-2 rounded bg-light" style="font-weight: 600;">{{ element.codigo_hex }}</code>
              </td>
            </ng-container>

            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Acciones</th>
              <td mat-cell *matCellDef="let element" style="text-align: center;">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="editarColor(element)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminarColor(element)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <div *ngIf="!isLoading && colores.length === 0" class="p-24 text-center text-muted">
          <mat-icon style="font-size: 40px; height: 40px; width: 40px; color: #aaa;">palette</mat-icon>
          <p class="m-t-8">No hay colores registrados todavía.</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .gap-8 { gap: 8px; }
    .gap-16 { gap: 16px; }
    .bg-light-primary { background-color: #f0f7ff; }
    .bg-light { background-color: #f5f5f5; }
  `]
})
export class ColorComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'muestra', 'nombre', 'codigo_hex', 'acciones'];
  colores: ColorItem[] = [];
  isLoading = false;
  guardando = false;
  mostrarForm = false;
  editandoId: number | null = null;

  formData: { nombre: string; codigo_hex: string } = {
    nombre: '',
    codigo_hex: '#1E3A8A'
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
    this.apiUrl = `${base}/parametros/colores`;
  }

  ngOnInit(): void {
    this.cargarColores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarColores(): void {
    this.isLoading = true;
    this.http.get<ColorItem[]>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.colores = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar colores:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar colores', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.formData = { nombre: '', codigo_hex: '#1E3A8A' };
    this.mostrarForm = true;
  }

  editarColor(item: ColorItem): void {
    this.editandoId = item.id;
    this.formData = {
      nombre: item.nombre,
      codigo_hex: item.codigo_hex || '#000000'
    };
    this.mostrarForm = true;
  }

  cancelarFormulario(): void {
    this.mostrarForm = false;
    this.editandoId = null;
  }

  guardarColor(): void {
    if (!this.formData.nombre) return;
    this.guardando = true;

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}/${this.editandoId}`, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Color actualizado con éxito', 'OK', { duration: 3000 });
            this.cargarColores();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al actualizar color', 'Cerrar', { duration: 4000 });
          }
        });
    } else {
      this.http.post(this.apiUrl, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Color registrado con éxito', 'OK', { duration: 3000 });
            this.cargarColores();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al registrar color', 'Cerrar', { duration: 4000 });
          }
        });
    }
  }

  eliminarColor(item: ColorItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      maxWidth: '90vw',
      data: {
        titulo: 'Eliminar Color',
        mensaje: `¿Estás seguro de que deseas eliminar el color "${item.nombre}"?`,
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
            this.snackBar.open('Color eliminado con éxito', 'OK', { duration: 3000 });
            this.cargarColores();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.detail || 'No se puede eliminar el color porque tiene prendas asociadas', 'Cerrar', { duration: 5000 });
          }
        });
    });
  }
}
