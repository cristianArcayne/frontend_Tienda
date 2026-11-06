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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConfigService } from '../../../services/config.service';

interface CobroQRRecord {
  qr_id: string;
  monto: number;
  glosa: string;
  estado: string;
  creado_en: string;
  cliente?: string;
  comprobante?: string;
  venta_id?: number;
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
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './cobro-qr.component.html',
  styleUrls: ['./cobro-qr.component.scss']
})
export class CobroQrComponent implements OnInit, OnDestroy {
  // Formulario de emisión
  monto: number = 150.00;
  glosa: string = 'Cobro Mostrador Prenda FashionStore';
  clienteNombre: string = 'Consumidor Final';
  clienteNit: string = '0';
  tiempoExpiracionMinutos: number = 3;

  // Estado del QR activo
  qrData: any = null;
  isGenerando: boolean = false;
  isSimulando: boolean = false;
  segundosRestantes: number = 180;
  totalSegundos: number = 180;
  porcentajeTiempo: number = 100;
  estadoActual: 'NINGUNO' | 'PENDIENTE' | 'PAGADO' | 'EXPIRADO' = 'NINGUNO';

  // Confirmación bancaria
  pagoConfirmado: any = null;
  bancosDisponibles: string[] = [
    'Banco Nacional de Bolivia (BNB Móvil)',
    'Banco Mercantil Santa Cruz (BMSC Móvil)',
    'Banco Unión (Unimóvil Plus)',
    'Banco de Crédito BCP (Banca Móvil)',
    'Banco Ganadero (GanaMóvil)',
    'Banco Sol (App Sol)'
  ];
  bancoSeleccionado: string = 'Banco Nacional de Bolivia (BNB Móvil)';

  // Historial de cobros
  historialCobros: CobroQRRecord[] = [];
  columnasTabla: string[] = ['qr_id', 'monto', 'cliente', 'estado', 'comprobante', 'fecha'];

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
    this.cargarHistorial();
  }

  get urlApiQr(): string {
    return `${this.apiBaseUrl}/pagos/qr-simple`;
  }

  generarCodigoQR(): void {
    if (!this.monto || this.monto <= 0) {
      this.snackBar.open('Ingrese un monto válido mayor a 0', 'Cerrar', { duration: 3000 });
      return;
    }

    this.detenerTemporizadores();
    this.isGenerando = true;
    this.pagoConfirmado = null;
    this.estadoActual = 'PENDIENTE';

    const payload = {
      monto: Number(this.monto),
      moneda: 'BOB',
      glosa: this.glosa.trim() || 'Cobro de prendas FashionStore',
      cliente_nombre: this.clienteNombre.trim() || 'Consumidor Final',
      cliente_nit: this.clienteNit.trim() || '0',
      sucursal_id: 1,
      tiempo_expiracion_seg: (this.tiempoExpiracionMinutos || 3) * 60
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
          this.snackBar.open('¡Código QR Simple Interoperable generado exitosamente!', 'OK', { duration: 3000 });
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

  private iniciarTemporizadorYPolling(qrId: string): void {
    this.detenerTemporizadores();

    // 1. Temporizador visual segundo a segundo
    this.timerSub = interval(1000).subscribe(() => {
      if (this.segundosRestantes > 0) {
        this.segundosRestantes--;
        this.porcentajeTiempo = Math.max(0, (this.segundosRestantes / this.totalSegundos) * 100);
      } else {
        this.estadoActual = 'EXPIRADO';
        this.detenerTemporizadores();
        this.snackBar.open('El código QR ha expirado. Genere uno nuevo para continuar.', 'Cerrar', { duration: 4000 });
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
              this.reproducirNotificacionSonora();
              this.snackBar.open(
                `🎉 ¡Pago QR confirmado en tiempo real vía ${estadoResp.banco_emisor || 'ASOBAN'}! Factura: ${estadoResp.nro_factura || 'Emitida'}`,
                'OK',
                { duration: 6000 }
              );
              this.cargarHistorial();
            } else if (estadoResp.estado === 'EXPIRADO') {
              this.estadoActual = 'EXPIRADO';
              this.detenerTemporizadores();
              this.cargarHistorial();
            }
          },
          error: (e) => {
            console.warn('Polling QR status:', e);
          }
        });
    });
  }

  simularPagoCliente(): void {
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
          this.reproducirNotificacionSonora();
          this.snackBar.open(
            `✅ ¡Pago procesado con éxito vía ${this.bancoSeleccionado}! Comprobante: ${resp.comprobante_bancario}`,
            'OK',
            { duration: 6000 }
          );
          this.cargarHistorial();
        },
        error: (err) => {
          this.isSimulando = false;
          const msg = err.error?.detail || 'Error al simular pago bancario';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
  }

  cargarHistorial(): void {
    this.http.get<CobroQRRecord[]>(`${this.urlApiQr}/ultimos`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.historialCobros = res || [];
        },
        error: () => {
          this.historialCobros = [];
        }
      });
  }

  nuevoCobro(): void {
    this.detenerTemporizadores();
    this.qrData = null;
    this.pagoConfirmado = null;
    this.estadoActual = 'NINGUNO';
    this.monto = 150.00;
  }

  imprimirComprobante(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  get tiempoFormateado(): string {
    const mins = Math.floor(this.segundosRestantes / 60);
    const secs = this.segundosRestantes % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private reproducirNotificacionSonora(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio fallback silencioso
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
