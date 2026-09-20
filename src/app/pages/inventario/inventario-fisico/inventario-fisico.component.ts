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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';

export interface VarianteStockItem {
  id: number;
  variante_id: number;
  ropa_id: number;
  ropa_nombre: string;
  categoria_nombre: string;
  sku: string;
  cod_barra: string;
  talla: string;
  color: string;
  color_hex: string;
  imagen_uri?: string;
  precio_base: number;
  stock_fisico: number;
  stock_reservado: number;
  stock_disponible: number;
  stock_minimo: number;
  estado_stock: string;
}

export interface ResumenInventario {
  sucursal_id: number;
  sucursal_nombre: string;
  ciudad: string;
  total_skus: number;
  total_unidades_fisicas: number;
  total_unidades_reservadas: number;
  total_unidades_disponibles: number;
  total_alertas_bajo_stock: number;
  items: VarianteStockItem[];
}

@Component({
  selector: 'app-inventario-fisico',
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
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="inventario-fisico-container">
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #1e293b;">[CU09] Inventario Físico Local por Sucursal</h2>
          <p class="text-muted m-0">Control de existencias reales (Físico vs Reservado vs Disponible), alertas de stock y recepción de mercadería</p>
        </div>
        <div class="d-flex gap-8">
          <button mat-raised-button color="primary" (click)="abrirModalEntrada()">
            <mat-icon class="m-r-8">add_box</mat-icon>
            Entrada de Mercadería
          </button>
          <button mat-stroked-button color="warn" (click)="abrirModalAjuste()">
            <mat-icon class="m-r-8">tune</mat-icon>
            Ajuste de Stock
          </button>
        </div>
      </div>

      <!-- Barra de Sucursales y Filtros -->
      <mat-card class="m-b-16 p-12 bg-white">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-16">
          <div class="d-flex align-items-center gap-12" style="flex: 1; min-width: 280px;">
            <mat-icon color="primary">storefront</mat-icon>
            <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
              <mat-label>Sucursal Activa</mat-label>
              <mat-select [(ngModel)]="sucursalSeleccionadaId" (selectionChange)="onSucursalChange()">
                <mat-option *ngFor="let s of sucursales" [value]="s.id">
                  {{ s.nombre }} — ({{ s.ciudad }})
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="d-flex align-items-center gap-16">
            <mat-slide-toggle [(ngModel)]="soloAlertas" (change)="aplicarFiltros()" color="warn">
              Ver solo alertas de bajo stock
            </mat-slide-toggle>
            <button mat-icon-button (click)="cargarInventario()" matTooltip="Refrescar existencias">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </div>
      </mat-card>

      <!-- KPI Metric Cards -->
      <div class="row m-b-20" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <mat-card class="kpi-card bg-light-primary">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-title text-primary">TOTAL SKUs</div>
              <div class="kpi-val">{{ resumen?.total_skus || 0 }}</div>
            </div>
            <mat-icon class="kpi-icon text-primary">layers</mat-icon>
          </div>
        </mat-card>

        <mat-card class="kpi-card bg-light-success">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-title text-success">STOCK FÍSICO</div>
              <div class="kpi-val">{{ resumen?.total_unidades_fisicas || 0 }} <small style="font-size: 13px;">uds.</small></div>
            </div>
            <mat-icon class="kpi-icon text-success">inventory_2</mat-icon>
          </div>
        </mat-card>

        <mat-card class="kpi-card bg-light-warning">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-title text-warning">RESERVADAS (48h)</div>
              <div class="kpi-val">{{ resumen?.total_unidades_reservadas || 0 }} <small style="font-size: 13px;">uds.</small></div>
            </div>
            <mat-icon class="kpi-icon text-warning">lock_clock</mat-icon>
          </div>
        </mat-card>

        <mat-card class="kpi-card bg-light-info">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-title text-info">DISPONIBLES VENTA</div>
              <div class="kpi-val">{{ resumen?.total_unidades_disponibles || 0 }} <small style="font-size: 13px;">uds.</small></div>
            </div>
            <mat-icon class="kpi-icon text-info">shopping_bag</mat-icon>
          </div>
        </mat-card>

        <mat-card class="kpi-card bg-light-danger">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="kpi-title text-danger">BAJO STOCK / AGOTADO</div>
              <div class="kpi-val">{{ resumen?.total_alertas_bajo_stock || 0 }}</div>
            </div>
            <mat-icon class="kpi-icon text-danger">warning</mat-icon>
          </div>
        </mat-card>
      </div>

      <!-- Formulario Modal de Entrada de Mercadería -->
      <mat-card *ngIf="mostrarFormEntrada" class="m-b-20" style="border: 2px solid #22c55e;">
        <mat-card-header>
          <mat-card-title>Registrar Entrada de Mercadería a {{ resumen?.sucursal_nombre }}</mat-card-title>
          <mat-card-subtitle>Añadir unidades al inventario físico por recepción de proveedor</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-t-16">
          <div style="display: flex; flex-wrap: wrap; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 250px;">
              <mat-label>Seleccionar Variante / Prenda</mat-label>
              <mat-select [(ngModel)]="entradaData.variante_id">
                <mat-option *ngFor="let item of itemsTotales" [value]="item.variante_id">
                  {{ item.ropa_nombre }} (Talla: {{ item.talla }}, Color: {{ item.color }}) — SKU: {{ item.sku }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>Cantidad a Ingresar</mat-label>
              <input matInput type="number" [(ngModel)]="entradaData.cantidad" min="1" placeholder="Ej. 10" required />
            </mat-form-field>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 250px;">
              <mat-label>Motivo / Observación</mat-label>
              <input matInput [(ngModel)]="entradaData.motivo" placeholder="Recepción de pedido / Compra a proveedor" />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Nro. Guía / Factura</mat-label>
              <input matInput [(ngModel)]="entradaData.nro_documento" placeholder="Ej. FAC-00129" />
            </mat-form-field>
          </div>

          <div class="d-flex justify-content-end gap-12 m-t-8">
            <button mat-button (click)="mostrarFormEntrada = false">Cancelar</button>
            <button mat-raised-button color="primary" [disabled]="!entradaData.variante_id || !entradaData.cantidad || guardando" (click)="guardarEntrada()">
              <mat-icon *ngIf="!guardando">check</mat-icon>
              <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
              Confirmar Ingreso
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Formulario Modal de Ajuste de Stock -->
      <mat-card *ngIf="mostrarFormAjuste" class="m-b-20" style="border: 2px solid #f97316;">
        <mat-card-header>
          <mat-card-title>Registrar Ajuste de Stock en {{ resumen?.sucursal_nombre }}</mat-card-title>
          <mat-card-subtitle>Mermas, productos dañados o correcciones de conteo físico</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="p-t-16">
          <div style="display: flex; flex-wrap: wrap; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 250px;">
              <mat-label>Seleccionar Variante / Prenda</mat-label>
              <mat-select [(ngModel)]="ajusteData.variante_id">
                <mat-option *ngFor="let item of itemsTotales" [value]="item.variante_id">
                  {{ item.ropa_nombre }} (Talla: {{ item.talla }}, Color: {{ item.color }}) — Físico: {{ item.stock_fisico }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 160px;">
              <mat-label>Tipo de Ajuste</mat-label>
              <mat-select [(ngModel)]="ajusteData.tipo_ajuste">
                <mat-option value="DANIO">Daño / Defectuoso (-)</mat-option>
                <mat-option value="MERMA">Merma / Pérdida (-)</mat-option>
                <mat-option value="CONTEO_FISICO">Conteo Físico (+/-)</mat-option>
                <mat-option value="CORRECCION">Corrección Administrativa (+/-)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 140px;">
              <mat-label>Cantidad Ajuste</mat-label>
              <input matInput type="number" [(ngModel)]="ajusteData.cantidad_ajuste" placeholder="-1 o +2" required />
            </mat-form-field>
          </div>

          <div style="margin-top: 8px;">
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Justificación obligatoria</mat-label>
              <input matInput [(ngModel)]="ajusteData.motivo" placeholder="Ej. Prenda rota durante exhibición en tienda" required />
            </mat-form-field>
          </div>

          <div class="d-flex justify-content-end gap-12 m-t-8">
            <button mat-button (click)="mostrarFormAjuste = false">Cancelar</button>
            <button mat-raised-button color="warn" [disabled]="!ajusteData.variante_id || !ajusteData.cantidad_ajuste || !ajusteData.motivo || guardando" (click)="guardarAjuste()">
              <mat-icon *ngIf="!guardando">check</mat-icon>
              <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
              Aplicar Ajuste
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabla de Existencias -->
      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <div *ngIf="!isLoading && itemsFiltrados.length > 0" class="table-responsive">
            <table mat-table [dataSource]="itemsFiltrados" class="w-full">
              <ng-container matColumnDef="sku">
                <th mat-header-cell *matHeaderCellDef style="width: 130px;">SKU / Código</th>
                <td mat-cell *matCellDef="let element">
                  <code>{{ element.sku }}</code>
                </td>
              </ng-container>

              <ng-container matColumnDef="prenda">
                <th mat-header-cell *matHeaderCellDef>Prenda / Categoría</th>
                <td mat-cell *matCellDef="let element">
                  <div>
                    <strong style="font-size: 15px;">{{ element.ropa_nombre }}</strong>
                    <div class="text-muted" style="font-size: 12px;">{{ element.categoria_nombre }}</div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="variante">
                <th mat-header-cell *matHeaderCellDef>Talla y Color</th>
                <td mat-cell *matCellDef="let element">
                  <div class="d-flex align-items-center gap-8">
                    <span class="badge bg-light p-x-8 p-y-2 rounded" style="border: 1px solid #ccc; font-weight: bold;">
                      {{ element.talla }}
                    </span>
                    <div [style.backgroundColor]="element.color_hex"
                         style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid #aaa;"
                         [matTooltip]="element.color"></div>
                    <span style="font-size: 13px;">{{ element.color }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="fisico">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Stock Físico</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <strong style="font-size: 16px;">{{ element.stock_fisico }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="reservado">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Reservado</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <span class="badge bg-light-warning text-warning p-x-8 p-y-2 rounded font-weight-bold">
                    {{ element.stock_reservado }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="disponible">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Disponible Venta</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <span class="badge bg-light-success text-success p-x-10 p-y-4 rounded font-weight-bold" style="font-size: 14px;">
                    {{ element.stock_disponible }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Estado</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <span [ngClass]="{
                    'badge-disponible': element.estado_stock === 'DISPONIBLE',
                    'badge-bajo': element.estado_stock === 'BAJO_STOCK',
                    'badge-agotado': element.estado_stock === 'AGOTADO'
                  }" class="badge-status">
                    {{ element.estado_stock === 'BAJO_STOCK' ? 'STOCK BAJO' : element.estado_stock }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="!isLoading && itemsFiltrados.length === 0" class="p-32 text-center text-muted">
            <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #cbd5e1;">inventory</mat-icon>
            <h4 class="m-t-12">No hay prendas registradas para esta sucursal</h4>
            <p>Haga clic en "Entrada de Mercadería" para cargar existencias físicas.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .badge { display: inline-block; }
    .badge-status {
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      display: inline-block;
    }
    .badge-disponible { background-color: #dcfce7; color: #15803d; }
    .badge-bajo { background-color: #fef9c3; color: #a16207; }
    .badge-agotado { background-color: #fee2e2; color: #b91c1c; }

    .kpi-card {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.05);
    }
    .kpi-title { font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-val { font-size: 26px; font-weight: 800; }
    .kpi-icon { font-size: 36px; width: 36px; height: 36px; opacity: 0.85; }

    .bg-light-primary { background-color: #eff6ff; }
    .text-primary { color: #1d4ed8; }
    .bg-light-success { background-color: #f0fdf4; }
    .text-success { color: #15803d; }
    .bg-light-warning { background-color: #fffbeb; }
    .text-warning { color: #b45309; }
    .bg-light-info { background-color: #ecfeff; }
    .text-info { color: #0e7490; }
    .bg-light-danger { background-color: #fef2f2; }
    .text-danger { color: #b91c1c; }

    .gap-8 { gap: 8px; }
    .gap-12 { gap: 12px; }
    .gap-16 { gap: 16px; }
  `]
})
export class InventarioFisicoComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['sku', 'prenda', 'variante', 'fisico', 'reservado', 'disponible', 'estado'];
  sucursales: any[] = [];
  sucursalSeleccionadaId: number = 1;
  resumen: ResumenInventario | null = null;
  itemsTotales: VarianteStockItem[] = [];
  itemsFiltrados: VarianteStockItem[] = [];

  isLoading = false;
  guardando = false;
  soloAlertas = false;

  mostrarFormEntrada = false;
  mostrarFormAjuste = false;

  entradaData = {
    variante_id: 0,
    cantidad: 10,
    motivo: 'Ingreso por recepción de mercadería',
    nro_documento: ''
  };

  ajusteData = {
    variante_id: 0,
    tipo_ajuste: 'DANIO',
    cantidad_ajuste: -1,
    motivo: ''
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
          if (data.length > 0 && !this.sucursalSeleccionadaId) {
            this.sucursalSeleccionadaId = data[0].id;
          }
          this.cargarInventario();
        },
        error: (err) => {
          console.error('Error al cargar sucursales:', err);
        }
      });
  }

  onSucursalChange(): void {
    this.cargarInventario();
  }

  cargarInventario(): void {
    if (!this.sucursalSeleccionadaId) return;
    this.isLoading = true;

    this.http.get<ResumenInventario>(`${this.apiBase}/inventario/sucursal/${this.sucursalSeleccionadaId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.resumen = data;
          this.itemsTotales = data.items || [];
          this.aplicarFiltros();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar inventario local:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar existencias de la sucursal', 'Cerrar', { duration: 4000 });
        }
      });
  }

  aplicarFiltros(): void {
    if (this.soloAlertas) {
      this.itemsFiltrados = this.itemsTotales.filter(i => i.estado_stock === 'BAJO_STOCK' || i.estado_stock === 'AGOTADO');
    } else {
      this.itemsFiltrados = [...this.itemsTotales];
    }
  }

  abrirModalEntrada(): void {
    this.cargarInventario();
    this.entradaData = {
      variante_id: this.itemsTotales[0]?.variante_id || 0,
      cantidad: 10,
      motivo: 'Ingreso por recepción de mercadería',
      nro_documento: ''
    };
    this.mostrarFormEntrada = true;
    this.mostrarFormAjuste = false;
  }

  abrirModalAjuste(): void {
    this.cargarInventario();
    this.ajusteData = {
      variante_id: this.itemsTotales[0]?.variante_id || 0,
      tipo_ajuste: 'DANIO',
      cantidad_ajuste: -1,
      motivo: ''
    };
    this.mostrarFormAjuste = true;
    this.mostrarFormEntrada = false;
  }

  guardarEntrada(): void {
    if (!this.entradaData.variante_id || !this.entradaData.cantidad) return;
    this.guardando = true;

    const payload = {
      sucursal_id: this.sucursalSeleccionadaId,
      variante_id: this.entradaData.variante_id,
      cantidad: Number(this.entradaData.cantidad),
      motivo: this.entradaData.motivo,
      nro_documento: this.entradaData.nro_documento
    };

    this.http.post(`${this.apiBase}/inventario/entrada`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarFormEntrada = false;
          this.snackBar.open('Mercadería ingresada exitosamente', 'OK', { duration: 3000 });
          this.cargarInventario();
        },
        error: (err) => {
          this.guardando = false;
          this.snackBar.open(err?.error?.detail || 'Error al ingresar mercadería', 'Cerrar', { duration: 4000 });
        }
      });
  }

  guardarAjuste(): void {
    if (!this.ajusteData.variante_id || !this.ajusteData.cantidad_ajuste || !this.ajusteData.motivo) return;
    this.guardando = true;

    const payload = {
      sucursal_id: this.sucursalSeleccionadaId,
      variante_id: this.ajusteData.variante_id,
      tipo_ajuste: this.ajusteData.tipo_ajuste,
      cantidad_ajuste: Number(this.ajusteData.cantidad_ajuste),
      motivo: this.ajusteData.motivo
    };

    this.http.post(`${this.apiBase}/inventario/ajuste`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarFormAjuste = false;
          this.snackBar.open('Ajuste de stock registrado', 'OK', { duration: 3000 });
          this.cargarInventario();
        },
        error: (err) => {
          this.guardando = false;
          this.snackBar.open(err?.error?.detail || 'Error al registrar ajuste', 'Cerrar', { duration: 4000 });
        }
      });
  }
}
