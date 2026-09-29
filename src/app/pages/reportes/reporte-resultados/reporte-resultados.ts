import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ReporteRespuesta } from '../../../models/reportes/reporte-respuesta.model';

export interface QueryInterpretada {
  periodo?: string;
  intencion?: string;
  mensaje?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-reporte-resultados',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './reporte-resultados.html',
  styleUrl: './reporte-resultados.scss'
})
export class ReporteResultadosComponent implements OnChanges {
  @Input() resultados: ReporteRespuesta | null = null;
  @Input() queryInterpretada: QueryInterpretada | null = null;

  filtroBusqueda = '';
  datosFiltrados: any[] = [];
  pageIndex = 0;
  pageSize = 15;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultados']) {
      this.datosFiltrados = this.resultados?.datos || [];
      this.filtroBusqueda = '';
      this.pageIndex = 0;
    }
  }

  get columnas(): string[] {
    if (!this.resultados?.datos?.length) return [];
    return Object.keys(this.resultados.datos[0]);
  }

  get datosPaginados(): any[] {
    const inicio = this.pageIndex * this.pageSize;
    return this.datosFiltrados.slice(inicio, inicio + this.pageSize);
  }

  onFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtroBusqueda = val;
    this.pageIndex = 0;
    if (!val) {
      this.datosFiltrados = this.resultados?.datos || [];
      return;
    }
    this.datosFiltrados = (this.resultados?.datos || []).filter(row =>
      Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(val))
    );
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get kpis() {
    if (!this.resultados?.datos?.length) return null;
    const datos = this.resultados.datos;
    const totalRegistros = this.resultados.paginacion?.total_registros || datos.length;

    const montoKey = Object.keys(datos[0]).find(k =>
      ['total', 'monto', 'monto_total', 'precio', 'subtotal', 'ingreso', 'ingresos', 'precio_total', 'total_bs', 'importe'].includes(k.toLowerCase())
    );

    const cantidadKey = Object.keys(datos[0]).find(k =>
      ['cantidad', 'total_vendido', 'stock', 'unidades', 'vendidos', 'cantidad_total', 'stock_actual'].includes(k.toLowerCase())
    );

    let totalMonto = 0;
    let tieneMonto = false;
    if (montoKey) {
      totalMonto = datos.reduce((acc, row) => {
        const val = parseFloat(row[montoKey]);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      tieneMonto = true;
    }

    let totalCantidad = 0;
    let tieneCantidad = false;
    if (cantidadKey) {
      totalCantidad = datos.reduce((acc, row) => {
        const val = parseFloat(row[cantidadKey]);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      tieneCantidad = true;
    }

    const promedioMonto = tieneMonto && datos.length > 0 ? (totalMonto / datos.length) : 0;

    return {
      totalRegistros,
      tieneMonto,
      totalMonto,
      promedioMonto,
      montoKey,
      tieneCantidad,
      totalCantidad,
      cantidadKey
    };
  }

  isCurrencyCol(col: string): boolean {
    return ['total', 'monto', 'monto_total', 'precio', 'subtotal', 'ingreso', 'ingresos', 'precio_total', 'total_bs', 'importe'].includes(col.toLowerCase());
  }

  isBadgeCol(col: string): boolean {
    return ['estado', 'status', 'tipo', 'metodo_pago'].includes(col.toLowerCase());
  }

  getBadgeClass(val: any): string {
    const s = String(val).toUpperCase();
    if (['COMPLETADA', 'PAGADO', 'ACTIVO', 'ENTREGADO', 'FINALIZADA', 'DISPONIBLE'].includes(s)) {
      return 'badge-success';
    }
    if (['PENDIENTE', 'RESERVADO', 'EN_CAMINO'].includes(s)) {
      return 'badge-warning';
    }
    if (['CANCELADA', 'ANULADO', 'INACTIVO', 'DEVUELTO', 'AGOTADO'].includes(s)) {
      return 'badge-danger';
    }
    return 'badge-neutral';
  }
}
