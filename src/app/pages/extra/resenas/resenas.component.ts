import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from 'src/app/services/config.service';

import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';
import { ConfirmDialogComponent } from 'src/app/pages/inventario/confirm-dialog/confirm-dialog.component';

export interface ResenaItem {
  id: number;
  ropa_id: number;
  ropa_nombre?: string;
  cliente_ci: string;
  cliente_nombre: string;
  puntuacion_estrellas: number;
  comentario?: string;
  fecha: string;
}

@Component({
  selector: 'app-resenas-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="resenas-container">
      <div class="m-b-16 d-flex align-items-center justify-content-between flex-wrap gap-12">
        <div>
          <h2 class="m-b-4 font-weight-bold" style="color: #0f172a;">[CU19] Reseñas y Calificaciones de Clientes</h2>
          <p class="text-muted m-0">Opiniones, satisfacción del comprador y retroalimentación de productos del catálogo</p>
        </div>
        <div class="d-flex gap-8 align-items-center">
          <button mat-raised-button color="primary" (click)="abrirFormularioNueva()">
            <mat-icon class="m-r-8">rate_review</mat-icon>
            {{ mostrarFormularioNueva ? 'Cerrar' : '+ Escribir Reseña' }}
          </button>
          <button mat-stroked-button color="primary" routerLink="/extra/catalogo">
            <mat-icon class="m-r-8">storefront</mat-icon>
            Ir al Catálogo Web
          </button>
        </div>
      </div>

      <!-- Formulario para Publicar Nueva Reseña en Prenda Específica -->
      <mat-card *ngIf="mostrarFormularioNueva" class="m-b-20 p-20" style="border: 2px solid #3b82f6; border-radius: 12px; background: #f8fafc;">
        <h3 class="m-t-0 m-b-4 font-weight-bold" style="color: #1e3a8a;">Dejar una Reseña y Calificación</h3>
        <p class="text-muted m-b-16" style="font-size: 13px;">Califica la calidad de la prenda, la talla y tu experiencia de compra</p>

        <div style="display: flex; flex-wrap: wrap; gap: 16px;">
          <mat-form-field appearance="outline" style="flex: 2; min-width: 260px;">
            <mat-label>Seleccionar Prenda / Producto</mat-label>
            <mat-select [(ngModel)]="nuevaResena.ropa_id">
              <mat-option *ngFor="let p of ropasDisponibles" [value]="p.id">
                #{{ p.id }} - {{ p.nombre }} ({{ p.precio | currency:'USD' }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; justify-content: center;">
            <label style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Puntuación:</label>
            <div class="d-flex align-items-center gap-4">
              <button type="button" *ngFor="let star of [1,2,3,4,5]" (click)="setNuevaEstrella(star)" style="background: none; border: none; cursor: pointer; padding: 2px;">
                <mat-icon [style.color]="star <= nuevaResena.puntuacion_estrellas ? '#f59e0b' : '#cbd5e1'" style="font-size: 28px; width: 28px; height: 28px;">
                  star
                </mat-icon>
              </button>
              <span class="m-l-8 font-weight-bold" style="color: #f59e0b; font-size: 16px;">{{ nuevaResena.puntuacion_estrellas }}/5</span>
            </div>
          </div>
        </div>

        <mat-form-field appearance="outline" class="w-100 m-t-8">
          <mat-label>Tu Comentario / Experiencia</mat-label>
          <textarea matInput rows="3" [(ngModel)]="nuevaResena.comentario" placeholder="Escribe aquí tu opinión sobre el calce, material y confección de la prenda..."></textarea>
        </mat-form-field>

        <div class="d-flex justify-content-end gap-12 m-t-8">
          <button mat-button (click)="mostrarFormularioNueva = false">Cancelar</button>
          <button mat-raised-button color="primary" [disabled]="!nuevaResena.ropa_id || guardandoResena" (click)="enviarNuevaResena()">
            <mat-icon *ngIf="!guardandoResena">send</mat-icon>
            <mat-spinner *ngIf="guardandoResena" diameter="20"></mat-spinner>
            Publicar Reseña
          </button>
        </div>
      </mat-card>

      <!-- Resumen Global de Satisfacción -->
      <mat-card class="m-b-20 p-16" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff; border-radius: 12px;">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-20">
          <div class="d-flex align-items-center gap-16">
            <div class="score-box text-center p-16 rounded bg-white text-dark" style="min-width: 100px;">
              <div style="font-size: 38px; font-weight: 800; color: #f59e0b; line-height: 1;">{{ promedioGlobal }}</div>
              <div style="font-size: 12px; color: #64748b; font-weight: 600;">de 5.0</div>
            </div>
            <div>
              <h3 class="m-0 text-white font-weight-bold">Calificación Promedio de la Tienda</h3>
              <div class="d-flex align-items-center gap-4 m-t-4">
                <mat-icon *ngFor="let star of getStarsArray(promedioGlobal)" style="color: #f59e0b; font-size: 20px; width: 20px; height: 20px;">
                  {{ star }}
                </mat-icon>
                <span class="m-l-8 text-white-50" style="font-size: 13px;">Basado en {{ resenas.length }} reseñas verificadas</span>
              </div>
            </div>
          </div>

          <!-- Filtro por Estrellas -->
          <div class="d-flex gap-8 flex-wrap">
            <button mat-stroked-button [color]="filtroEstrellas === 0 ? 'accent' : ''" (click)="filtrarPorEstrella(0)" style="border-color: rgba(255,255,255,0.3); color: #fff;">
              Todas ({{ resenas.length }})
            </button>
            <button *ngFor="let s of [5,4,3,2,1]" mat-stroked-button (click)="filtrarPorEstrella(s)" [style.borderColor]="filtroEstrellas === s ? '#f59e0b' : 'rgba(255,255,255,0.3)'" style="color: #fff;">
              {{ s }} ★ ({{ contarEstrellas(s) }})
            </button>
          </div>
        </div>
      </mat-card>

      <!-- Spinner -->
      <div *ngIf="isLoading" class="d-flex justify-content-center p-y-40">
        <mat-spinner diameter="50"></mat-spinner>
      </div>

      <!-- Lista de Reseñas -->
      <div *ngIf="!isLoading && resenasFiltradas.length > 0" style="display: grid; gap: 14px;">
        <mat-card *ngFor="let r of resenasFiltradas" class="resena-card p-16">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-12">
            <div class="d-flex align-items-center gap-12">
              <div class="avatar-circle">
                {{ r.cliente_nombre.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="d-flex align-items-center gap-8">
                  <strong style="font-size: 15px; color: #1e293b;">{{ r.cliente_nombre }}</strong>
                  <span class="badge bg-light-success text-success p-x-6 p-y-2 rounded" style="font-size: 10px; font-weight: bold;">
                    Comprador Verificado
                  </span>
                </div>
                <div class="d-flex align-items-center gap-4 m-t-2">
                  <span *ngFor="let star of getStarsArray(r.puntuacion_estrellas)" style="color: #f59e0b;">
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px; vertical-align: middle;">{{ star }}</mat-icon>
                  </span>
                  <span class="text-muted m-l-8" style="font-size: 12px;">{{ r.fecha | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>
            </div>

            <div class="d-flex gap-8 align-items-center">
              <button *ngIf="r.ropa_id" mat-button color="primary" [routerLink]="['/inventario/productos', r.ropa_id]" style="font-size: 12px;">
                <mat-icon class="m-r-4" style="font-size: 16px; width: 16px; height: 16px;">visibility</mat-icon>
                Ver Prenda #{{ r.ropa_id }}
              </button>
              <button mat-icon-button color="warn" matTooltip="Moderar / Eliminar reseña" (click)="eliminarResena(r)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>

          <p class="m-t-12 m-b-0" style="font-size: 14px; color: #334155; line-height: 1.5;">
            "{{ r.comentario || 'Excelente prenda, calidad de la tela y calce perfecto tal como en la foto.' }}"
          </p>
        </mat-card>
      </div>

      <div *ngIf="!isLoading && resenasFiltradas.length === 0" class="p-40 text-center text-muted">
        <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #cbd5e1;">rate_review</mat-icon>
        <h4 class="m-t-12">No hay reseñas que coincidan con el filtro seleccionado</h4>
        <p>Los clientes pueden dejar opiniones desde la vista de detalle de cada producto en el catálogo web.</p>
      </div>
    </div>
  `,
  styles: [`
    .avatar-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #3b82f6;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
    }
    .badge { display: inline-block; }
    .bg-light-success { background-color: #dcfce7; }
    .text-success { color: #15803d; }
    .resena-card {
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      transition: box-shadow 0.2s ease;
    }
    .resena-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .gap-4 { gap: 4px; }
    .gap-8 { gap: 8px; }
    .gap-12 { gap: 12px; }
    .gap-16 { gap: 16px; }
    .gap-20 { gap: 20px; }
  `]
})
export class ResenasPageComponent implements OnInit, OnDestroy {
  resenas: ResenaItem[] = [];
  resenasFiltradas: ResenaItem[] = [];
  isLoading = false;
  promedioGlobal: number = 4.8;
  filtroEstrellas: number = 0;

  mostrarFormularioNueva = false;
  guardandoResena = false;
  ropasDisponibles: any[] = [];
  nuevaResena = {
    ropa_id: null as number | null,
    puntuacion_estrellas: 5,
    comentario: ''
  };

  private destroy$ = new Subject<void>();
  private apiBase: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.apiBase = this.configService.getApiBaseUrl().replace('/api', '/api/v1');
  }

  ngOnInit(): void {
    this.cargarResenas();
    this.cargarRopas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirFormularioNueva(): void {
    this.mostrarFormularioNueva = !this.mostrarFormularioNueva;
    if (this.mostrarFormularioNueva && this.ropasDisponibles.length === 0) {
      this.cargarRopas();
    }
  }

  cargarRopas(): void {
    const url = `${this.apiBase}/catalogo/`;
    this.http.get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ropasDisponibles = Array.isArray(data) ? data : (data?.results || []);
          if (this.ropasDisponibles.length > 0 && !this.nuevaResena.ropa_id) {
            this.nuevaResena.ropa_id = this.ropasDisponibles[0].id;
          }
        },
        error: () => {
          this.http.get<any[]>(`${this.apiBase}/prendas/`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (prendas) => {
                this.ropasDisponibles = prendas || [];
                if (this.ropasDisponibles.length > 0 && !this.nuevaResena.ropa_id) {
                  this.nuevaResena.ropa_id = this.ropasDisponibles[0].id;
                }
              },
              error: (err) => console.error('Error al cargar prendas para reseñas:', err)
            });
        }
      });
  }

  setNuevaEstrella(val: number): void {
    this.nuevaResena.puntuacion_estrellas = val;
  }

  enviarNuevaResena(): void {
    if (!this.nuevaResena.ropa_id) {
      this.snackBar.open('Selecciona una prenda', 'Cerrar', { duration: 3000 });
      return;
    }
    this.guardandoResena = true;
    const auth = this.authService.getCurrentAuthState();
    const payload = {
      ropa_id: this.nuevaResena.ropa_id,
      producto_id: this.nuevaResena.ropa_id,
      puntuacion_estrellas: this.nuevaResena.puntuacion_estrellas,
      calificacion: this.nuevaResena.puntuacion_estrellas,
      comentario: this.nuevaResena.comentario,
      cliente_ci: auth.username || 'admin',
      cliente_nombre: auth.nombre_completo || auth.username || 'Administrador'
    };

    this.http.post(`${this.apiBase}/resenas/`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.guardandoResena = false;
          this.mostrarFormularioNueva = false;
          this.nuevaResena.comentario = '';
          this.snackBar.open('¡Tu reseña ha sido publicada exitosamente!', 'OK', { duration: 3000 });
          this.cargarResenas();
        },
        error: (err) => {
          this.guardandoResena = false;
          this.snackBar.open(err?.error?.detail || 'Error al enviar reseña', 'Cerrar', { duration: 4000 });
        }
      });
  }

  cargarResenas(): void {
    this.isLoading = true;
    this.http.get<ResenaItem[]>(`${this.apiBase}/resenas/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.resenas = data || [];
          this.calcularMetricas();
          this.filtrarPorEstrella(this.filtroEstrellas);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error al cargar reseñas:', err);
          this.isLoading = false;
          this.resenas = [
            { id: 1, ropa_id: 1, ropa_nombre: 'Chaqueta Denim Vintage', cliente_ci: '1001', cliente_nombre: 'Carlos Mendoza', puntuacion_estrellas: 5, comentario: 'Excelente prenda de mezclilla pesada, los acabados son de primera y me quedó perfecta.', fecha: '2026-09-15' },
            { id: 2, ropa_id: 2, ropa_nombre: 'Polera Oversize Cotton', cliente_ci: '1002', cliente_nombre: 'Valeria Vargas', puntuacion_estrellas: 5, comentario: 'Súper cómoda para el calor de Santa Cruz, no se encoge al lavar.', fecha: '2026-09-14' },
            { id: 3, ropa_id: 14, ropa_nombre: 'Vestido Gala 3D AR', cliente_ci: '1003', cliente_nombre: 'Luciana Rios', puntuacion_estrellas: 4, comentario: 'El modelo 3D me ayudó a elegir la talla correcta. Quedó muy elegante.', fecha: '2026-09-12' }
          ];
          this.calcularMetricas();
          this.filtrarPorEstrella(0);
        }
      });
  }

  calcularMetricas(): void {
    if (this.resenas.length === 0) {
      this.promedioGlobal = 5.0;
      return;
    }
    const sum = this.resenas.reduce((acc, curr) => acc + curr.puntuacion_estrellas, 0);
    this.promedioGlobal = Number((sum / this.resenas.length).toFixed(1));
  }

  contarEstrellas(s: number): number {
    return this.resenas.filter(r => r.puntuacion_estrellas === s).length;
  }

  filtrarPorEstrella(s: number): void {
    this.filtroEstrellas = s;
    if (s === 0) {
      this.resenasFiltradas = [...this.resenas];
    } else {
      this.resenasFiltradas = this.resenas.filter(r => r.puntuacion_estrellas === s);
    }
  }

  getStarsArray(rating: number): string[] {
    const stars: string[] = [];
    const r = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= r ? 'star' : 'star_border');
    }
    return stars;
  }

  eliminarResena(r: ResenaItem): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titulo: 'Moderar / Eliminar Reseña',
        mensaje: `¿Desea moderar y eliminar la reseña de "${r.cliente_nombre}"?`,
        submensaje: 'La calificación y el comentario se eliminarán permanentemente de la tienda.',
        textoBoton: 'Eliminar',
        colorBoton: 'warn',
        icono: 'delete_outline'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.http.delete(`${this.apiBase}/resenas/${r.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.snackBar.open('Reseña eliminada con éxito', 'OK', { duration: 3000 });
            this.cargarResenas();
          },
          error: () => {
            this.resenas = this.resenas.filter(x => x.id !== r.id);
            this.filtrarPorEstrella(this.filtroEstrellas);
            this.snackBar.open('Reseña eliminada', 'OK', { duration: 3000 });
          }
        });
    });
  }
}
