import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CartService, Carrito } from '../../../services/cart.service';
import { ConfigService } from '../../../services/config.service';
import { ConfiguracionEmpresaService } from '../../../services/configuracion-empresa.service';
import { Producto } from '../../../models/inventario/producto.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProcesarPagoDialogComponent } from '../../venta/detalle-venta/procesar-pago-dialog/procesar-pago-dialog';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './carrito.html',
  styleUrls: ['./carrito.scss']
})
export class CarritoComponent implements OnInit {
  carrito: Carrito | null = null;
  sucursales: any[] = [];
  sucursalSeleccionadaId: number = 1;
  displayedColumns: string[] = ['producto', 'precio', 'cantidad', 'subtotal', 'acciones'];
  productosRecomendados: Producto[] = [];
  variantesRecomendados: { [productoId: number]: any[] } = {};
  idsEnCarrito = new Set<number>();

  constructor(
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private configService: ConfigService,
    private dialog: MatDialog,
    private configuracionService: ConfiguracionEmpresaService,
  ) {}

  ngOnInit(): void {
    this.cargarSucursales();
    this.cartService.carrito$.subscribe(carrito => {
      this.carrito = carrito;
      this.cargarRecomendados();
    });
  }

  cargarSucursales(): void {
    const url = this.configService.getApiUrl('sucursales');
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.sucursales = Array.isArray(res) ? res : (res.results || []);
        if (this.sucursales.length > 0) {
          this.sucursalSeleccionadaId = this.sucursales[0].id;
        }
      }
    });
  }

  private cargarRecomendados(): void {
    const detalles = this.carrito?.detalles || [];
    if (detalles.length === 0) {
      this.productosRecomendados = [];
      this.variantesRecomendados = {};
      return;
    }

    const productoIds = [...new Set(detalles.map(d => d.variante_producto_info.producto))];
    this.idsEnCarrito = new Set(productoIds);

    const baseUrl = this.configService.getApiUrl('productos');
    const requests = productoIds.map(id =>
      this.http.get<Producto[]>(`${baseUrl}${id}/recomendados/`).pipe(
        catchError(() => of([]))
      )
    );

    forkJoin(requests).subscribe(results => {
      const seen = new Set<number>();
      this.productosRecomendados = results
        .flat()
        .filter(p => !this.idsEnCarrito.has(p.id))
        .filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        })
        .slice(0, 8);
    });
  }

  actualizarCantidad(varianteId: number, event: any): void {
    const cantidad = parseInt(event.target.value, 10);
    if (cantidad > 0) {
      this.cartService.actualizarCantidad(varianteId, cantidad).subscribe({
        error: (err) => {
          this.snackBar.open(err.error?.detail || err.error?.error || 'Error al actualizar', 'Cerrar', { duration: 3000 });
          this.cartService.cargarCarrito();
        }
      });
    }
  }


  agregarRecomendado(productoId: number, varianteId: number): void {
    this.cartService.agregarProducto(varianteId).subscribe({
      next: () => {
        this.snackBar.open('Prenda agregada al carrito', 'Cerrar', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error al agregar al carrito', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminarItem(varianteId: number): void {
    this.cartService.eliminarProducto(varianteId).subscribe(() => {
      this.snackBar.open('Producto eliminado del carrito', 'Cerrar', { duration: 2000 });
    });
  }

  vaciarCarrito(): void {
    this.cartService.vaciarCarrito().subscribe(() => {
      this.snackBar.open('Carrito vaciado', 'Cerrar', { duration: 2000 });
    });
  }

  totalConDescuento(): number {
    if (!this.carrito) return 0;
    const beneficio = this.carrito.beneficio_fidelizacion;
    if (!beneficio?.elegible) return this.carrito.total;
    return Math.max(0, this.carrito.total - beneficio.monto_descuento);
  }

  irACatalogo(): void {
    this.router.navigate(['/extra/catalogo']);
  }

  descargarPdf(): void {
    this.snackBar.open('Generando PDF...', 'Cerrar', { duration: 2000 });
    const config = this.configuracionService.getConfiguracion();
    this.cartService.descargarPdf(config).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `Cotizacion_FashionStore_${new Date().getTime()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: () => {
        this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
      }
    });
  }

  pagarCarrito(): void {
    if (!this.carrito || !this.carrito.detalles || this.carrito.detalles.length === 0) return;

    const dialogRef = this.dialog.open(ProcesarPagoDialogComponent, {
      width: '480px',
      disableClose: true,
      data: { 
        total: this.totalConDescuento(),
        sucursal_id: this.sucursalSeleccionadaId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open('Procesando pago y descontando stock...', 'Cerrar', { duration: 2000 });
        
        const baseUrlVentas = this.configService.getApiUrl('ventas');
        const body = {
          tipo: 'digital',
          estado: 'completado',
          precio_total: this.totalConDescuento(),
          usuario_id: this.carrito!.usuario,
          sucursal_id: this.sucursalSeleccionadaId,
          metodo_pago: result.metodo || 'tarjeta',
          detalles: this.carrito!.detalles.map(item => ({
            variante_producto_id: item.variante_producto,
            cantidad: item.cantidad,
            precio_unitario: item.variante_producto_info.precio
          }))
        };

        this.http.post<any>(baseUrlVentas, body).subscribe({
          next: (venta) => {
            const metodoFormateado = (result.metodo || 'DIGITAL').toUpperCase();
            this.snackBar.open(`Â¡Pago exitoso vÃ­a ${metodoFormateado}! Factura y Venta #${venta.id || ''} registradas.`, 'OK', { duration: 5000 });
            
            this.cartService.vaciarCarrito().subscribe(() => {
              this.router.navigate(['/ventas']);
            });
          },
          error: (err) => {
            const msg = err.error?.detail || err.error?.[0] || 'Error al procesar el pedido y descontar stock';
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
          }
        });
      }
    });
  }
}
