import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import { DevolucionesService, Devolucion } from '../../../services/devoluciones.service';
import { ConfigService } from '../../../services/config.service';

@Component({
  selector: 'app-gestion-devoluciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatTabsModule
  ],
  templateUrl: './gestion-devoluciones.component.html',
  styleUrls: ['./gestion-devoluciones.component.scss']
})
export class GestionDevolucionesComponent implements OnInit {
  @ViewChild('responderDialog') responderDialog!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  // Pestaña activa
  activeTab: 'BANDEJA' | 'VERIFICADOR' | 'CAMBIO_TALLA' = 'BANDEJA';

  // Métricas del Módulo
  metricas: any = {
    total_solicitudes: 0,
    pendientes_count: 0,
    aprobadas_count: 0,
    rechazadas_count: 0,
    total_reembolsos_bs: 0,
    cambios_talla_count: 0,
    tasa_aprobacion_porcentaje: 100
  };

  // ─── TAB 1: Bandeja de Solicitudes (Admin) ─────────────────────────────────
  displayedColumns: string[] = [
    'venta_id',
    'cliente',
    'fecha_solicitud',
    'motivo',
    'monto_reembolso',
    'estado',
    'acciones'
  ];
  devoluciones: Devolucion[] = [];
  filtroEstado: string = 'TODOS';
  busquedaTexto: string = '';
  isLoading = false;

  // Modal para resolver solicitud
  selectedDevolucion: Devolucion | null = null;
  observacionAdmin: string = '';

  // ─── TAB 2: Verificador de Garantía & Nueva Solicitud ──────────────────────
  inputVentaId: number | null = null;
  ventaInspeccionada: any = null;
  verificandoVenta: boolean = false;
  ventasRecientes: any[] = [];
  cargandoVentasRecientes: boolean = false;

  // Formulario de Solicitud de Devolución
  motivosComunes: string[] = [
    'Defecto de costura o confección textil',
    'Talla inadecuada / corte no coincide',
    'Tela con manchas o desteñido de fábrica',
    'Prenda entregada no corresponde al pedido',
    'Disconformidad estética con el modelo'
  ];
  motivoSeleccionado: string = 'Defecto de costura o confección textil';
  motivoDetalle: string = '';
  metodoReembolso: string = 'QR';
  cuentaReembolso: string = 'Billetera Móvil QR / Cuenta de Origen';
  isSolicitando: boolean = false;

  // ─── TAB 3: Cambio de Talla en Mostrador (CP-CU12-05) ──────────────────────
  ventaCambio: any = null;
  varianteDevueltaSeleccionada: any = null;
  variantesDisponibles: any[] = [];
  nuevaVarianteSeleccionada: any = null;
  cantidadCambio: number = 1;
  motivoCambio: string = 'Cambio de talla por ajuste en hombros/cuerpo';
  metodoPagoDiferencia: string = 'QR';
  isProcesandoCambio: boolean = false;
  notaCambioGenerada: any = null;

  constructor(
    private devolucionesService: DevolucionesService,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarDevoluciones();
    this.cargarVentasRecientes();
    this.cargarVariantesDisponiblesCatalogo();
  }

  // ─── Carga de Datos ────────────────────────────────────────────────────────

  cargarMetricas(): void {
    this.devolucionesService.getMetricas().subscribe({
      next: (res) => {
        if (res) this.metricas = res;
        this.cdr.markForCheck();
      }
    });
  }

  cargarDevoluciones(): void {
    this.isLoading = true;
    this.devolucionesService.getTodasDevolucionesAdmin(this.filtroEstado).subscribe({
      next: (data: any) => {
        let lista = Array.isArray(data) ? data : (data?.results || []);
        if (this.busquedaTexto.trim()) {
          const q = this.busquedaTexto.toLowerCase();
          lista = lista.filter((d: any) =>
            String(d.venta_id).includes(q) ||
            String(d.cliente_nombre || '').toLowerCase().includes(q) ||
            String(d.motivo || '').toLowerCase().includes(q) ||
            String(d.estado || '').toLowerCase().includes(q)
          );
        }
        this.devoluciones = lista;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar la lista de devoluciones:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cargarVentasRecientes(): void {
    this.cargandoVentasRecientes = true;
    this.devolucionesService.getVentasRecientes().subscribe({
      next: (data) => {
        this.ventasRecientes = data || [];
        this.cargandoVentasRecientes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.ventasRecientes = [];
        this.cargandoVentasRecientes = false;
        this.cdr.markForCheck();
      }
    });
  }

  cargarVariantesDisponiblesCatalogo(ropaId?: number): void {
    this.devolucionesService.getVariantesDisponibles(1, ropaId).subscribe({
      next: (data) => {
        this.variantesDisponibles = data || [];
        this.cdr.markForCheck();
      }
    });
  }

  cargarVariantesParaCambio(ropaId?: number): void {
    this.cargarVariantesDisponiblesCatalogo(ropaId);
  }

  // ─── Verificador de Garantía 7 Días ────────────────────────────────────────

  verificarVentaManual(): void {
    if (!this.inputVentaId || this.inputVentaId <= 0) {
      this.snackBar.open('Ingrese un ID de venta válido para inspeccionar', 'Cerrar', { duration: 3000 });
      return;
    }
    this.inspeccionarVenta(this.inputVentaId);
  }

  inspeccionarVenta(ventaId: number): void {
    this.verificandoVenta = true;
    this.ventaInspeccionada = null;

    this.devolucionesService.verificarElegibilidad(ventaId).subscribe({
      next: (res) => {
        this.verificandoVenta = false;
        // Combinar con los datos completos de venta si existe en la lista reciente
        const vFull = this.ventasRecientes.find(v => v.venta_id === ventaId);
        this.ventaInspeccionada = {
          ...res,
          cliente_nombre: vFull?.cliente_nombre || 'Cliente FashionStore',
          cliente_ci: vFull?.cliente_ci || '2001',
          monto_total: vFull?.monto_total || 100.0,
          items: vFull?.items || []
        };
        this.inputVentaId = ventaId;
        this.cdr.markForCheck();

        if (res.elegible) {
          this.snackBar.open(`✅ Venta #${ventaId} ELEGIBLE. Quedan ${res.horas_restantes} horas de garantía.`, 'OK', { duration: 3500 });
        } else {
          this.snackBar.open(`⚠️ ${res.motivo_inelegible || 'Garantía legal de 7 días expirada.'}`, 'Entendido', { duration: 4500 });
        }
      },
      error: (err) => {
        this.verificandoVenta = false;
        const msg = err.error?.detail || 'Venta no encontrada en el sistema';
        this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
        this.cdr.markForCheck();
      }
    });
  }

  enviarSolicitudDevolucion(): void {
    if (!this.ventaInspeccionada || !this.ventaInspeccionada.elegible) {
      this.snackBar.open('Solo puede solicitar devolución en compras con garantía vigente (< 168 horas)', 'Cerrar', { duration: 4000 });
      return;
    }

    const motivoFinal = `${this.motivoSeleccionado}${this.motivoDetalle ? ': ' + this.motivoDetalle.trim() : ''} | Reembolso a: ${this.cuentaReembolso.trim()}`;

    this.isSolicitando = true;
    const payload = {
      venta_id: this.ventaInspeccionada.venta_id,
      cliente_id: this.ventaInspeccionada.cliente_ci || '2001',
      motivo: motivoFinal,
      cuenta_bancaria_qr: this.cuentaReembolso.trim()
    };

    this.devolucionesService.solicitarDevolucion(payload).subscribe({
      next: (res) => {
        this.isSolicitando = false;
        this.snackBar.open(`🎉 Solicitud de Devolución #${res.devolucion?.id || ''} registrada exitosamente`, 'OK', { duration: 4000 });
        this.ventaInspeccionada = null;
        this.inputVentaId = null;
        this.motivoDetalle = '';
        this.cargarMetricas();
        this.cargarDevoluciones();
        this.activeTab = 'BANDEJA';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSolicitando = false;
        const msg = err.error?.detail || 'Error al emitir solicitud de devolución';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Cambio de Talla en Mostrador (CP-CU12-05) ──────────────────────────────

  iniciarCambioParaVenta(v: any): void {
    this.ventaCambio = v;
    this.activeTab = 'CAMBIO_TALLA';
    this.notaCambioGenerada = null;
    this.varianteDevueltaSeleccionada = v.items && v.items.length > 0 ? v.items[0] : null;
    if (this.varianteDevueltaSeleccionada) {
      this.cargarVariantesParaCambio(this.varianteDevueltaSeleccionada.ropa_id);
    }
    this.snackBar.open(`Venta #${v.venta_id} cargada para Cambio de Talla`, 'OK', { duration: 2500 });
  }

  seleccionarPrendaDevuelta(item: any): void {
    this.varianteDevueltaSeleccionada = item;
    this.cargarVariantesParaCambio(item.ropa_id);
  }

  seleccionarNuevaVariante(nueva: any): void {
    this.nuevaVarianteSeleccionada = nueva;
  }

  get creditoReconocido(): number {
    if (!this.varianteDevueltaSeleccionada) return 0.0;
    const pu = Number(this.varianteDevueltaSeleccionada.precio_unitario || 100.0);
    return Number((pu * this.cantidadCambio).toFixed(2));
  }

  get costoNuevaPrenda(): number {
    if (!this.nuevaVarianteSeleccionada) return 0.0;
    const pu = Number(this.nuevaVarianteSeleccionada.precio || 100.0);
    return Number((pu * this.cantidadCambio).toFixed(2));
  }

  get diferenciaAPagar(): number {
    const diff = this.costoNuevaPrenda - this.creditoReconocido;
    return Number(Math.max(0.0, diff).toFixed(2));
  }

  procesarCambioTalla(): void {
    if (!this.ventaCambio || !this.varianteDevueltaSeleccionada || !this.nuevaVarianteSeleccionada) {
      this.snackBar.open('Seleccione la prenda a devolver y la nueva talla a entregar', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isProcesandoCambio = true;
    const payload = {
      venta_id: this.ventaCambio.venta_id,
      variante_devuelta_id: this.varianteDevueltaSeleccionada.variante_id,
      nueva_variante_id: this.nuevaVarianteSeleccionada.variante_id,
      cantidad: this.cantidadCambio,
      motivo: this.motivoCambio.trim() || 'Cambio de talla en mostrador físico',
      cliente_id: this.ventaCambio.cliente_ci || '2001',
      metodo_pago_diferencia: this.metodoPagoDiferencia
    };

    this.devolucionesService.procesarCambioTalla(payload).subscribe({
      next: (res) => {
        this.isProcesandoCambio = false;
        this.notaCambioGenerada = res;
        this.snackBar.open(`✅ ¡Nota de Cambio ${res.nro_nota_cambio} emitida exitosamente!`, 'OK', { duration: 5000 });
        this.cargarMetricas();
        this.cargarDevoluciones();
        this.cargarVentasRecientes();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isProcesandoCambio = false;
        const msg = err.error?.detail || 'Error al procesar el cambio de talla';
        this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
        this.cdr.markForCheck();
      }
    });
  }

  imprimirNotaCambio(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  nuevoCambio(): void {
    this.notaCambioGenerada = null;
    this.nuevaVarianteSeleccionada = null;
    this.varianteDevueltaSeleccionada = null;
    this.ventaCambio = null;
  }

  // ─── Modal Responder Devolución (Admin) ────────────────────────────────────

  abrirResponderModal(dev: Devolucion): void {
    this.selectedDevolucion = dev;
    this.observacionAdmin = dev.observacion_admin || dev.respuesta_admin || '';
    if (this.responderDialog) {
      this.dialogRef = this.dialog.open(this.responderDialog, {
        width: '760px',
        maxWidth: '95vw',
        autoFocus: false,
        panelClass: 'modal-devolucion-panel'
      });
      this.dialogRef.afterClosed().subscribe(() => {
        this.selectedDevolucion = null;
        this.observacionAdmin = '';
      });
    }
  }

  cerrarModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    this.dialog.closeAll();
    this.selectedDevolucion = null;
    this.observacionAdmin = '';
  }

  responder(estado: 'APROBADA' | 'RECHAZADA'): void {
    if (!this.selectedDevolucion) return;

    this.devolucionesService
      .responderDevolucion(this.selectedDevolucion.id, estado, this.observacionAdmin)
      .subscribe({
        next: (devActualizada) => {
          const statusText = estado === 'APROBADA' ? 'APROBADA (+1 reingreso a stock)' : 'RECHAZADA';
          this.snackBar.open(`Solicitud #${devActualizada.id || this.selectedDevolucion?.id} ${statusText} exitosamente.`, 'Cerrar', { duration: 4000 });
          this.cerrarModal();
          this.cargarMetricas();
          this.cargarDevoluciones();
        },
        error: (err) => {
          const detail = err?.error?.detail || 'Error al procesar la devolución';
          this.snackBar.open(detail, 'Cerrar', { duration: 4000 });
        }
      });
  }

  esEstadoPendiente(estado: string): boolean {
    const st = (estado || '').toUpperCase();
    return st === 'PENDIENTE' || st === 'SOLICITADA' || st === 'EN_REVISION';
  }

  getEstadoClass(estado: string): string {
    const st = (estado || '').toUpperCase();
    switch (st) {
      case 'APROBADA':
        return 'status-pill status-aprobada';
      case 'RECHAZADA':
        return 'status-pill status-rechazada';
      case 'PENDIENTE':
      case 'SOLICITADA':
      case 'EN_REVISION':
        return 'status-pill status-solicitada';
      default:
        return 'status-pill';
    }
  }

  formatearFecha(fechaStr?: string): string {
    if (!fechaStr) return '-';
    try {
      const f = new Date(fechaStr);
      if (isNaN(f.getTime())) return fechaStr;
      return f.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return fechaStr;
    }
  }
}
