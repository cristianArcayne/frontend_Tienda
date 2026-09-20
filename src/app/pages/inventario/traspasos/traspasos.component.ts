import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
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

export interface DetalleTraspasoItem {
  id: number;
  variante_id: number;
  ropa_nombre: string;
  sku: string;
  talla: string;
  color: string;
  cantidad: number;
}

export interface TraspasoItem {
  id: number;
  sucursal_origen_id: number;
  sucursal_origen_nombre: string;
  sucursal_origen_ciudad: string;
  sucursal_destino_id: number;
  sucursal_destino_nombre: string;
  sucursal_destino_ciudad: string;
  estado: string; // 'SOLICITADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO'
  observacion?: string;
  fecha_solicitud?: string;
  fecha_recepcion?: string;
  total_unidades: number;
  detalles: DetalleTraspasoItem[];
}

@Component({
  selector: 'app-traspasos',
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
    <div class="traspasos-container">
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #1e293b;">[CU10] Traspasos de Stock entre Sucursales</h2>
          <p class="text-muted m-0">Gestión logística de traslados de mercadería para rebalanceo de existencias inter-tiendas</p>
        </div>
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon class="m-r-8">compare_arrows</mat-icon>
          Nuevo Traspaso
        </button>
      </div>

      <!-- Formulario de Nuevo Traspaso -->
      <mat-card *ngIf="mostrarForm" class="m-b-20" style="border: 2px solid #6366f1;">
        <mat-card-header>
          <mat-card-title>Registrar Solicitud de Traspaso Inter-Sucursal</mat-card-title>
          <mat-card-subtitle>Seleccione la tienda origen (donde sale stock) y la tienda destino (donde ingresa)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-t-16">
          <div style="display: flex; flex-wrap: wrap; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 240px;">
              <mat-label>Sucursal Origen (Salida)</mat-label>
              <mat-select [(ngModel)]="formData.sucursal_origen_id" (selectionChange)="onOrigenChange()">
                <mat-option *ngFor="let s of sucursales" [value]="s.id">
                  {{ s.nombre }} ({{ s.ciudad }})
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 240px;">
              <mat-label>Sucursal Destino (Recepción)</mat-label>
              <mat-select [(ngModel)]="formData.sucursal_destino_id">
                <mat-option *ngFor="let s of sucursales" [value]="s.id" [disabled]="s.id === formData.sucursal_origen_id">
                  {{ s.nombre }} ({{ s.ciudad }})
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 260px;">
              <mat-label>Prenda / Variante a Traspasar</mat-label>
              <mat-select [(ngModel)]="formData.variante_id">
                <mat-option *ngFor="let item of variantesDisponibles" [value]="item.variante_id">
                  {{ item.ropa_nombre }} (Talla: {{ item.talla }}, Color: {{ item.color }}) — Disponible: {{ item.stock_disponible }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>Cantidad a Enviar</mat-label>
              <input matInput type="number" [(ngModel)]="formData.cantidad" min="1" placeholder="Ej. 2" required />
            </mat-form-field>
          </div>

          <div style="margin-top: 8px;">
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Motivo / Observación del Traspaso</mat-label>
              <input matInput [(ngModel)]="formData.observacion" placeholder="Ej. Rebalanceo por alta demanda en Mall" />
            </mat-form-field>
          </div>

          <div class="d-flex justify-content-end gap-12 m-t-8">
            <button mat-button (click)="mostrarForm = false">Cancelar</button>
            <button mat-raised-button color="primary" [disabled]="!formData.sucursal_origen_id || !formData.sucursal_destino_id || !formData.variante_id || !formData.cantidad || guardando" (click)="guardarTraspaso()">
              <mat-icon *ngIf="!guardando">send</mat-icon>
              <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
              Emitir Traspaso
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabla de Traspasos -->
      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <div *ngIf="!isLoading && traspasos.length > 0" class="table-responsive">
            <table mat-table [dataSource]="traspasos" class="w-full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef style="width: 70px;">N° Guía</th>
                <td mat-cell *matCellDef="let element">#{{ element.id }}</td>
              </ng-container>

              <ng-container matColumnDef="origen">
                <th mat-header-cell *matHeaderCellDef>Tienda Origen</th>
                <td mat-cell *matCellDef="let element">
                  <div>
                    <strong>{{ element.sucursal_origen_nombre }}</strong>
                    <div class="text-muted" style="font-size: 11px;">{{ element.sucursal_origen_ciudad }}</div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="destino">
                <th mat-header-cell *matHeaderCellDef>Tienda Destino</th>
                <td mat-cell *matCellDef="let element">
                  <div>
                    <strong>{{ element.sucursal_destino_nombre }}</strong>
                    <div class="text-muted" style="font-size: 11px;">{{ element.sucursal_destino_ciudad }}</div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="unidades">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Unidades</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <span class="badge bg-light-primary text-primary p-x-10 p-y-4 rounded font-weight-bold">
                    {{ element.total_unidades }} uds.
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="detalles">
                <th mat-header-cell *matHeaderCellDef>Prendas Trasladadas</th>
                <td mat-cell *matCellDef="let element">
                  <div *ngFor="let det of element.detalles" style="font-size: 12px; margin-bottom: 2px;">
                    • <strong>{{ det.ropa_nombre }}</strong> ({{ det.talla }}, {{ det.color }}): {{ det.cantidad }} uds.
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Estado</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <span [ngClass]="{
                    'badge-recibido': element.estado === 'RECIBIDO',
                    'badge-transito': element.estado === 'EN_TRANSITO',
                    'badge-solicitado': element.estado === 'SOLICITADO'
                  }" class="badge-status">
                    {{ element.estado }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef style="width: 140px; text-align: center;">Recepción</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <button *ngIf="element.estado !== 'RECIBIDO'" mat-stroked-button color="primary" (click)="confirmarRecepcion(element)">
                    <mat-icon class="m-r-4">done_all</mat-icon>
                    Confirmar
                  </button>
                  <span *ngIf="element.estado === 'RECIBIDO'" class="text-success" style="font-size: 12px; font-weight: 600;">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; vertical-align: middle;">check_circle</mat-icon>
                    Recibido
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="!isLoading && traspasos.length === 0" class="p-32 text-center text-muted">
            <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #a5b4fc;">sync_alt</mat-icon>
            <h4 class="m-t-12">No hay movimientos de traspaso registrados</h4>
            <p>Haga clic en "Nuevo Traspaso" para trasladar prendas entre tiendas.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .badge { display: inline-block; }
    .bg-light-primary { background-color: #eff6ff; }
    .text-primary { color: #2563eb; }
    .gap-8 { gap: 8px; }
    .gap-12 { gap: 12px; }
    .badge-status {
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      display: inline-block;
    }
    .badge-recibido { background-color: #dcfce7; color: #15803d; }
    .badge-transito { background-color: #fef9c3; color: #a16207; }
    .badge-solicitado { background-color: #e0e7ff; color: #4338ca; }
  `]
})
export class TraspasosComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'origen', 'destino', 'unidades', 'detalles', 'estado', 'acciones'];
  traspasos: TraspasoItem[] = [];
  sucursales: any[] = [];
  variantesDisponibles: any[] = [];

  isLoading = false;
  guardando = false;
  mostrarForm = false;

  formData = {
    sucursal_origen_id: 1,
    sucursal_destino_id: 2,
    variante_id: 0,
    cantidad: 2,
    observacion: 'Rebalanceo logístico inter-sucursal'
  };

  private destroy$ = new Subject<void>();
  private apiBase: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {
    this.apiBase = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
  }

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarTraspasos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarSucursales(): void {
    this.http.get<any[]>(`${this.apiBase}/sucursales/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sucursales = data;
          if (data.length > 1) {
            this.formData.sucursal_origen_id = data[0].id;
            this.formData.sucursal_destino_id = data[1].id;
          }
          this.onOrigenChange();
        }
      });
  }

  onOrigenChange(): void {
    if (!this.formData.sucursal_origen_id) return;
    this.http.get<any>(`${this.apiBase}/inventario/sucursal/${this.formData.sucursal_origen_id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.variantesDisponibles = (data.items || []).filter((i: any) => i.stock_disponible > 0);
          if (this.variantesDisponibles.length > 0) {
            this.formData.variante_id = this.variantesDisponibles[0].variante_id;
          }
        }
      });
  }

  cargarTraspasos(): void {
    this.isLoading = true;
    this.http.get<TraspasoItem[]>(`${this.apiBase}/traspasos/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.traspasos = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar traspasos:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar traspasos', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.mostrarForm = true;
    this.onOrigenChange();
  }

  guardarTraspaso(): void {
    if (!this.formData.sucursal_origen_id || !this.formData.sucursal_destino_id || !this.formData.variante_id || !this.formData.cantidad) return;
    this.guardando = true;

    const payload = {
      sucursal_origen_id: this.formData.sucursal_origen_id,
      sucursal_destino_id: this.formData.sucursal_destino_id,
      observacion: this.formData.observacion,
      despachar_inmediato: true,
      detalles: [
        {
          variante_id: this.formData.variante_id,
          cantidad: Number(this.formData.cantidad)
        }
      ]
    };

    this.http.post(`${this.apiBase}/traspasos/`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarForm = false;
          this.snackBar.open('Traspaso emitido exitosamente', 'OK', { duration: 3000 });
          this.cargarTraspasos();
        },
        error: (err) => {
          this.guardando = false;
          this.snackBar.open(err?.error?.detail || 'Error al registrar traspaso', 'Cerrar', { duration: 4000 });
        }
      });
  }

  confirmarRecepcion(item: TraspasoItem): void {
    this.http.put(`${this.apiBase}/traspasos/${item.id}/confirmar-recepcion`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Traspaso #${item.id} recibido y stock actualizado`, 'OK', { duration: 3000 });
          this.cargarTraspasos();
        },
        error: (err) => {
          this.snackBar.open(err?.error?.detail || 'Error al confirmar recepción', 'Cerrar', { duration: 4000 });
        }
      });
  }
}
