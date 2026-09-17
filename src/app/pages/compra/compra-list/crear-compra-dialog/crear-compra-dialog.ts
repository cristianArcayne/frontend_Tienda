import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';
import { ConfigService } from '../../../../services/config.service';
import { Proveedor } from '../../../../models/inventario/proveedor.model';
import { Compra } from '../../../../models/compra/compra.model';
import { CrearCompra, CrearDetalleCompra } from '../../../../models/compra/detalle-compra.model';

interface VarianteDisponible {
  id: number;
  sku: string;
  producto: number;
  producto_nombre: string;
}

interface ProductoConVariantes {
  producto_id: number;
  producto_nombre: string;
  variantes: VarianteDisponible[];
}

interface DetalleItem {
  variante_producto_id: number;
  sku: string;
  producto_nombre: string;
  cantidad: number;
  costo_unitario: number;
}

@Component({
  selector: 'app-crear-compra-dialog',
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
  ],
  templateUrl: './crear-compra-dialog.html',
  styleUrls: ['./crear-compra-dialog.scss']
})
export class CrearCompraDialogComponent implements OnInit, OnDestroy {
  proveedores: Proveedor[] = [];
  selectedProveedorId: number | null = null;

  variantes: VarianteDisponible[] = [];
  allProductGroups: ProductoConVariantes[] = [];
  filteredProductGroups: ProductoConVariantes[] = [];
  pagedProductGroups: ProductoConVariantes[] = [];

  searchTerm = '';
  currentPageProductos = 0;
  pageSizeProductos = 4;

  detalles: DetalleItem[] = [];
  displayedColumnsDetalles: string[] = ['producto', 'cantidad', 'costo_unitario', 'subtotal', 'acciones'];

  isLoading = false;
  isSaving = false;

  private apiUrlProveedores: string;
  private apiUrlVariantes: string;
  private apiUrlCompras: string;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<CrearCompraDialogComponent>
  ) {
    this.apiUrlProveedores = this.configService.getApiUrl('proveedores');
    this.apiUrlVariantes = this.configService.getApiUrl('variantes');
    this.apiUrlCompras = this.configService.getApiUrl('compras');
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.loadProveedores();
    this.loadVariantes();
  }

  get totalCompra(): number {
    return this.detalles.reduce((sum, item) => sum + item.cantidad * item.costo_unitario, 0);
  }

  get compraValida(): boolean {
    if (!this.selectedProveedorId || this.detalles.length === 0) return false;
    return this.detalles.every(d => d.cantidad > 0 && d.costo_unitario > 0);
  }

  loadProveedores(): void {
    this.apiService.getWithPagination<Proveedor>(this.apiUrlProveedores, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.proveedores = data.results;
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open('Error al cargar proveedores', 'Cerrar', { duration: 5000 });
        }
      });
  }

  loadVariantes(): void {
    this.apiService.getWithPagination<VarianteDisponible>(this.apiUrlVariantes, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.variantes = data.results;
          this.buildProductGroups();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open('Error al cargar variantes', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private buildProductGroups(): void {
    const grouped = new Map<number, ProductoConVariantes>();

    for (const v of this.variantes) {
      if (!grouped.has(v.producto)) {
        grouped.set(v.producto, {
          producto_id: v.producto,
          producto_nombre: v.producto_nombre,
          variantes: [],
        });
      }
      grouped.get(v.producto)!.variantes.push(v);
    }

    this.allProductGroups = Array.from(grouped.values());
    this.applyFilterAndPagination();
  }

  private applyFilterAndPagination(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredProductGroups = [...this.allProductGroups];
    } else {
      this.filteredProductGroups = this.allProductGroups.filter(g => {
        const matchProducto = g.producto_nombre.toLowerCase().includes(term);
        const matchSku = g.variantes.some(v => v.sku.toLowerCase().includes(term));
        return matchProducto || matchSku;
      });
    }

    const start = this.currentPageProductos * this.pageSizeProductos;
    const end = start + this.pageSizeProductos;
    this.pagedProductGroups = this.filteredProductGroups.slice(start, end);
  }

  onSearchChange(): void {
    this.currentPageProductos = 0;
    this.applyFilterAndPagination();
  }

  onPageChangeProductos(event: PageEvent): void {
    this.currentPageProductos = event.pageIndex;
    this.applyFilterAndPagination();
  }

  agregarDetalle(variante: VarianteDisponible): void {
    const existente = this.detalles.find(d => d.variante_producto_id === variante.id);

    if (existente) {
      existente.cantidad += 1;
      return;
    }

    this.detalles = [
      ...this.detalles,
      {
        variante_producto_id: variante.id,
        sku: variante.sku,
        producto_nombre: variante.producto_nombre,
        cantidad: 1,
        costo_unitario: 0,
      }
    ];
  }

  normalizarCantidad(item: DetalleItem): void {
    if (!item.cantidad || item.cantidad < 1) {
      item.cantidad = 1;
    }
  }

  normalizarCosto(item: DetalleItem): void {
    if (item.costo_unitario == null || item.costo_unitario < 0) {
      item.costo_unitario = 0;
    }
  }

  eliminarDetalle(index: number): void {
    this.detalles = this.detalles.filter((_, i) => i !== index);
  }

  guardarCompra(): void {
    if (!this.compraValida) {
      this.snackBar.open('Completa proveedor, cantidades y costos antes de guardar', 'Cerrar', { duration: 4000 });
      return;
    }

    const detallesPayload: CrearDetalleCompra[] = this.detalles.map(item => ({
      variante_producto_id: item.variante_producto_id,
      cantidad: item.cantidad,
      costo_unitario: item.costo_unitario,
    }));

    const payload: CrearCompra = {
      proveedor_id: this.selectedProveedorId!,
      total: this.totalCompra,
      detalles: detallesPayload,
    };

    this.isSaving = true;
    this.apiService.create<Compra>(this.apiUrlCompras, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (compra) => {
          this.isSaving = false;
          this.snackBar.open(`Compra #${compra.id} creada exitosamente`, 'OK', { duration: 3000 });
          this.dialogRef.close(compra);
        },
        error: (err) => {
          const msg = err.error?.detail || err.error?.[0] || 'Error al crear la compra';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
