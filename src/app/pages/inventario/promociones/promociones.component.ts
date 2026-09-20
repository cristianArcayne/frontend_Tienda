import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface PrendaPromo {
  id: number;
  nombre: string;
  precio_base: number;
  precio_promocional: number;
  imagen_uri?: string;
  categoria_nombre?: string;
}

export interface PromocionItem {
  id: number;
  nombre: string;
  descripcion?: string;
  porcentaje_descuento: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  esta_vigente: boolean;
  estado_calculado: string;
  total_prendas_asociadas: number;
  prendas?: PrendaPromo[];
}

@Component({
  selector: 'app-ver-prendas-promo-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-20" style="max-width: 550px; min-width: 320px;">
      <div class="d-flex justify-content-between align-items-center m-b-16">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">
            Prendas en Promoción
          </h2>
          <span style="font-size: 13px; color: #e11d48; font-weight: 600;">
            {{ data.promo.nombre }} &bull; -{{ data.promo.porcentaje_descuento }}% de descuento
          </span>
        </div>
        <button mat-icon-button (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div *ngIf="!data.promo.prendas || data.promo.prendas.length === 0" class="p-24 text-center text-muted">
        <mat-icon style="font-size: 40px; height: 40px; width: 40px; color: #cbd5e1;">inventory_2</mat-icon>
        <p class="m-t-8">No hay prendas asociadas a esta campaña todavía.</p>
      </div>

      <div *ngIf="data.promo.prendas && data.promo.prendas.length > 0" style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
        <div *ngFor="let p of data.promo.prendas" class="d-flex align-items-center justify-content-between p-12" style="border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
          <div class="d-flex align-items-center gap-12">
            <img [src]="getImg(p.imagen_uri)" [alt]="p.nombre" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" (error)="onImgError($event)">
            <div>
              <strong style="font-size: 14px; color: #1e293b; display: block;">{{ p.nombre }}</strong>
              <span style="font-size: 12px; color: #64748b;">{{ p.categoria_nombre || 'Prenda' }}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #94a3b8; text-decoration: line-through;">BOB {{ p.precio_base | number:'1.2-2' }}</div>
            <div style="font-size: 15px; font-weight: 700; color: #dc2626;">BOB {{ p.precio_promocional | number:'1.2-2' }}</div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end m-t-16">
        <button mat-raised-button color="primary" (click)="dialogRef.close()">
          Cerrar
        </button>
      </div>
    </div>
  `
})
export class VerPrendasPromoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<VerPrendasPromoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { promo: PromocionItem }
  ) {}

  getImg(uri?: string): string {
    if (!uri) return 'assets/images/products/product-1.png';
    if (uri.startsWith('/static')) return `http://localhost:8000${uri}`;
    return uri;
  }

  onImgError(event: any): void {
    event.target.src = 'assets/images/products/product-1.png';
  }
}

@Component({
  selector: 'app-promociones',
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
    MatSlideToggleModule,
    MatSelectModule,
    MatButtonToggleModule
  ],
  template: `
    <div class="promociones-container">
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #1e293b;">[CU08] Gestión de Promociones y Descuentos</h2>
          <p class="text-muted m-0">Administración de campañas comerciales, porcentajes de rebaja y selección de prendas en oferta</p>
        </div>
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon class="m-r-8">local_offer</mat-icon>
          Nueva Promoción
        </button>
      </div>

      <!-- Formulario para Crear / Editar Campaña -->
      <mat-card *ngIf="mostrarForm" class="m-b-20" style="border: 2px solid #e11d48; border-radius: 12px;">
        <mat-card-header>
          <mat-card-title style="color: #e11d48; font-weight: 700;">
            {{ editandoId ? 'Editar Promoción #' + editandoId : 'Crear Nueva Campaña de Descuento' }}
          </mat-card-title>
          <mat-card-subtitle>Defina el porcentaje de rebaja, fechas de vigencia y ámbito de prendas a aplicar</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="p-t-16">
          <div class="row" style="display: flex; flex-wrap: wrap; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 2; min-width: 260px;">
              <mat-label>Título de la Promoción</mat-label>
              <input matInput [(ngModel)]="formData.nombre" placeholder="Ej. Cyber Fashion 20% OFF, Liquidación Invierno" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 160px;">
              <mat-label>% de Descuento</mat-label>
              <input matInput type="number" [(ngModel)]="formData.porcentaje_descuento" min="1" max="100" placeholder="Ej. 25" required />
            </mat-form-field>

            <div class="d-flex align-items-center" style="min-width: 140px;">
              <mat-slide-toggle [(ngModel)]="formData.activo" color="primary">
                {{ formData.activo ? 'Campaña Activa' : 'Campaña Inactiva' }}
              </mat-slide-toggle>
            </div>
          </div>

          <div class="row" style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 220px;">
              <mat-label>Fecha de Inicio</mat-label>
              <input matInput type="datetime-local" [(ngModel)]="formData.fecha_inicio" required />
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex: 1; min-width: 220px;">
              <mat-label>Fecha de Finalización</mat-label>
              <input matInput type="datetime-local" [(ngModel)]="formData.fecha_fin" required />
            </mat-form-field>
          </div>

          <div class="row" style="margin-top: 8px;">
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Descripción de la Campaña (Opcional)</mat-label>
              <textarea matInput [(ngModel)]="formData.descripcion" rows="2" placeholder="Detalles de la oferta para los clientes..."></textarea>
            </mat-form-field>
          </div>

          <!-- ÁMBITO DE APLICACIÓN DEL DESCUENTO -->
          <div class="m-t-16 p-16" style="background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 12px; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              <mat-icon style="color: #e11d48;">sell</mat-icon>
              <span>¿Dónde o a qué prendas se aplicará este descuento?</span>
            </div>

            <div class="d-flex flex-wrap gap-12 m-b-16">
              <mat-button-toggle-group [(ngModel)]="formData.modo_aplicacion" style="border-radius: 8px;">
                <mat-button-toggle value="categoria">
                  <mat-icon class="m-r-4">category</mat-icon> Por Categoría Completa
                </mat-button-toggle>
                <mat-button-toggle value="prendas">
                  <mat-icon class="m-r-4">check_box</mat-icon> Selección Manual de Prendas
                </mat-button-toggle>
                <mat-button-toggle value="todas">
                  <mat-icon class="m-r-4">select_all</mat-icon> Todo el Catálogo
                </mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            <!-- Modo Categoría -->
            <div *ngIf="formData.modo_aplicacion === 'categoria'">
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Seleccione la Categoría de Prendas</mat-label>
                <mat-select [(ngModel)]="formData.categoria_id" placeholder="Ej. Denim & Jeans, Vestidos & Fiesta">
                  <mat-option *ngFor="let cat of categorias" [value]="cat.id">
                    {{ cat.nombre }}
                  </mat-option>
                </mat-select>
                <mat-hint>El descuento del {{ formData.porcentaje_descuento }}% se aplicará automáticamente a todas las prendas de la categoría seleccionada.</mat-hint>
              </mat-form-field>
            </div>

            <!-- Modo Prendas Manuales -->
            <div *ngIf="formData.modo_aplicacion === 'prendas'">
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Seleccione las Prendas que tendrán Descuento</mat-label>
                <mat-select [(ngModel)]="formData.ropas_ids" multiple placeholder="Escoja una o más prendas...">
                  <mat-option *ngFor="let p of prendasDisponibles" [value]="p.id">
                    {{ p.nombre }} &bull; {{ p.categoria_nombre || 'General' }} (BOB {{ p.precio || p.precio_base }})
                  </mat-option>
                </mat-select>
                <mat-hint>{{ formData.ropas_ids.length }} prenda(s) seleccionada(s) para esta campaña.</mat-hint>
              </mat-form-field>
            </div>

            <!-- Modo Todo el Catálogo -->
            <div *ngIf="formData.modo_aplicacion === 'todas'" style="padding: 8px 0; color: #16a34a; font-weight: 500; font-size: 13px;">
              <mat-icon style="vertical-align: middle; margin-right: 4px;">verified</mat-icon>
              La rebaja se aplicará en todo el catálogo de FashionStore ({{ prendasDisponibles.length }} prendas activas).
            </div>
          </div>

          <div class="d-flex justify-content-end gap-12 m-t-16">
            <button mat-button (click)="cancelarFormulario()">Cancelar</button>
            <button mat-raised-button color="primary" [disabled]="!formData.nombre || !formData.porcentaje_descuento || guardando" (click)="guardarPromocion()">
              <mat-icon *ngIf="!guardando">check</mat-icon>
              <mat-spinner *ngIf="guardando" diameter="20"></mat-spinner>
              Guardar Promoción
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabla de Promociones -->
      <mat-card>
        <mat-card-content>
          <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
            <mat-spinner diameter="50"></mat-spinner>
          </div>

          <div *ngIf="!isLoading && promociones.length > 0" class="table-responsive">
            <table mat-table [dataSource]="promociones" class="w-full">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef style="width: 60px;">ID</th>
                <td mat-cell *matCellDef="let element">#{{ element.id }}</td>
              </ng-container>

              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Campaña</th>
                <td mat-cell *matCellDef="let element">
                  <div>
                    <strong style="font-size: 15px; color: #1e293b;">{{ element.nombre }}</strong>
                    <div *ngIf="element.descripcion" class="text-muted" style="font-size: 12px;">{{ element.descripcion }}</div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="descuento">
                <th mat-header-cell *matHeaderCellDef>Descuento</th>
                <td mat-cell *matCellDef="let element">
                  <span class="badge bg-danger text-white p-x-10 p-y-4 rounded font-weight-bold" style="font-size: 13px;">
                    -{{ element.porcentaje_descuento }}%
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="fechas">
                <th mat-header-cell *matHeaderCellDef>Vigencia</th>
                <td mat-cell *matCellDef="let element" style="font-size: 12px;">
                  <div><strong>Desde:</strong> {{ element.fecha_inicio | date:'dd/MM/yyyy HH:mm' }}</div>
                  <div><strong>Hasta:</strong> {{ element.fecha_fin | date:'dd/MM/yyyy HH:mm' }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="prendas">
                <th mat-header-cell *matHeaderCellDef>Prendas Aplicadas</th>
                <td mat-cell *matCellDef="let element">
                  <button mat-stroked-button
                          color="primary"
                          style="font-size: 12px; height: 32px; padding: 0 10px; border-radius: 6px;"
                          (click)="verPrendasDePromo(element)"
                          matTooltip="Ver prendas incluidas en el descuento">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">visibility</mat-icon>
                    {{ element.total_prendas_asociadas || (element.prendas?.length || 0) }} prendas
                  </button>
                </td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let element">
                  <span [ngClass]="{
                    'badge-activa': element.estado_calculado === 'ACTIVA',
                    'badge-inactiva': element.estado_calculado === 'INACTIVA',
                    'badge-expirada': element.estado_calculado === 'EXPIRADA'
                  }" class="badge-status">
                    {{ element.estado_calculado }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Acciones</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <button mat-icon-button color="primary" matTooltip="Editar promoción" (click)="editarPromocion(element)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" matTooltip="Eliminar promoción" (click)="eliminarPromocion(element)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <div *ngIf="!isLoading && promociones.length === 0" class="p-32 text-center text-muted">
            <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #f43f5e;">discount</mat-icon>
            <h4 class="m-t-12">No hay promociones registradas</h4>
            <p>Haga clic en "Nueva Promoción" para configurar una campaña de ofertas.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .badge { display: inline-block; }
    .bg-danger { background-color: #e11d48; }
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
    .badge-activa { background-color: #dcfce7; color: #15803d; }
    .badge-inactiva { background-color: #fee2e2; color: #b91c1c; }
    .badge-expirada { background-color: #f1f5f9; color: #64748b; }
  `]
})
export class PromocionesComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['id', 'nombre', 'descuento', 'fechas', 'prendas', 'estado', 'acciones'];
  promociones: PromocionItem[] = [];
  categorias: any[] = [];
  prendasDisponibles: any[] = [];

  isLoading = false;
  guardando = false;
  mostrarForm = false;
  editandoId: number | null = null;

  formData = {
    nombre: '',
    descripcion: '',
    porcentaje_descuento: 20,
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
    modo_aplicacion: 'categoria' as 'categoria' | 'prendas' | 'todas',
    categoria_id: null as number | null,
    ropas_ids: [] as number[]
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
    this.apiUrl = `${base}/promociones/`;
  }

  ngOnInit(): void {
    this.initDefaultDates();
    this.cargarPromociones();
    this.cargarCategorias();
    this.cargarPrendas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initDefaultDates(): void {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(now.getDate() + 30);

    this.formData.fecha_inicio = now.toISOString().slice(0, 16);
    this.formData.fecha_fin = nextMonth.toISOString().slice(0, 16);
  }

  cargarCategorias(): void {
    const url = this.configService.getApiUrl('categorias');
    this.http.get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.categorias = Array.isArray(data) ? data : (data?.results || []);
          if (this.categorias.length > 0 && !this.formData.categoria_id) {
            this.formData.categoria_id = this.categorias[0].id;
          }
        }
      });
  }

  cargarPrendas(): void {
    const url = this.configService.getApiUrl('catalogo');
    this.http.get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.prendasDisponibles = Array.isArray(data) ? data : (data?.results || []);
        }
      });
  }

  cargarPromociones(): void {
    this.isLoading = true;
    this.http.get<any>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.promociones = Array.isArray(data) ? data : (data?.results || []);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar promociones:', err);
          this.isLoading = false;
          this.snackBar.open('Error al cargar promociones', 'Cerrar', { duration: 4000 });
        }
      });
  }

  abrirFormulario(): void {
    this.editandoId = null;
    this.initDefaultDates();
    this.formData.nombre = '';
    this.formData.descripcion = '';
    this.formData.porcentaje_descuento = 20;
    this.formData.activo = true;
    this.formData.modo_aplicacion = 'categoria';
    this.formData.categoria_id = this.categorias.length > 0 ? this.categorias[0].id : null;
    this.formData.ropas_ids = [];
    this.mostrarForm = true;
  }

  editarPromocion(item: PromocionItem): void {
    this.editandoId = item.id;
    const ropasIds = (item.prendas || []).map(p => p.id);

    this.formData = {
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      porcentaje_descuento: item.porcentaje_descuento,
      fecha_inicio: item.fecha_inicio ? item.fecha_inicio.slice(0, 16) : '',
      fecha_fin: item.fecha_fin ? item.fecha_fin.slice(0, 16) : '',
      activo: item.activo,
      modo_aplicacion: ropasIds.length > 0 ? 'prendas' : 'categoria',
      categoria_id: null,
      ropas_ids: ropasIds
    };
    this.mostrarForm = true;
  }

  cancelarFormulario(): void {
    this.mostrarForm = false;
    this.editandoId = null;
  }

  verPrendasDePromo(promo: PromocionItem): void {
    this.dialog.open(VerPrendasPromoDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { promo }
    });
  }

  guardarPromocion(): void {
    if (!this.formData.nombre || !this.formData.porcentaje_descuento) return;
    this.guardando = true;

    let ropasIds: number[] | null = null;
    let catId: number | null = null;

    if (this.formData.modo_aplicacion === 'categoria') {
      catId = this.formData.categoria_id;
    } else if (this.formData.modo_aplicacion === 'prendas') {
      ropasIds = this.formData.ropas_ids;
    } else if (this.formData.modo_aplicacion === 'todas') {
      ropasIds = this.prendasDisponibles.map(p => p.id);
    }

    const payload: any = {
      nombre: this.formData.nombre,
      descripcion: this.formData.descripcion,
      porcentaje_descuento: Number(this.formData.porcentaje_descuento),
      fecha_inicio: new Date(this.formData.fecha_inicio).toISOString(),
      fecha_fin: new Date(this.formData.fecha_fin).toISOString(),
      activo: this.formData.activo,
      ropas_ids: ropasIds,
      categoria_id: catId
    };

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}${this.editandoId}/`, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Promoción actualizada con éxito', 'OK', { duration: 3000 });
            this.cargarPromociones();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al actualizar promoción', 'Cerrar', { duration: 4000 });
          }
        });
    } else {
      this.http.post(this.apiUrl, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarForm = false;
            this.snackBar.open('Promoción creada con éxito', 'OK', { duration: 3000 });
            this.cargarPromociones();
          },
          error: (err) => {
            this.guardando = false;
            this.snackBar.open(err?.error?.detail || 'Error al crear promoción', 'Cerrar', { duration: 4000 });
          }
        });
    }
  }

  eliminarPromocion(item: PromocionItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        titulo: 'Eliminar Promoción',
        mensaje: `¿Estás seguro de que deseas eliminar la promoción "${item.nombre}"?`
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmado => {
      if (!confirmado) return;

      this.http.delete(`${this.apiUrl}${item.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Promoción eliminada con éxito', 'OK', { duration: 3000 });
            this.cargarPromociones();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.detail || 'Error al eliminar promoción', 'Cerrar', { duration: 4000 });
          }
        });
    });
  }
}
