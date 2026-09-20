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

export interface SucursalItem {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
}

@Component({
  selector: 'app-sucursales',
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
    <div class="sucursales-container">
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #1e293b;">[CU05] Gestión de Sucursales de la Cadena</h2>
          <p class="text-muted m-0">Administración de tiendas físicas en diferentes ciudades para retiros y ventas presenciales</p>
        </div>
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon class="m-r-8">add_business</mat-icon>
          Nueva Sucursal
        </button>
      </div>

      <!-- Formulario para Crear / Editar Sucursal -->
      <mat-card *ngIf="mostrarForm" class="m-b-20" style="border: 2px solid #2563eb;">
        <mat-card-header>
          <mat-card-title>{{ editandoId ? 'Editar Sucursal #' + editandoId : 'Registrar Nueva Sucursal Física' }}</mat-card-title>
          <mat-card-subtitle>Complete la información de ubicación y contacto de la tienda</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-t-16">
          <div class="row" style="display: flex; flex-wrap: wrap; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 250px;">
              <mat-label>Nombre de la Sucursal</mat-label>
              <input matInput [(ngModel)]="formData.nombre" placeholder="Ej. Sucursal Equipetrol" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
              <mat-label>Ciudad</mat-label>
              <input matInput [(ngModel)]="formData.ciudad" placeholder="Ej. Santa Cruz, La Paz, Cochabamba" required />
            </mat-form-field>
          </div>

          <div class="row" style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 280px;">
              <mat-label>Dirección</mat-label>
              <input matInput [(ngModel)]="formData.direccion" placeholder="Ej. Av. San Martín esq. Calle 5" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Teléfono / WhatsApp</mat-label>
              <input matInput [(ngModel)]="formData.telefono" placeholder="Ej. +591 3 3344556" required />
            </mat-form-field>
          </div>

          <div class="d-flex justify-content-end gap-12 m-t-12">
            <button mat-button (click)="cancelarFormulario()">Cancelar</button>
            <button mat-raised-button color="primary" [disabled]="!formData.nombre || !formData.ciudad || guardando" (click)="guardarSucursal()">
              <mat-icon *ngIf="!guardando">check</mat-icon>
              <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
              Guardar Sucursal
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabla de Sucursales -->
      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <div *ngIf="!isLoading && sucursales.length > 0" class="table-responsive">
            <table mat-table [dataSource]="sucursales" class="w-full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef style="width: 70px;">ID</th>
                <td mat-cell *matCellDef="let element">#{{ element.id }}</td>
              </ng-container>

              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre de Sucursal</th>
                <td mat-cell *matCellDef="let element">
                  <div class="d-flex align-items-center gap-8">
                    <mat-icon color="primary">storefront</mat-icon>
                    <strong>{{ element.nombre }}</strong>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="ciudad">
                <th mat-header-cell *matHeaderCellDef>Ciudad</th>
                <td mat-cell *matCellDef="let element">
                  <span class="badge bg-light-primary text-primary p-x-10 p-y-4 rounded font-weight-bold">
                    {{ element.ciudad }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="direccion">
                <th mat-header-cell *matHeaderCellDef>Dirección</th>
                <td mat-cell *matCellDef="let element">{{ element.direccion }}</td>
              </ng-container>

              <ng-container matColumnDef="telefono">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let element">{{ element.telefono || 'Sin teléfono' }}</td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Acciones</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <button mat-icon-button color="primary" matTooltip="Editar sucursal" (click)="editarSucursal(element)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" matTooltip="Eliminar sucursal" (click)="eliminarSucursal(element)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="!isLoading && sucursales.length === 0" class="p-32 text-center text-muted">
            <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #cbd5e1;">store</mat-icon>
            <h4 class="m-t-12">No hay sucursales registradas</h4>
            <p>Haga clic en "Nueva Sucursal" para añadir una tienda física.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .badge { display: inline-block; font-size: 13px; }
    .bg-light-primary { background-color: #eff6ff; }
    .text-primary { color: #1d4ed8; }
    .gap-8 { gap: 8px; }
    .gap-12 { gap: 12px; }
  `]
})
export class SucursalComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'nombre', 'ciudad', 'direccion', 'telefono', 'acciones'];
  sucursales: SucursalItem[] = [];
  isLoading = false;
  guardando = false;
  mostrarForm = false;
  editandoId: number | null = null;

  formData = {
    nombre: '',
    ciudad: '',
    direccion: '',
    telefono: ''
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
    this.apiUrl = `${base}/sucursales/`;
  }

  ngOnInit(): void {
    this.cargarSucursales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarSucursales(): void {
    this.isLoading = true;
    this.http.get<SucursalItem[]>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sucursales = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar sucursales:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar sucursales', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.formData = { nombre: '', ciudad: '', direccion: '', telefono: '' };
    this.mostrarForm = true;
  }

  editarSucursal(item: SucursalItem): void {
    this.editandoId = item.id;
    this.formData = {
      nombre: item.nombre,
      ciudad: item.ciudad,
      direccion: item.direccion,
      telefono: item.telefono || ''
    };
    this.mostrarForm = true;
  }

  cancelarFormulario(): void {
    this.mostrarForm = false;
    this.editandoId = null;
  }

  guardarSucursal(): void {
    if (!this.formData.nombre || !this.formData.ciudad) return;
    this.guardando = true;

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}${this.editandoId}`, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Sucursal actualizada con éxito', 'OK', { duration: 3000 });
            this.cargarSucursales();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al actualizar sucursal', 'Cerrar', { duration: 4000 });
          }
        });
    } else {
      this.http.post(this.apiUrl, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Sucursal registrada con éxito', 'OK', { duration: 3000 });
            this.cargarSucursales();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al registrar sucursal', 'Cerrar', { duration: 4000 });
          }
        });
    }
  }

  eliminarSucursal(item: SucursalItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        titulo: 'Eliminar Sucursal',
        mensaje: `¿Estás seguro de que deseas eliminar la sucursal "${item.nombre}"?`
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmado => {
      if (!confirmado) return;

      this.http.delete(`${this.apiUrl}${item.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Sucursal eliminada con éxito', 'OK', { duration: 3000 });
            this.cargarSucursales();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.detail || 'No se puede eliminar la sucursal porque contiene inventario o ventas', 'Cerrar', { duration: 5000 });
          }
        });
    });
  }
}
