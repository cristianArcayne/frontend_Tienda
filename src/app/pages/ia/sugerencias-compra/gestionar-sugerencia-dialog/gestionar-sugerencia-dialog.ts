import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { PermisosService } from '../../../../services/permisos.service';
import { Proveedor } from '../../../../models/inventario/proveedor.model';
import { SugerenciaCompra, SugerenciaCompraDetalle } from '../../../../models/ia/sugerencia-compra.model';

@Component({
  selector: 'app-gestionar-sugerencia-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './gestionar-sugerencia-dialog.html',
  styleUrls: ['./gestionar-sugerencia-dialog.scss']
})
export class GestionarSugerenciaDialogComponent implements OnInit, OnDestroy {
  sugerencia: SugerenciaCompra;
  proveedores: Proveedor[] = [];
  selectedProveedorId: number | null;
  detalles: SugerenciaCompraDetalle[] = [];
  columnas: string[] = ['producto', 'cantidad_sugerida', 'costo_unitario_estimado', 'subtotal', 'acciones'];

  esPendiente: boolean;
  puedeGestionar: boolean;

  guardandoProveedor = false;
  aprobando = false;
  descartando = false;
  eliminandoId: number | null = null;

  private apiUrlProveedores: string;
  private apiUrlSugerencias: string;
  private apiUrlDetalles: string;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) data: { sugerencia: SugerenciaCompra },
    private apiService: ApiService,
    private configService: ConfigService,
    private permisosService: PermisosService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<GestionarSugerenciaDialogComponent>
  ) {
    this.sugerencia = data.sugerencia;
    this.selectedProveedorId = data.sugerencia.proveedor;
    this.detalles = data.sugerencia.detalles.map(d => ({ ...d }));
    this.esPendiente = data.sugerencia.estado === 'pendiente';
    this.puedeGestionar = this.esPendiente && this.permisosService.tiene(PermisosService.IA_CHANGE_SUGERENCIACOMPRA);
    this.apiUrlProveedores = this.configService.getApiUrl('proveedores');
    this.apiUrlSugerencias = this.configService.getApiUrl('ia/sugerencias-compra');
    this.apiUrlDetalles = this.configService.getApiUrl('ia/sugerencias-compra-detalles');
  }

  ngOnInit(): void {
    this.apiService.getWithPagination<Proveedor>(this.apiUrlProveedores, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.proveedores = data.results;
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open('Error al cargar proveedores', 'Cerrar', { duration: 4000 });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalEstimado(): number {
    return this.detalles.reduce((sum, d) => sum + d.cantidad_sugerida * d.costo_unitario_estimado, 0);
  }

  guardarProveedor(): void {
    if (!this.puedeGestionar) return;
    if (!this.selectedProveedorId || this.selectedProveedorId === this.sugerencia.proveedor) return;

    this.guardandoProveedor = true;
    this.apiService.patch<SugerenciaCompra>(this.apiUrlSugerencias, this.sugerencia.id, { proveedor: this.selectedProveedorId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (actualizada) => {
          this.sugerencia = { ...this.sugerencia, proveedor: actualizada.proveedor, proveedor_nombre: actualizada.proveedor_nombre };
          this.guardandoProveedor = false;
          this.snackBar.open('Proveedor actualizado', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          this.guardandoProveedor = false;
          const msg = err.error?.proveedor?.[0] || err.error?.detail || err.error?.[0] || 'Error al actualizar el proveedor';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
  }

  normalizarCantidad(item: SugerenciaCompraDetalle): void {
    if (!item.cantidad_sugerida || item.cantidad_sugerida < 1) {
      item.cantidad_sugerida = 1;
    }
  }

  normalizarCosto(item: SugerenciaCompraDetalle): void {
    if (item.costo_unitario_estimado == null || item.costo_unitario_estimado < 0) {
      item.costo_unitario_estimado = 0;
    }
  }

  guardarLinea(item: SugerenciaCompraDetalle): void {
    if (!this.puedeGestionar) return;
    this.apiService.patch<SugerenciaCompraDetalle>(this.apiUrlDetalles, item.id, {
      cantidad_sugerida: item.cantidad_sugerida,
      costo_unitario_estimado: item.costo_unitario_estimado,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => {
          this.snackBar.open('Error al guardar la línea', 'Cerrar', { duration: 3000 });
        }
      });
  }

  eliminarLinea(item: SugerenciaCompraDetalle): void {
    if (!this.puedeGestionar) return;
    this.eliminandoId = item.id;
    this.apiService.delete(this.apiUrlDetalles, item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.detalles = this.detalles.filter(d => d.id !== item.id);
          this.eliminandoId = null;
        },
        error: () => {
          this.eliminandoId = null;
          this.snackBar.open('Error al eliminar la línea', 'Cerrar', { duration: 3000 });
        }
      });
  }

  aprobar(): void {
    if (!this.puedeGestionar) return;
    if (!this.selectedProveedorId) {
      this.snackBar.open('Asigna un proveedor antes de aprobar', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.detalles.length === 0) {
      this.snackBar.open('La sugerencia no tiene líneas de detalle', 'Cerrar', { duration: 3000 });
      return;
    }

    this.aprobando = true;
    const url = `${this.configService.getApiBaseUrl()}/ia/sugerencias-compra/${this.sugerencia.id}/aprobar/`;
    this.http.post(url, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.aprobando = false;
          this.snackBar.open('Sugerencia aprobada: se generó la compra', 'OK', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.aprobando = false;
          const msg = err.error?.detail || err.error?.[0] || 'Error al aprobar la sugerencia';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
  }

  descartar(): void {
    if (!this.puedeGestionar) return;
    this.descartando = true;
    const url = `${this.configService.getApiBaseUrl()}/ia/sugerencias-compra/${this.sugerencia.id}/descartar/`;
    this.http.post(url, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.descartando = false;
          this.snackBar.open('Sugerencia descartada', 'OK', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.descartando = false;
          this.snackBar.open('Error al descartar la sugerencia', 'Cerrar', { duration: 3000 });
        }
      });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}