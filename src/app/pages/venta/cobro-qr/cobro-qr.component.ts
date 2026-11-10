import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConfigService } from '../../../services/config.service';

export interface ItemCobro {
  ropa_id?: number;
  variante_id?: number;
  nombre: string;
  talla?: string;
  color?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  imagen?: string;
}

export interface CobroQRRecord {
  qr_id: string;
  monto: number;
  glosa: string;
  estado: string;
  creado_en: string;
  expira_en?: string;
  cliente?: string;
  nit?: string;
  telefono?: string;
  comprobante?: string;
  banco?: string;
  nro_factura?: string;
  venta_id?: number;
  items_count?: number;
}

export interface VentaPendiente {
  venta_id: number;
  fecha: string;
  monto_total: number;
  cliente_nombre: string;
  cliente_nit: string;
  items_count: number;
  items: ItemCobro[];
}

@Component({
  selector: 'app-cobro-qr',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatTabsModule,
    MatDialogModule
  ],
  templateUrl: './cobro-qr.component.html',
  styleUrls: ['./cobro-qr.component.scss']
})
export class CobroQrComponent implements OnInit, OnDestroy {
  // Modo de cobro: Rápido manual, Prendas de catálogo o Venta POS pendiente
  modoCobro: 'RAPIDO' | 'PRENDAS' | 'VENTA_PENDIENTE' = 'RAPIDO';

  // Datos del cobro y facturación
  monto: number = 150.00;
  glosa: string = 'Cobro mostrador FashionStore Bolivia';
  clienteNombre: string = 'Consumidor Final';
  clienteNit: string = '0';
  clienteTelefono: string = '';
  clienteEmail: string = '';
  tiempoExpiracionMinutos: number = 3;

  // Ítems de prendas asociadas
  itemsSeleccionados: ItemCobro[] = [];
  prendasCatalogo: any[] = [];
  busquedaPrenda: string = '';
  cargandoPrendas: boolean = false;

  // Ventas pendientes
  ventasPendientes: VentaPendiente[] = [];
  cargandoVentasPendientes: boolean = false;
  ventaPendienteSeleccionadaId: number | null = null;

  // Estado del QR activo
  qrData: any = null;
  isGenerando: boolean = false;
  isSimulando: boolean = false;
  segundosRestantes: number = 180;
  totalSegundos: number = 180;
  porcentajeTiempo: number = 100;
  estadoActual: 'NINGUNO' | 'PENDIENTE' | 'PAGADO' | 'EXPIRADO' | 'RECHAZADO' | 'CANCELADO' = 'NINGUNO';
  motivoRechazo: string = '';

  // Confirmación bancaria y factura oficial
  pagoConfirmado: any = null;
  comprobanteDetallado: any = null;
  mostrarModalComprobante: boolean = false;
  mostrarPantallaCliente: boolean = false;

  // Bancos de Bolivia (Interoperabilidad BCB / ASOBAN)
  bancosDisponibles: string[] = [
    'Banco Nacional de Bolivia (BNB Móvil)',
    'Banco Mercantil Santa Cruz (BMSC Móvil)',
    'Banco Unión (Unimóvil Plus)',
    'Banco de Crédito BCP (Banca Móvil)',
    'Banco Ganadero (GanaMóvil)',
    'Banco BISA (BISA Móvil)',
    'Banco Sol (App Sol)',
    'Banco Fie (Fie Móvil)',
    'Yape Bolivia',
    'Tigo Money'
  ];
  bancoSeleccionado: string = 'Banco Nacional de Bolivia (BNB Móvil)';

  // Métricas del día
  metricas: any = {
    total_recaudado_hoy: 0,
    total_transacciones: 0,
    pagados_count: 0,
    pendientes_count: 0,
    expirados_count: 0,
    tasa_efectividad_porcentaje: 100.0
  };

  // Historial de cobros
  historialCobros: CobroQRRecord[] = [];
  filtroEstadoHistorial: string = 'TODOS';
  busquedaHistorial: string = '';
  columnasTabla: string[] = ['qr_id', 'monto', 'cliente', 'estado', 'comprobante', 'fecha', 'acciones'];

  private pollSub?: Subscription;
  private timerSub?: Subscription;
  private destroy$ = new Subject<void>();
  private apiBaseUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private snackBar: MatSnackBar
  ) {
    this.apiBaseUrl = this.configService.getApiBaseUrl();
  }

  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarHistorial();
    this.cargarPrendas();
    this.cargarVentasPendientes();
  }

  get urlApiQr(): string {
    return `${this.apiBaseUrl}/v1/pagos/qr-simple`;
  }

  get urlApiQrCompat(): string {
    return `${this.apiBaseUrl}/pagos/qr-simple`;
  }

  // ─── Carga de datos ────────────────────────────────────────────────────────

  cargarMetricas(): void {
    this.http.get<any>(`${this.urlApiQr}/metricas`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) this.metricas = res;
        },
        error: () => {
          this.http.get<any>(`${this.urlApiQrCompat}/metricas`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: (r) => { if (r) this.metricas = r; } });
        }
      });
  }

  cargarHistorial(): void {
    let url = `${this.urlApiQr}/ultimos?estado=${this.filtroEstadoHistorial}`;
    if (this.busquedaHistorial.trim()) {
      url += `&q=${encodeURIComponent(this.busquedaHistorial.trim())}`;
    }

    this.http.get<CobroQRRecord[]>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.historialCobros = res || [];
        },
        error: () => {
          this.http.get<CobroQRRecord[]>(`${this.urlApiQrCompat}/ultimos`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: (r) => { this.historialCobros = r || []; } });
        }
      });
  }

  cargarPrendas(): void {
    this.cargandoPrendas = true;
    this.http.get<any>(`${this.apiBaseUrl}/productos/?limit=20`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cargandoPrendas = false;
          this.prendasCatalogo = data?.results || (Array.isArray(data) ? data : []);
        },
        error: () => {
          this.cargandoPrendas = false;
          this.prendasCatalogo = [];
        }
      });
  }

  cargarVentasPendientes(): void {
    this.cargandoVentasPendientes = true;
    this.http.get<VentaPendiente[]>(`${this.urlApiQr}/ventas-pendientes`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cargandoVentasPendientes = false;
          this.ventasPendientes = data || [];
        },
        error: () => {
          this.cargandoVentasPendientes = false;
          this.ventasPendientes = [];
        }
      });
  }

  // ─── Gestión de Prendas e Importe ──────────────────────────────────────────

  get prendasFiltradas(): any[] {
    if (!this.busquedaPrenda.trim()) return this.prendasCatalogo;
    const q = this.busquedaPrenda.toLowerCase();
    return this.prendasCatalogo.filter(p =>
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(q))
    );
  }

  agregarPrenda(prenda: any): void {
    const precio = Number(prenda.precio || prenda.precio_base || 120.0);
    const itemExistente = this.itemsSeleccionados.find(i => i.ropa_id === prenda.id);

    if (itemExistente) {
      itemExistente.cantidad++;
      itemExistente.subtotal = Number((itemExistente.cantidad * itemExistente.precio_unitario).toFixed(2));
    } else {
      let img = prenda.imagen_principal || prenda.imagen_uri;
      if (img) img = this.configService.formatImageUrl(img);

      this.itemsSeleccionados.push({
        ropa_id: prenda.id,
        variante_id: prenda.variantes?.[0]?.id,
        nombre: prenda.nombre,
        talla: prenda.variantes?.[0]?.talla_nombre || 'M',
        color: prenda.variantes?.[0]?.color_nombre || 'Único',
        cantidad: 1,
        precio_unitario: precio,
        subtotal: precio,
        imagen: img || 'assets/images/products/product-1.png'
      });
    }

    this.recalcularTotalPrendas();
    this.snackBar.open(`"${prenda.nombre}" agregada al cobro`, 'OK', { duration: 1500 });
  }

  modificarCantidadItem(index: number, delta: number): void {
    const it = this.itemsSeleccionados[index];
    it.cantidad += delta;
    if (it.cantidad <= 0) {
      this.itemsSeleccionados.splice(index, 1);
    } else {
      it.subtotal = Number((it.cantidad * it.precio_unitario).toFixed(2));
    }
    this.recalcularTotalPrendas();
  }

  eliminarItem(index: number): void {
    this.itemsSeleccionados.splice(index, 1);
    this.recalcularTotalPrendas();
  }

  recalcularTotalPrendas(): void {
    if (this.modoCobro === 'PRENDAS') {
      const suma = this.itemsSeleccionados.reduce((acc, it) => acc + it.subtotal, 0);
      this.monto = Number(suma.toFixed(2));
      if (this.itemsSeleccionados.length > 0) {
        this.glosa = `Cobro de ${this.itemsSeleccionados.length} prenda(s): ` +
          this.itemsSeleccionados.map(i => `${i.cantidad}x ${i.nombre}`).slice(0, 2).join(', ');
      }
    }
  }

  seleccionarVentaPendiente(v: VentaPendiente): void {
    this.ventaPendienteSeleccionadaId = v.venta_id;
    this.monto = Number(v.monto_total.toFixed(2));
    this.clienteNombre = v.cliente_nombre || 'Consumidor Final';
    this.clienteNit = v.cliente_nit || '0';
    this.glosa = `Cobro Orden POS / Pedido #${v.venta_id}`;
    this.itemsSeleccionados = v.items || [];
    this.snackBar.open(`Orden #${v.venta_id} cargada exitosamente para cobro QR`, 'OK', { duration: 2500 });
  }

  setConsumidorFinal(): void {
    this.clienteNombre = 'Consumidor Final';
    this.clienteNit = '0';
    this.snackBar.open('Cliente fijado como Consumidor Final (NIT: 0)', 'OK', { duration: 1500 });
  }

  ajustarMonto(valor: number): void {
    this.monto = valor;
  }

  sumarMonto(delta: number): void {
    this.monto = Number((Math.max(0, this.monto + delta)).toFixed(2));
  }

  // ─── Generación del Código QR Simple ───────────────────────────────────────

  generarCodigoQR(): void {
    if (!this.monto || this.monto <= 0) {
      this.snackBar.open('Ingrese un importe mayor a Bs. 0.00', 'Cerrar', { duration: 3000 });
      return;
    }

    this.detenerTemporizadores();
    this.isGenerando = true;
    this.pagoConfirmado = null;
    this.comprobanteDetallado = null;
    this.estadoActual = 'PENDIENTE';
    this.motivoRechazo = '';

    const payload = {
      monto: Number(this.monto),
      moneda: 'BOB',
      glosa: this.glosa.trim() || 'Cobro de prendas FashionStore',
      venta_id: this.ventaPendienteSeleccionadaId,
      cliente_nombre: this.clienteNombre.trim() || 'Consumidor Final',
      cliente_nit: this.clienteNit.trim() || '0',
      cliente_telefono: this.clienteTelefono.trim() || null,
      cliente_email: this.clienteEmail.trim() || null,
      sucursal_id: 1,
      tiempo_expiracion_seg: (this.tiempoExpiracionMinutos || 3) * 60,
      items: this.itemsSeleccionados
    };

    this.http.post<any>(`${this.urlApiQr}/generar`, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.isGenerando = false;
          this.qrData = resp;
          this.totalSegundos = resp.segundos_vigencia || 180;
          this.segundosRestantes = this.totalSegundos;
          this.porcentajeTiempo = 100;
          this.iniciarTemporizadorYPolling(resp.qr_id);
          this.snackBar.open('¡Código QR Simple Interoperable BCB / ASOBAN listo para escaneo!', 'OK', { duration: 3500 });
          this.cargarMetricas();
          this.cargarHistorial();
        },
        error: (err) => {
          this.isGenerando = false;
          this.estadoActual = 'NINGUNO';
          console.error('Error generando QR:', err);
          this.snackBar.open('Error al generar código QR interoperable', 'Cerrar', { duration: 4000 });
        }
      });
  }

  // ─── Temporizador y Polling en Tiempo Real ──────────────────────────────────

  private iniciarTemporizadorYPolling(qrId: string): void {
    this.detenerTemporizadores();

    // 1. Temporizador visual segundo a segundo
    this.timerSub = interval(1000).subscribe(() => {
      if (this.segundosRestantes > 0) {
        this.segundosRestantes--;
        this.porcentajeTiempo = Math.max(0, (this.segundosRestantes / this.totalSegundos) * 100);
        if (this.segundosRestantes === 30) {
          this.reproducirSonidoAlerta();
        }
      } else {
        this.estadoActual = 'EXPIRADO';
        this.detenerTemporizadores();
        this.reproducirSonidoAlerta();
        this.snackBar.open('⏱️ El código QR ha expirado por seguridad bancaria.', 'Cerrar', { duration: 5000 });
        this.cargarMetricas();
        this.cargarHistorial();
      }
    });

    // 2. Polling cada 2 segundos para escuchar confirmación bancaria
    this.pollSub = interval(2000).subscribe(() => {
      this.http.get<any>(`${this.urlApiQr}/estado/${qrId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (estadoResp) => {
            if (estadoResp.estado === 'PAGADO') {
              this.estadoActual = 'PAGADO';
              this.pagoConfirmado = estadoResp;
              this.detenerTemporizadores();
              this.reproducirSonidoExito();
              this.snackBar.open(
                `🎉 ¡Pago QR acreditado vía ${estadoResp.banco_emisor || 'ASOBAN'}! Factura: ${estadoResp.nro_factura || 'Emitida'}`,
                'OK',
                { duration: 7000 }
              );
              this.cargarMetricas();
              this.cargarHistorial();
            } else if (estadoResp.estado === 'EXPIRADO') {
              this.estadoActual = 'EXPIRADO';
              this.detenerTemporizadores();
              this.cargarMetricas();
              this.cargarHistorial();
            } else if (estadoResp.estado === 'RECHAZADO') {
              this.estadoActual = 'RECHAZADO';
              this.motivoRechazo = estadoResp.motivo_rechazo || 'Transacción declinada';
              this.detenerTemporizadores();
              this.cargarMetricas();
              this.cargarHistorial();
            }
          },
          error: (e) => {
            console.warn('Polling QR status:', e);
          }
        });
    });
  }

  consultarEstadoManual(): void {
    if (!this.qrData?.qr_id) return;
    this.http.get<any>(`${this.urlApiQr}/estado/${this.qrData.qr_id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp.estado === 'PAGADO') {
            this.estadoActual = 'PAGADO';
            this.pagoConfirmado = resp;
            this.detenerTemporizadores();
            this.reproducirSonidoExito();
            this.snackBar.open(`¡Pago acreditado! Comprobante: ${resp.comprobante_bancario}`, 'OK', { duration: 5000 });
          } else {
            this.snackBar.open(`Estado actual: ${resp.estado} (Tiempo restante: ${resp.segundos_restantes}s)`, 'Info', { duration: 2500 });
          }
        }
      });
  }

  // ─── Simuladores de Banca Móvil (Evaluación / Tribunal) ──────────────────────

  simularPagoExitoso(): void {
    if (!this.qrData || this.estadoActual !== 'PENDIENTE') return;

    this.isSimulando = true;
    const bancoParam = encodeURIComponent(this.bancoSeleccionado);

    this.http.post<any>(`${this.urlApiQr}/simular-pago/${this.qrData.qr_id}?banco=${bancoParam}`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.isSimulando = false;
          this.estadoActual = 'PAGADO';
          this.pagoConfirmado = resp;
          this.detenerTemporizadores();
          this.reproducirSonidoExito();
          this.snackBar.open(
            `✅ ¡Pago procesado con éxito vía ${this.bancoSeleccionado}! Factura: ${resp.nro_factura}`,
            'OK',
            { duration: 6000 }
          );
          this.cargarMetricas();
          this.cargarHistorial();
          this.cargarVentasPendientes();
        },
        error: (err) => {
          this.isSimulando = false;
          const msg = err.error?.detail || 'Error al procesar simulación bancaria';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
  }

  simularRechazo(): void {
    if (!this.qrData || this.estadoActual !== 'PENDIENTE') return;

    const motivo = `Saldo insuficiente en cuenta origen (${this.bancoSeleccionado})`;
    this.http.post<any>(`${this.urlApiQr}/simular-rechazo/${this.qrData.qr_id}?motivo=${encodeURIComponent(motivo)}`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.estadoActual = 'RECHAZADO';
          this.motivoRechazo = resp.motivo || motivo;
          this.detenerTemporizadores();
          this.reproducirSonidoAlerta();
          this.snackBar.open(`⚠️ Pago Rechazado: ${this.motivoRechazo}`, 'Cerrar', { duration: 5000 });
          this.cargarMetricas();
          this.cargarHistorial();
        }
      });
  }

  cancelarCobro(): void {
    if (!this.qrData) return;
    this.http.post<any>(`${this.urlApiQr}/cancelar/${this.qrData.qr_id}`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.detenerTemporizadores();
          this.estadoActual = 'CANCELADO';
          this.snackBar.open('Cobro QR cancelado por el cajero', 'OK', { duration: 3000 });
          this.cargarMetricas();
          this.cargarHistorial();
        }
      });
  }

  regenerarQR(): void {
    if (!this.qrData?.qr_id) return;
    this.http.post<any>(`${this.urlApiQr}/regenerar/${this.qrData.qr_id}`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.qrData = resp;
          this.totalSegundos = resp.segundos_vigencia || 180;
          this.segundosRestantes = this.totalSegundos;
          this.porcentajeTiempo = 100;
          this.estadoActual = 'PENDIENTE';
          this.iniciarTemporizadorYPolling(resp.qr_id);
          this.snackBar.open('¡Código QR regenerado con nueva vigencia!', 'OK', { duration: 3000 });
          this.cargarMetricas();
          this.cargarHistorial();
        }
      });
  }

  // ─── Acciones con el Código QR ──────────────────────────────────────────────

  copiarCadenaEMVCo(): void {
    if (!this.qrData?.payload_emvco) return;
    navigator.clipboard.writeText(this.qrData.payload_emvco).then(() => {
      this.snackBar.open('Cadena EMVCo interoperable copiada al portapapeles', 'OK', { duration: 2500 });
    });
  }

  descargarQR(): void {
    if (!this.qrData?.qr_image_base64) return;
    const a = document.createElement('a');
    a.href = this.qrData.qr_image_base64;
    a.download = `QR-FashionStore-${this.qrData.qr_id}.png`;
    a.click();
    this.snackBar.open('Imagen del Código QR descargada en PNG', 'OK', { duration: 2000 });
  }

  compartirPorWhatsApp(): void {
    if (!this.qrData) return;
    const tel = this.clienteTelefono.replace(/[^0-9]/g, '');
    const texto = encodeURIComponent(
      `Hola ${this.clienteNombre}, tu orden de compra en FashionStore Bolivia por Bs. ${this.qrData.monto.toFixed(2)} ` +
      `está lista para cobro con QR Simple. Código de pago: ${this.qrData.qr_id}. Concepto: ${this.qrData.glosa}.`
    );
    const url = tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
  }

  togglePantallaCliente(): void {
    this.mostrarPantallaCliente = !this.mostrarPantallaCliente;
  }

  // ─── Comprobante Fiscal SIAT e Impresión ────────────────────────────────────

  verDetalleComprobante(row: any): void {
    this.http.get<any>(`${this.urlApiQr}/comprobante/${row.qr_id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.comprobanteDetallado = data;
          this.mostrarModalComprobante = true;
        },
        error: () => {
          this.comprobanteDetallado = {
            empresa: 'FashionStore Bolivia S.R.L.',
            nit_emisor: '1029384025',
            qr_id: row.qr_id,
            monto: row.monto,
            fecha: row.creado_en,
            cliente_nombre: row.cliente || 'Consumidor Final',
            cliente_nit: row.nit || '0',
            comprobante_bancario: row.comprobante || 'TRX-ASOBAN-DEMO',
            banco_emisor: row.banco || 'Banca Móvil QR Simple',
            nro_factura: row.nro_factura || 'FAC-QR-001'
          };
          this.mostrarModalComprobante = true;
        }
      });
  }

  cerrarModalComprobante(): void {
    this.mostrarModalComprobante = false;
  }

  imprimirComprobante(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  nuevoCobro(): void {
    this.detenerTemporizadores();
    this.qrData = null;
    this.pagoConfirmado = null;
    this.comprobanteDetallado = null;
    this.estadoActual = 'NINGUNO';
    this.monto = 150.00;
    this.itemsSeleccionados = [];
    this.ventaPendienteSeleccionadaId = null;
    this.mostrarPantallaCliente = false;
    this.mostrarModalComprobante = false;
  }

  get tiempoFormateado(): string {
    const mins = Math.floor(this.segundosRestantes / 60);
    const secs = this.segundosRestantes % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // ─── Feedback Sonoro Profesional ───────────────────────────────────────────

  private reproducirSonidoExito(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const t = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = 'sine';
        osc2.type = 'triangle';

        // Arpegio de caja registradora C6 -> E6 -> G6
        osc1.frequency.setValueAtTime(1046.50, t); // C6
        osc1.frequency.setValueAtTime(1318.51, t + 0.1); // E6
        osc1.frequency.setValueAtTime(1567.98, t + 0.2); // G6

        osc2.frequency.setValueAtTime(523.25, t); // C5
        osc2.frequency.setValueAtTime(659.25, t + 0.1); // E5
        osc2.frequency.setValueAtTime(783.99, t + 0.2); // G5

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.6);
        osc2.stop(t + 0.6);
      }
    } catch {
      // Fallback silencioso
    }
  }

  private reproducirSonidoAlerta(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.setValueAtTime(220, t + 0.15);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.start(t);
        osc.stop(t + 0.35);
      }
    } catch {
      // Fallback silencioso
    }
  }

  private detenerTemporizadores(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
  }

  ngOnDestroy(): void {
    this.detenerTemporizadores();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
