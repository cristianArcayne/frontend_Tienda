import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import {
  CaracteristicaComparacion,
  ComparadorResponse,
  ComparadorService,
  ProductoSeleccionadoComparador,
  ProductoComparado
} from 'src/app/services/comparador.service';

@Component({
  selector: 'app-comparador',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    MatSnackBarModule
  ],
  templateUrl: './comparador.html',
  styleUrls: ['./comparador.scss']
})
export class ComparadorComponent implements OnInit, OnDestroy {
  productoIds: number[] = [];
  productosSeleccionados: ProductoSeleccionadoComparador[] = [];
  respuesta: ComparadorResponse | null = null;
  cargando = false;
  error = '';
  tenantSchema = '';

  private destroy$ = new Subject<void>();

  constructor(
    public comparadorService: ComparadorService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.tenantSchema = this.comparadorService.getTenantSchema();

    this.comparadorService.ids$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ids => {
        this.productoIds = ids;
        this.cargarComparacion();
      });

    this.comparadorService.seleccionados$
      .pipe(takeUntil(this.destroy$))
      .subscribe(productos => {
        this.productosSeleccionados = productos;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarComparacion(): void {
    this.error = '';
    this.respuesta = null;

    if (this.productoIds.length < this.comparadorService.minProductos) {
      return;
    }

    this.cargando = true;
    this.comparadorService.comparar(this.productoIds).subscribe({
      next: (respuesta) => {
        this.respuesta = respuesta;
        this.cargando = false;
      },
      error: (error) => {
        this.error = this.obtenerMensajeError(error);
        this.cargando = false;
        this.snackBar.open(this.error, 'Cerrar', { duration: 5000 });
      }
    });
  }

  quitar(productoId: number): void {
    this.comparadorService.quitar(productoId);
  }

  vaciar(): void {
    this.comparadorService.vaciar();
    this.snackBar.open('Comparador vaciado', 'Cerrar', { duration: 2500 });
  }

  irCatalogo(): void {
    this.router.navigate(['/extra/catalogo']);
  }

  verDetalle(productoId: number): void {
    this.router.navigate(['/inventario/productos', productoId]);
  }

  nombreProductoSeleccionado(producto: ProductoSeleccionadoComparador): string {
    const productoDesdeRespuesta = this.respuesta?.productos.find(item => item.id === producto.id);
    return productoDesdeRespuesta?.nombre || producto.nombre;
  }

  valorCaracteristica(caracteristica: CaracteristicaComparacion, producto: ProductoComparado): string | number {
    const valor = caracteristica.valores[String(producto.id)];
    
    if (valor === null || valor === undefined || valor === '') {
      return '-';
    }
    
    // Si el valor es un objeto de descuento, extraer el valor_descuento
    if (typeof valor === 'object' && valor !== null && 'valor_descuento' in valor) {
      return (valor as any).valor_descuento;
    }
    
    return valor;
  }

  trackProducto(_: number, producto: ProductoComparado): number {
    return producto.id;
  }

  trackCaracteristica(_: number, caracteristica: CaracteristicaComparacion): string {
    return caracteristica.campo;
  }

  private obtenerMensajeError(error: any): string {
    const detalle = error?.error;

    if (detalle?.producto_ids?.length) {
      return detalle.producto_ids[0];
    }

    if (detalle?.detail) {
      return detalle.detail;
    }

    if (detalle?.error) {
      return detalle.error;
    }

    return 'No se pudo cargar la comparacion';
  }
}
