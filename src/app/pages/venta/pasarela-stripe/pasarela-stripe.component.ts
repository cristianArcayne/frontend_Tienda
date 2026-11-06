import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '../../../services/config.service';

interface ItemOrden {
  variante_id: number;
  ropa_nombre: string;
  sku: string;
  talla: string;
  color: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

interface StripeConfig {
  publishable_key: string;
  currency: string;
  gateway: string;
  sandbox: boolean;
}

@Component({
  selector: 'app-pasarela-stripe',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './pasarela-stripe.component.html',
  styleUrls: ['./pasarela-stripe.component.scss']
})
export class PasarelaStripeComponent implements OnInit, OnDestroy {
  // Configuración Stripe
  stripeConfig: StripeConfig | null = null;
  cargandoConfig: boolean = false;

  // Sucursales y Catálogo para la orden
  sucursales: any[] = [];
  sucursalSeleccionadaId: number = 1;
  variantesDisponibles: any[] = [];
  varianteSeleccionadaId: number | null = null;
  cantidadSeleccionada: number = 1;

  // Carrito / Items de la orden
  itemsOrden: ItemOrden[] = [];
  columnasItems: string[] = ['prenda', 'sku', 'talla_color', 'precio', 'cantidad', 'subtotal', 'acciones'];

  // Datos de la Tarjeta Stripe
  tarjeta = {
    titular: 'Javier Pérez',
    numero: '4242 4242 4242 4242',
    expiracion: '12/28',
    cvv: '123'
  };

  // Datos de Facturación
  factura = {
    razonSocial: 'Consumidor Final',
    nit: '0',
    correo: 'cliente@fashionstore.com.bo',
    direccion: 'Av. San Martín #450, Equipetrol, Santa Cruz'
  };

  // Estados del Proceso
  procesandoPago: boolean = false;
  pagoExitoso: any = null;

  // Historial de Ventas Digitales
  ventasDigitales: any[] = [];
  columnasHistorial: string[] = ['id', 'fecha', 'cliente', 'metodo', 'total', 'estado'];

  private destroy$ = new Subject<void>();
  private apiBase: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.apiBase = this.configService.getApiBaseUrl();
  }

  ngOnInit(): void {
    this.cargarConfiguracionStripe();
    this.cargarSucursales();
    this.cargarVariantesCatalogo();
    this.cargarHistorialVentasDigitales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarConfiguracionStripe(): void {
    this.cargandoConfig = true;
    this.http.get<StripeConfig>(`${this.apiBase}/v1/pagos/stripe/config`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cfg) => {
          this.stripeConfig = cfg;
          this.cargandoConfig = false;
        },
        error: () => {
          this.stripeConfig = {
            publishable_key: 'pk_test_sample',
            currency: 'bob',
            gateway: 'Stripe Payments Inc.',
            sandbox: true
          };
          this.cargandoConfig = false;
        }
      });
  }

  cargarSucursales(): void {
    this.http.get<any[]>(`${this.apiBase}/sucursales/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.sucursales = Array.isArray(data) ? data : [];
          if (this.sucursales.length > 0) {
            this.sucursalSeleccionadaId = this.sucursales[0].id;
          }
        },
        error: (err) => console.error('Error cargando sucursales:', err)
      });
  }

  cargarVariantesCatalogo(): void {
    this.http.get<any[]>(`${this.apiBase}/variantes/`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.variantesDisponibles = Array.isArray(data) ? data : [];
          // Pre-cargar al menos un item si la orden está vacía
          if (this.variantesDisponibles.length > 0 && this.itemsOrden.length === 0) {
            const primera = this.variantesDisponibles[0];
            this.agregarItem(primera, 1);
          }
        },
        error: (err) => console.error('Error cargando variantes:', err)
      });
  }

  agregarItem(variante: any, cantidad: number = 1): void {
    if (!variante) return;
    const existente = this.itemsOrden.find(i => i.variante_id === variante.id);
    const precio = Number(variante.precio || variante.precio_base || 149.99);

    if (existente) {
      existente.cantidad += cantidad;
      existente.subtotal = Number((existente.cantidad * existente.precio_unitario).toFixed(2));
    } else {
      const nombrePrenda = variante.ropa_nombre || variante.producto_nombre || ('Prenda #' + (variante.ropa_id || variante.id));
      this.itemsOrden.push({
        variante_id: variante.id,
        ropa_nombre: nombrePrenda,
        sku: variante.sku || ('SKU-' + variante.id),
        talla: variante.talla || 'M',
        color: variante.color || 'Negro',
        precio_unitario: precio,
        cantidad: cantidad,
        subtotal: Number((precio * cantidad).toFixed(2))
      });
    }
    this.itemsOrden = [...this.itemsOrden];
  }

  agregarPrendaSeleccionada(): void {
    if (!this.varianteSeleccionadaId) return;
    const v = this.variantesDisponibles.find(x => x.id === this.varianteSeleccionadaId);
    if (v) {
      this.agregarItem(v, this.cantidadSeleccionada || 1);
      this.snackBar.open(`Agregado a la orden digital: ${v.ropa_nombre || v.sku}`, 'OK', { duration: 2500 });
    }
  }

  quitarItem(index: number): void {
    this.itemsOrden.splice(index, 1);
    this.itemsOrden = [...this.itemsOrden];
  }

  get totalOrden(): number {
    return Number(this.itemsOrden.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  }

  cargarHistorialVentasDigitales(): void {
    this.http.get<any>(`${this.apiBase}/ventas/?page=1&page_size=10`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : (res.results || []);
          this.ventasDigitales = list.filter((v: any) =>
            (v.metodo_pago && v.metodo_pago.toLowerCase().includes('tarjeta')) ||
            (v.tipo && v.tipo.toLowerCase().includes('digital')) ||
            v.token_pasarela
          );
          if (this.ventasDigitales.length === 0 && list.length > 0) {
            this.ventasDigitales = list.slice(0, 5);
          }
        },
        error: (err) => console.error('Error cargando historial ventas:', err)
      });
  }

  // Tarjeta Formateo
  formatearNumeroTarjeta(): void {
    let raw = this.tarjeta.numero.replace(/\D/g, '');
    const parts = [];
    for (let i = 0; i < raw.length && i < 16; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    this.tarjeta.numero = parts.join(' ');
  }

  formatearExpiracion(): void {
    let raw = this.tarjeta.expiracion.replace(/\D/g, '');
    if (raw.length > 2) {
      this.tarjeta.expiracion = `${raw.substring(0, 2)}/${raw.substring(2, 4)}`;
    } else {
      this.tarjeta.expiracion = raw;
    }
  }

  usarTarjetaPrueba(tipo: string): void {
    if (tipo === 'visa') {
      this.tarjeta.numero = '4242 4242 4242 4242';
      this.tarjeta.titular = 'Javier Pérez';
      this.tarjeta.expiracion = '12/28';
      this.tarjeta.cvv = '123';
    } else if (tipo === 'mastercard') {
      this.tarjeta.numero = '5555 5555 5555 4444';
      this.tarjeta.titular = 'María Gómez';
      this.tarjeta.expiracion = '08/27';
      this.tarjeta.cvv = '888';
    }
  }

  get tipoTarjeta(): 'visa' | 'mastercard' | 'generic' {
    const clean = this.tarjeta.numero.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (clean.startsWith('5')) return 'mastercard';
    return 'generic';
  }

  procesarPagoStripe(): void {
    if (this.itemsOrden.length === 0) {
      this.snackBar.open('Agregue al menos una prenda para procesar el cobro digital.', 'OK', { duration: 3500 });
      return;
    }

    if (!this.tarjeta.titular || !this.tarjeta.numero || !this.tarjeta.expiracion || !this.tarjeta.cvv) {
      this.snackBar.open('Complete todos los datos de la tarjeta bancaria.', 'OK', { duration: 3500 });
      return;
    }

    this.procesandoPago = true;
    this.pagoExitoso = null;

    // Paso 1: Crear PaymentIntent en backend Stripe
    const intentoBody = {
      monto: this.totalOrden,
      moneda: 'bob',
      cliente_id: this.factura.correo,
      descripcion: `Cobro Digital Stripe - E-Commerce FashionStore (${this.itemsOrden.length} prendas)`,
      items_count: this.itemsOrden.length
    };

    this.http.post<any>(`${this.apiBase}/v1/pagos/stripe/crear-intento`, intentoBody)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (intentoRes) => {
          const paymentIntentId = intentoRes.payment_intent_id;

          // Paso 2: Confirmar Pago en Pasarela y Registrar Venta Digital
          const confirmarBody = {
            payment_intent_id: paymentIntentId,
            cliente_id: this.factura.correo,
            sucursal_id: this.sucursalSeleccionadaId || 1,
            direccion_envio: this.factura.direccion,
            razon_social: this.factura.razonSocial || 'Cliente Stripe',
            nit_cliente: this.factura.nit || '0',
            notas: `Venta Digital procesada mediante Stripe Payments. Titular: ${this.tarjeta.titular}`,
            items: this.itemsOrden.map(it => ({
              variante_id: it.variante_id,
              cantidad: it.cantidad,
              precio_unitario: it.precio_unitario
            }))
          };

          this.http.post<any>(`${this.apiBase}/v1/pagos/stripe/confirmar-pago`, confirmarBody)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (ventaRes) => {
                this.procesandoPago = false;
                this.pagoExitoso = {
                  venta: ventaRes,
                  payment_intent_id: paymentIntentId,
                  total: this.totalOrden,
                  fecha: new Date().toISOString(),
                  titular: this.tarjeta.titular,
                  tarjetaMask: '•••• ' + this.tarjeta.numero.slice(-4),
                  factura: ventaRes.factura || {
                    nro_factura: ventaRes.id ? (1000 + ventaRes.id) : 1001,
                    codigo_control: 'STRIPE-OK-A87F'
                  }
                };

                this.snackBar.open(`¡Pago de Bs. ${this.totalOrden} autorizado con éxito por Stripe! Venta #${ventaRes.id || ''} consolidada.`, 'OK', { duration: 6000 });
                this.cargarHistorialVentasDigitales();
              },
              error: (err) => {
                this.procesandoPago = false;
                const msg = err.error?.detail || 'Error al consolidar la venta con Stripe.';
                this.snackBar.open(`Error al confirmar pago: ${msg}`, 'Cerrar', { duration: 6000 });
              }
            });
        },
        error: (err) => {
          this.procesandoPago = false;
          const msg = err.error?.detail || 'Error al conectar con la pasarela de pagos Stripe.';
          this.snackBar.open(`Error en pasarela Stripe: ${msg}`, 'Cerrar', { duration: 6000 });
        }
      });
  }

  nuevaOrden(): void {
    this.pagoExitoso = null;
    this.itemsOrden = [];
    if (this.variantesDisponibles.length > 0) {
      this.agregarItem(this.variantesDisponibles[0], 1);
    }
  }

  irAListadoVentas(): void {
    this.router.navigate(['/ventas']);
  }
}

