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

export interface SucursalDisponibilidad {
  sucursal_id: number;
  sucursal_nombre: string;
  ciudad: string;
  stock_fisico: number;
  stock_reservado: number;
  stock_disponible: number;
  estado_stock: string;
}

export interface PrendaSucursalesDetalle {
  prenda_id: number;
  prenda_nombre: string;
  sucursales: SucursalDisponibilidad[];
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
      <!-- Encabezado con Título y Acciones Rápidas -->
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #1e293b;">[CU09] Inventario Físico Local por Sucursal</h2>
          <p class="text-muted m-0">Control de existencias reales (Físico vs Reservado vs Disponible), alertas de stock y recepción de mercadería</p>
        </div>
        <div class="d-flex gap-8">
          <button mat-raised-button color="primary" (click)="abrirModalEntrada()" style="height: 40px; font-weight: 600; border-radius: 8px;">
            <mat-icon class="m-r-6">add_box</mat-icon>
            Entrada de Mercadería
          </button>
          <button mat-stroked-button color="warn" (click)="abrirModalAjuste()" style="height: 40px; font-weight: 600; border-radius: 8px;">
            <mat-icon class="m-r-6">tune</mat-icon>
            Ajuste de Stock
          </button>
        </div>
      </div>

      <!-- PANEL DE CONTROL INTEGRADO Y ARMÓNICO (UNIFICADO) -->
      <mat-card class="m-b-16 bg-white panel-control-armonico">
        <mat-card-content class="p-16">
          <!-- Fila 1: Control de Sucursal y Filtro Local en Tabla -->
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-12 m-b-12">
            <!-- Selector de Sucursal Activa -->
            <div style="flex: 1.2; min-width: 250px;">
              <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
                <mat-label>Sucursal Activa</mat-label>
                <mat-icon matPrefix color="primary" class="m-r-6">storefront</mat-icon>
                <mat-select [(ngModel)]="sucursalSeleccionadaId" (selectionChange)="onSucursalChange()">
                  <mat-option *ngFor="let s of sucursales" [value]="s.id">
                    {{ s.nombre }} — ({{ s.ciudad }})
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Filtro rápido en la tabla de la sucursal actual -->
            <div style="flex: 1.8; min-width: 260px;">
              <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
                <mat-label>Filtrar en esta tabla (Nombre, SKU, Talla, Color)...</mat-label>
                <mat-icon matPrefix class="text-muted m-r-6">filter_alt</mat-icon>
                <input matInput [(ngModel)]="filtroLocal" (ngModelChange)="aplicarFiltros()" placeholder="Buscar prenda o código..." />
                <button *ngIf="filtroLocal" matSuffix mat-icon-button (click)="filtroLocal = ''; aplicarFiltros()" matTooltip="Limpiar filtro">
                  <mat-icon>close</mat-icon>
                </button>
              </mat-form-field>
            </div>

            <!-- Toggle de Alertas y Refresco -->
            <div class="d-flex align-items-center gap-12" style="white-space: nowrap;">
              <mat-slide-toggle [(ngModel)]="soloAlertas" (change)="aplicarFiltros()" color="warn" style="font-size: 13px; font-weight: 500;">
                Solo bajo stock
              </mat-slide-toggle>
              <button mat-icon-button (click)="cargarInventario()" matTooltip="Refrescar existencias" class="btn-refresh">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </div>

          <!-- Separador Armónico y Delicado -->
          <div class="divider-armonico m-b-12"></div>

          <!-- Fila 2: Buscador Multitienda en Toda la Red de Sucursales -->
          <div class="d-flex align-items-center gap-12 flex-wrap">
            <div class="d-flex align-items-center gap-6" style="min-width: 170px; color: #1e40af; font-weight: 600; font-size: 13px;">
              <mat-icon style="color: #2563eb; font-size: 20px; width: 20px; height: 20px;">travel_explore</mat-icon>
              <span>Consultar en Red:</span>
            </div>

            <div style="flex: 1; min-width: 250px;">
              <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
                <mat-label>Buscar prenda por nombre o código en todas las sucursales...</mat-label>
                <input matInput [(ngModel)]="busquedaGlobalPrenda" (keyup.enter)="buscarPrendasCadena()" placeholder="Ej. Chaqueta, Jeans, Vestido, Denim..." />
                <button *ngIf="busquedaGlobalPrenda" matSuffix mat-icon-button (click)="limpiarBusquedaGlobal()" matTooltip="Limpiar búsqueda">
                  <mat-icon>close</mat-icon>
                </button>
              </mat-form-field>
            </div>

            <button mat-raised-button color="primary" (click)="buscarPrendasCadena()" [disabled]="cargandoGlobal" class="btn-buscar-red">
              <mat-icon *ngIf="!cargandoGlobal" class="m-r-6">search</mat-icon>
              <mat-spinner *ngIf="cargandoGlobal" diameter="18" class="m-r-6"></mat-spinner>
              Buscar en Sucursales
            </button>
          </div>

          <!-- Indicador de Carga Global -->
          <div *ngIf="cargandoGlobal" class="d-flex align-items-center justify-content-center p-y-20">
            <mat-spinner diameter="32"></mat-spinner>
            <span class="m-l-12 text-muted" style="font-size: 13px;">Consultando existencias en tiempo real en todas las sucursales...</span>
          </div>

          <!-- Resultados de la Búsqueda Global -->
          <div *ngIf="!cargandoGlobal && busquedaRealizada" class="m-t-16">
            <div *ngIf="resultadosGlobales.length === 0" class="p-16 text-center text-muted" style="background-color: #f8fafc; border-radius: 8px;">
              <mat-icon style="font-size: 32px; height: 32px; width: 32px; color: #94a3b8;">search_off</mat-icon>
              <div class="m-t-4 font-weight-bold">No se encontraron prendas con "{{ busquedaGlobalPrenda }}"</div>
              <small>Intente con otro término o verifique la ortografía</small>
            </div>

            <div *ngIf="resultadosGlobales.length > 0">
              <div class="d-flex justify-content-between align-items-center m-b-10">
                <span class="font-weight-bold" style="color: #1e293b; font-size: 14px;">
                  Resultados en la cadena ({{ resultadosGlobales.length }} prenda{{ resultadosGlobales.length > 1 ? 's' : '' }}):
                </span>
                <button mat-button color="warn" (click)="limpiarBusquedaGlobal()" style="font-size: 12px; height: 28px; line-height: 28px;">
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">close</mat-icon>
                  Ocultar Resultados
                </button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div *ngFor="let p of resultadosGlobales" class="p-12" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <div class="d-flex align-items-center justify-content-between flex-wrap gap-8 m-b-10">
                    <div class="d-flex align-items-center gap-8">
                      <span class="badge bg-light-primary text-primary p-x-8 p-y-2 rounded font-weight-bold" style="font-size: 11px;">
                        {{ p.codigo || ('ROPA-' + p.id) }}
                      </span>
                      <strong style="font-size: 15px; color: #0f172a;">{{ p.nombre }}</strong>
                      <span class="text-muted" style="font-size: 12px;">({{ p.categoria_nombre }})</span>
                    </div>
                    <div>
                      <span class="text-muted font-weight-bold" style="font-size: 13px;">
                        Precio: Bs. {{ p.precio_promocional || p.precio_base | number:'1.2-2' }}
                      </span>
                      <span class="m-l-10 badge" [ngClass]="p.stock_disponible_cadena > 0 ? 'bg-light-success text-success' : 'bg-light-danger text-danger'">
                        {{ p.stock_disponible_cadena > 0 ? (p.stock_disponible_cadena + ' uds. en cadena') : 'Agotado en cadena' }}
                      </span>
                    </div>
                  </div>

                  <!-- Tabla de sucursales con esta prenda -->
                  <div class="table-responsive bg-white rounded" style="border: 1px solid #e2e8f0;">
                    <table class="w-full" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <thead>
                        <tr style="background-color: #f1f5f9; text-align: left; border-bottom: 1px solid #cbd5e1;">
                          <th style="padding: 8px 12px;">Sucursal / Ciudad</th>
                          <th style="padding: 8px 12px; text-align: center;">Stock Físico</th>
                          <th style="padding: 8px 12px; text-align: center;">Reservado</th>
                          <th style="padding: 8px 12px; text-align: center;">Disponible Venta</th>
                          <th style="padding: 8px 12px; text-align: center;">Estado</th>
                          <th style="padding: 8px 12px; text-align: right;">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let suc of obtenerSucursalesPrenda(p)" style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 8px 12px;">
                            <div class="d-flex align-items-center gap-6">
                              <mat-icon style="font-size: 16px; width: 16px; height: 16px; color: #475569;">store</mat-icon>
                              <strong>{{ suc.sucursal_nombre }}</strong>
                              <span class="text-muted">({{ suc.ciudad }})</span>
                              <span *ngIf="suc.sucursal_id === sucursalSeleccionadaId" class="badge bg-light-primary text-primary p-x-6 p-y-2 rounded" style="font-size: 10px;">
                                ACTUAL
                              </span>
                            </div>
                          </td>
                          <td style="padding: 8px 12px; text-align: center; font-weight: bold;">
                            {{ suc.stock_fisico }}
                          </td>
                          <td style="padding: 8px 12px; text-align: center;">
                            <span class="text-warning font-weight-bold">{{ suc.stock_reservado }}</span>
                          </td>
                          <td style="padding: 8px 12px; text-align: center;">
                            <span class="badge p-x-8 p-y-2 rounded font-weight-bold" [ngClass]="suc.stock_disponible > 0 ? 'bg-light-success text-success' : 'bg-light-danger text-danger'">
                              {{ suc.stock_disponible }}
                            </span>
                          </td>
                          <td style="padding: 8px 12px; text-align: center;">
                            <span [ngClass]="{
                              'badge-disponible': suc.estado_stock === 'DISPONIBLE',
                              'badge-bajo': suc.estado_stock === 'ULTIMAS_UNIDADES' || suc.estado_stock === 'BAJO_STOCK',
                              'badge-agotado': suc.estado_stock === 'AGOTADO'
                            }" class="badge-status">
                              {{ suc.estado_stock === 'ULTIMAS_UNIDADES' ? 'ÚLTIMAS UDS' : suc.estado_stock }}
                            </span>
                          </td>
                          <td style="padding: 8px 12px; text-align: right;">
                            <button mat-stroked-button color="primary" style="font-size: 11px; height: 28px; line-height: 28px; padding: 0 8px;"
                                    [disabled]="suc.sucursal_id === sucursalSeleccionadaId"
                                    (click)="seleccionarSucursal(suc.sucursal_id)">
                              <mat-icon style="font-size: 14px; width: 14px; height: 14px; margin-right: 4px;">swap_horiz</mat-icon>
                              {{ suc.sucursal_id === sucursalSeleccionadaId ? 'En esta sucursal' : 'Ver inventario aquí' }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- MODAL / POPUP DE DETALLE MULTISUCURSAL POR PRENDA -->
      <mat-card *ngIf="mostrarModalDetalle && prendaDetalle" class="m-b-16 p-16 bg-white" style="border: 2px solid #3b82f6; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);">
        <div class="d-flex align-items-center justify-content-between m-b-12">
          <div class="d-flex align-items-center gap-8">
            <mat-icon color="primary">hub</mat-icon>
            <div>
              <h3 class="m-0 font-weight-bold" style="color: #1e3a8a; font-size: 16px;">
                Disponibilidad Multitienda: {{ prendaDetalle.prenda_nombre }}
              </h3>
              <small class="text-muted">Desglose de existencias físicas y disponibles en todas las sucursales de la cadena</small>
            </div>
          </div>
          <button mat-icon-button (click)="cerrarModalDetalle()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="table-responsive">
          <table class="w-full table-bordered" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px 12px;">Sucursal</th>
                <th style="padding: 10px 12px;">Ciudad</th>
                <th style="padding: 10px 12px; text-align: center;">Stock Físico</th>
                <th style="padding: 10px 12px; text-align: center;">Stock Reservado</th>
                <th style="padding: 10px 12px; text-align: center;">Disponible Venta</th>
                <th style="padding: 10px 12px; text-align: center;">Estado</th>
                <th style="padding: 10px 12px; text-align: center;">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of prendaDetalle.sucursales" style="border-bottom: 1px solid #e2e8f0;" [style.backgroundColor]="s.sucursal_id === sucursalSeleccionadaId ? '#eff6ff' : 'white'">
                <td style="padding: 10px 12px; font-weight: bold;">
                  {{ s.sucursal_nombre }}
                  <span *ngIf="s.sucursal_id === sucursalSeleccionadaId" class="badge bg-light-primary text-primary p-x-6 p-y-2 rounded m-l-6" style="font-size: 10px;">
                    Seleccionada
                  </span>
                </td>
                <td style="padding: 10px 12px;">{{ s.ciudad }}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: bold; font-size: 15px;">
                  {{ s.stock_fisico }}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span class="badge bg-light-warning text-warning p-x-8 p-y-2 rounded font-weight-bold">
                    {{ s.stock_reservado }}
                  </span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span class="badge bg-light-success text-success p-x-10 p-y-4 rounded font-weight-bold" style="font-size: 14px;">
                    {{ s.stock_disponible }}
                  </span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span [ngClass]="{
                    'badge-disponible': s.estado_stock === 'DISPONIBLE',
                    'badge-bajo': s.estado_stock === 'BAJO_STOCK' || s.estado_stock === 'ULTIMAS_UNIDADES',
                    'badge-agotado': s.estado_stock === 'AGOTADO'
                  }" class="badge-status">
                    {{ s.estado_stock }}
                  </span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                  <button mat-raised-button color="primary" style="font-size: 11px; height: 30px; line-height: 30px;"
                          [disabled]="s.sucursal_id === sucursalSeleccionadaId"
                          (click)="seleccionarSucursal(s.sucursal_id)">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">storefront</mat-icon>
                    Ir a esta sucursal
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </mat-card>

      <!-- KPI METRIC CARDS (ARMONIOSAS Y EQUITATIVAS) -->
      <div class="kpi-grid-container m-b-20">
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
      <mat-card *ngIf="mostrarFormEntrada" class="m-b-20" style="border: 2px solid #22c55e; border-radius: 12px;">
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
      <mat-card *ngIf="mostrarFormAjuste" class="m-b-20" style="border: 2px solid #f97316; border-radius: 12px;">
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

      <!-- Tabla de Existencias de la Sucursal Activa -->
      <mat-card class="bg-white" style="border-radius: 12px; border: 1px solid #e2e8f0;">
        <mat-card-content>
          <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
            <mat-spinner diameter="46"></mat-spinner>
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
                    <strong style="font-size: 14px;">{{ element.ropa_nombre }}</strong>
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
                  <strong style="font-size: 15px;">{{ element.stock_fisico }}</strong>
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

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef style="text-align: center;">Disponibilidad Cadena</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <button mat-stroked-button color="primary" style="font-size: 11px; height: 30px; line-height: 30px; padding: 0 10px;"
                          (click)="consultarOtrasSucursales(element)" matTooltip="Ver stock de esta prenda en todas las sucursales">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;">storefront</mat-icon>
                    En Sucursales
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="!isLoading && itemsFiltrados.length === 0" class="p-32 text-center text-muted">
            <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #cbd5e1;">inventory</mat-icon>
            <h4 class="m-t-12">No se encontraron prendas con los filtros aplicados</h4>
            <p *ngIf="filtroLocal">Intente borrar o ajustar el término de búsqueda "{{ filtroLocal }}".</p>
            <p *ngIf="!filtroLocal">Haga clic en "Entrada de Mercadería" para cargar existencias físicas.</p>
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

    .panel-control-armonico {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.05);
    }

    .divider-armonico {
      height: 1px;
      background-color: #f1f5f9;
      border-bottom: 1px dashed #cbd5e1;
    }

    .btn-buscar-red {
      height: 48px;
      border-radius: 8px;
      font-weight: 600;
      padding: 0 18px;
    }

    .btn-refresh {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .btn-refresh:hover {
      background-color: #eff6ff;
      color: #2563eb;
    }

    .kpi-grid-container {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
    }

    @media (max-width: 1024px) {
      .kpi-grid-container {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
    }

    .kpi-card {
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.05);
      box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04);
    }
    .kpi-title { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-val { font-size: 24px; font-weight: 800; }
    .kpi-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.85; }

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

    .gap-6 { gap: 6px; }
    .gap-8 { gap: 8px; }
    .gap-10 { gap: 10px; }
    .gap-12 { gap: 12px; }
    .gap-16 { gap: 16px; }
  `]
})
export class InventarioFisicoComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['sku', 'prenda', 'variante', 'fisico', 'reservado', 'disponible', 'estado', 'acciones'];
  sucursales: any[] = [];
  sucursalSeleccionadaId: number = 1;
  resumen: ResumenInventario | null = null;
  itemsTotales: VarianteStockItem[] = [];
  itemsFiltrados: VarianteStockItem[] = [];

  // Búsqueda global entre sucursales
  busquedaGlobalPrenda: string = '';
  cargandoGlobal: boolean = false;
  busquedaRealizada: boolean = false;
  resultadosGlobales: any[] = [];

  // Modal / panel de disponibilidad de prenda seleccionada
  prendaDetalle: PrendaSucursalesDetalle | null = null;
  mostrarModalDetalle: boolean = false;

  // Filtro local en tabla activa
  filtroLocal: string = '';

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
    let filtrados = [...this.itemsTotales];

    if (this.soloAlertas) {
      filtrados = filtrados.filter(i => i.estado_stock === 'BAJO_STOCK' || i.estado_stock === 'AGOTADO');
    }

    if (this.filtroLocal && this.filtroLocal.trim() !== '') {
      const term = this.filtroLocal.trim().toLowerCase();
      filtrados = filtrados.filter(i =>
        (i.ropa_nombre && i.ropa_nombre.toLowerCase().includes(term)) ||
        (i.sku && i.sku.toLowerCase().includes(term)) ||
        (i.categoria_nombre && i.categoria_nombre.toLowerCase().includes(term)) ||
        (i.talla && i.talla.toLowerCase().includes(term)) ||
        (i.color && i.color.toLowerCase().includes(term)) ||
        (i.cod_barra && i.cod_barra.toLowerCase().includes(term))
      );
    }

    this.itemsFiltrados = filtrados;
  }

  // Búsqueda global de prendas en toda la cadena de sucursales
  buscarPrendasCadena(): void {
    const term = (this.busquedaGlobalPrenda || '').trim();
    if (!term) {
      this.snackBar.open('Ingrese el nombre o código de la prenda para buscar', 'OK', { duration: 3000 });
      return;
    }

    this.cargandoGlobal = true;
    this.busquedaRealizada = true;

    this.http.get<any[]>(`${this.apiBase}/catalogo-disponibilidad/?buscar=${encodeURIComponent(term)}&solo_con_stock=false`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cargandoGlobal = false;
          this.resultadosGlobales = Array.isArray(data) ? data : [];
        },
        error: (err) => {
          this.cargandoGlobal = false;
          console.error('Error al buscar prendas en sucursales:', err);
          this.snackBar.open('Error al consultar stock de la prenda en las sucursales', 'Cerrar', { duration: 4000 });
        }
      });
  }

  limpiarBusquedaGlobal(): void {
    this.busquedaGlobalPrenda = '';
    this.resultadosGlobales = [];
    this.busquedaRealizada = false;
  }

  // Extrae y consolida las sucursales y sus existencias para una prenda del catálogo
  obtenerSucursalesPrenda(prenda: any): SucursalDisponibilidad[] {
    const mapSucursales = new Map<number, SucursalDisponibilidad>();

    if (prenda.variantes && Array.isArray(prenda.variantes)) {
      for (const v of prenda.variantes) {
        if (v.disponibilidad_sucursales && Array.isArray(v.disponibilidad_sucursales)) {
          for (const s of v.disponibilidad_sucursales) {
            if (!mapSucursales.has(s.sucursal_id)) {
              mapSucursales.set(s.sucursal_id, {
                sucursal_id: s.sucursal_id,
                sucursal_nombre: s.sucursal_nombre,
                ciudad: s.ciudad,
                stock_fisico: s.stock_fisico || 0,
                stock_reservado: s.stock_reservado || 0,
                stock_disponible: s.stock_disponible || 0,
                estado_stock: s.estado_stock || 'DISPONIBLE'
              });
            } else {
              const exist = mapSucursales.get(s.sucursal_id)!;
              exist.stock_fisico += (s.stock_fisico || 0);
              exist.stock_reservado += (s.stock_reservado || 0);
              exist.stock_disponible += (s.stock_disponible || 0);
              exist.estado_stock = exist.stock_disponible > 5 ? 'DISPONIBLE' : (exist.stock_disponible > 0 ? 'ULTIMAS_UNIDADES' : 'AGOTADO');
            }
          }
        }
      }
    }

    return Array.from(mapSucursales.values());
  }

  // Consulta el desglose de existencias de una prenda específica en todas las tiendas
  consultarOtrasSucursales(item: VarianteStockItem): void {
    if (!item.ropa_id) return;

    this.http.get<PrendaSucursalesDetalle>(`${this.apiBase}/catalogo-disponibilidad/prendas/${item.ropa_id}/disponibilidad-sucursales`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.prendaDetalle = data;
          this.mostrarModalDetalle = true;
          // Hacer scroll suave hacia el modal de detalle
          setTimeout(() => {
            window.scrollTo({ top: 120, behavior: 'smooth' });
          }, 100);
        },
        error: (err) => {
          console.error('Error al consultar stock de la prenda:', err);
          this.snackBar.open('No se pudo obtener la disponibilidad en otras sucursales', 'Cerrar', { duration: 3000 });
        }
      });
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.prendaDetalle = null;
  }

  seleccionarSucursal(sucursalId: number): void {
    this.sucursalSeleccionadaId = sucursalId;
    this.cargarInventario();
    this.cerrarModalDetalle();
    this.snackBar.open('Mostrando existencias de la sucursal seleccionada', 'OK', { duration: 3000 });
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
