import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import {
  CompraHistorial,
  FiltrosHistorialCompras,
  HistorialComprasService
} from 'src/app/services/historial-compras.service';

@Component({
  selector: 'app-historial-compras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    MatSnackBarModule
  ],
  templateUrl: './historial-compras.component.html',
  styleUrls: ['./historial-compras.component.scss']
})
export class HistorialComprasComponent implements OnInit {
  compras: CompraHistorial[] = [];
  totalCompras = 0;
  pageSize = 10;
  pageIndex = 0;
  cargando = false;
  tenantSchema = '';

  estadoFiltro: string | null = null;
  fechaDesdeFiltro: string | null = null;
  fechaHastaFiltro: string | null = null;

  readonly estados = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private historialComprasService: HistorialComprasService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.tenantSchema = this.historialComprasService.getTenantSchema();
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando = true;

    this.historialComprasService.listar(
      this.pageIndex + 1,
      this.pageSize,
      this.getFiltros()
    ).subscribe({
      next: (data) => {
        this.compras = data.results || [];
        this.totalCompras = data.count || 0;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar historial de compras:', error);
        this.cargando = false;
        this.snackBar.open('Error al cargar historial de compras', 'Cerrar', { duration: 4000 });
      }
    });
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.cargarHistorial();
  }

  limpiarFiltros(): void {
    this.estadoFiltro = null;
    this.fechaDesdeFiltro = null;
    this.fechaHastaFiltro = null;
    this.aplicarFiltros();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarHistorial();
  }

  estadoLabel(estado: string): string {
    return this.estados.find(item => item.value === estado)?.label || estado;
  }

  totalProductos(compra: CompraHistorial): number {
    if (compra.cantidad_productos !== null && compra.cantidad_productos !== undefined) {
      return compra.cantidad_productos;
    }

    return (compra.productos || []).reduce((total, producto) => total + Number(producto.cantidad || 0), 0);
  }

  trackCompra(_: number, compra: CompraHistorial): number {
    return compra.compra_id;
  }

  trackProducto(_: number, producto: { id: number }): number {
    return producto.id;
  }

  private getFiltros(): FiltrosHistorialCompras {
    return {
      estado: this.estadoFiltro,
      fecha_desde: this.fechaDesdeFiltro,
      fecha_hasta: this.fechaHastaFiltro
    };
  }
}
