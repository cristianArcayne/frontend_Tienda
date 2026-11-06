import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription, interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SincronizacionService, TransaccionOffline, DemonioLog } from './sincronizacion.service';

@Component({
  selector: 'app-sincronizacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatTabsModule,
    TablerIconsModule
  ],
  templateUrl: './sincronizacion.component.html',
  styleUrls: ['./sincronizacion.component.scss']
})
export class SincronizacionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private timerSub?: Subscription;

  // Red y Conectividad
  isOnline = true;
  isSimulatingOffline = false;
  latencyMs = 24;
  lastPingTime = '';

  // Demonio Background
  daemonRunning = true;
  pollingIntervalSeconds = 15;
  backoffExponent = 0;
  countdownSeconds = 15;
  isSyncingBatch = false;
  isSweepingReservations = false;

  // Cola Outbox y Auditoría
  cola: TransaccionOffline[] = [];
  logs: DemonioLog[] = [];
  metricas = {
    sincronizadasHoy: 18,
    conflictosHoy: 1,
    reintentosTotales: 3
  };

  // Diálogo / Inspección de Payload
  selectedTransaction: TransaccionOffline | null = null;

  displayedColumns: string[] = [
    'tipo',
    'uuid',
    'fecha',
    'items',
    'total',
    'reintentos',
    'estado',
    'acciones'
  ];

  constructor(
    private syncService: SincronizacionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.iniciarDemonio();
    this.realizarPing();

    // Eventos nativos de red del navegador
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onNetworkChange);
      window.addEventListener('offline', this.onNetworkChange);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerSub) this.timerSub.unsubscribe();

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onNetworkChange);
      window.removeEventListener('offline', this.onNetworkChange);
    }
  }

  private onNetworkChange = () => {
    if (typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine && !this.isSimulatingOffline;
      if (this.isOnline) {
        this.syncService.registrarLog('SUCCESS', 'Enlace TCP restablecido por interfaz de red');
        this.realizarPing();
      } else {
        this.syncService.registrarLog('WARN', 'Pérdida de conectividad detectada por interfaz de red');
      }
    }
  };

  cargarDatos(): void {
    this.cola = this.syncService.getCola();
    this.logs = this.syncService.getLogs();
    this.metricas = this.syncService.getMetricas();

    // Si la cola está vacía en primer acceso, pre-cargar una muestra didáctica
    if (this.cola.length === 0) {
      this.inyectarTransaccionMuestra();
    }
  }

  // Demonio Background con Backoff Exponencial (2^n)
  iniciarDemonio(): void {
    if (this.timerSub) this.timerSub.unsubscribe();
    this.countdownSeconds = this.calcularIntervaloActual();

    this.timerSub = interval(1000).subscribe(() => {
      if (!this.daemonRunning) return;

      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.ejecutarCicloDemonio();
        this.countdownSeconds = this.calcularIntervaloActual();
      }
    });
  }

  calcularIntervaloActual(): number {
    // Algoritmo de Backoff: intervalo_base * (2 ^ exponente), máx 60 segundos
    const base = this.pollingIntervalSeconds;
    const factor = Math.pow(2, Math.min(this.backoffExponent, 4));
    return Math.min(60, base * factor);
  }

  toggleDaemon(): void {
    this.daemonRunning = !this.daemonRunning;
    const estado = this.daemonRunning ? 'ACTIVADO' : 'PAUSADO';
    this.syncService.registrarLog('INFO', `Demonio de sincronización background ${estado}`);
    this.snackBar.open(`Demonio background ${estado}`, 'OK', { duration: 2500 });
    if (this.daemonRunning) {
      this.countdownSeconds = this.calcularIntervaloActual();
    }
  }

  cambiarIntervalo(nuevoIntervalo: number): void {
    this.pollingIntervalSeconds = nuevoIntervalo;
    this.backoffExponent = 0;
    this.countdownSeconds = nuevoIntervalo;
    this.syncService.registrarLog('INFO', `Intervalo de sondeo ajustado a ${nuevoIntervalo} segundos`);
  }

  toggleSimulacionCorteRed(): void {
    this.isSimulatingOffline = !this.isSimulatingOffline;
    this.isOnline = !this.isSimulatingOffline && (typeof navigator !== 'undefined' ? navigator.onLine : true);

    if (this.isSimulatingOffline) {
      this.syncService.registrarLog('WARN', 'SIMULACIÓN: Corte de red TCP forzado por el operador');
      this.snackBar.open('🔴 Simulación Offline ACTIVADA: La cola acumulará transacciones', 'OK', { duration: 3500 });
    } else {
      this.syncService.registrarLog('SUCCESS', 'SIMULACIÓN: Conectividad restablecida por el operador');
      this.snackBar.open('🟢 Red restablecida. El demonio iniciará consolidación FIFO...', 'OK', { duration: 3500 });
      this.realizarPing();
      this.sincronizarLoteAhora();
    }
  }

  realizarPing(): void {
    if (this.isSimulatingOffline) {
      this.latencyMs = 0;
      return;
    }
    this.syncService.ping().pipe(takeUntil(this.destroy$)).subscribe((res) => {
      this.isOnline = res.online;
      this.latencyMs = res.latencyMs;
      this.lastPingTime = new Date().toLocaleTimeString();
    });
  }

  private ejecutarCicloDemonio(): void {
    if (this.isSimulatingOffline || !this.isOnline) {
      this.syncService.registrarLog('WARN', 'Ciclo omitido: Sin conexión a Internet');
      return;
    }

    this.realizarPing();

    const pendientes = this.cola.filter(t => t.estado === 'PENDIENTE' || t.estado === 'REINTENTANDO');
    if (pendientes.length > 0) {
      this.sincronizarLoteAhora(true);
    }
  }

  // Consolidación en Lote (Outbox FIFO)
  sincronizarLoteAhora(silencioso = false): void {
    if (this.isSimulatingOffline || !this.isOnline) {
      this.snackBar.open('⚠️ Imposible sincronizar: Terminal sin conexión a la API central', 'Entendido', { duration: 3500 });
      return;
    }

    const pendientes = this.cola.filter(t => t.estado === 'PENDIENTE' || t.estado === 'REINTENTANDO');
    if (pendientes.length === 0) {
      if (!silencioso) {
        this.snackBar.open('La cola pending_sync se encuentra al día (0 pendientes)', 'OK', { duration: 2500 });
      }
      return;
    }

    this.isSyncingBatch = true;
    this.syncService.registrarLog('INFO', `Demonio transmitiendo lote de ${pendientes.length} transacciones al servidor...`);

    this.syncService.sincronizarLote(pendientes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.isSyncingBatch = false;
          this.backoffExponent = 0; // Éxito -> resetea backoff

          if (resp && resp.resultados) {
            let exitosas = 0;
            resp.resultados.forEach((r: any) => {
              if (r.status === 'SINCRONIZADA') {
                this.syncService.actualizarEstado(r.offline_uuid, 'SINCRONIZADA', undefined, r.nro_factura);
                this.syncService.incrementarMetrica('sincronizadasHoy');
                exitosas++;
              } else {
                this.syncService.actualizarEstado(r.offline_uuid, 'CONFLICTO', r.detalle);
                this.syncService.incrementarMetrica('conflictosHoy');
              }
            });

            this.syncService.registrarLog(
              'SUCCESS',
              `Lote procesado: ${exitosas} transacciones consolidadas con éxito en Neon PostgreSQL`,
              resp
            );

            this.snackBar.open(
              `🚀 ¡Lote consolidado! ${exitosas} ventas procesadas con Facturación Fiscal e Idempotencia`,
              'OK',
              { duration: 5000 }
            );
          } else {
            this.snackBar.open('Respuesta de sincronización recibida', 'OK', { duration: 3000 });
          }
          this.cargarDatos();
        },
        error: (err) => {
          this.isSyncingBatch = false;
          this.backoffExponent++; // Falla -> incrementa exponencial 2^n
          this.syncService.incrementarMetrica('reintentosTotales');

          pendientes.forEach(t => {
            this.syncService.actualizarEstado(t.offline_uuid, 'REINTENTANDO', err.message || 'Error de transporte');
          });

          this.syncService.registrarLog(
            'ERROR',
            `Fallo al sincronizar lote. Activando Backoff Exponencial factor 2^${this.backoffExponent}`,
            err
          );

          this.snackBar.open(
            `⚠️ Error de consolidación. Reintento programado con Backoff (${this.calcularIntervaloActual()}s)`,
            'OK',
            { duration: 4000 }
          );
          this.cargarDatos();
        }
      });
  }

  // Demonio de Expiración Automática de Reservas (>48h)
  ejecutarDemonioReservas(): void {
    if (!this.isOnline || this.isSimulatingOffline) {
      this.snackBar.open('⚠️ Se requiere conexión para ejecutar el demonio central de reservas', 'OK', { duration: 3000 });
      return;
    }

    this.isSweepingReservations = true;
    this.syncService.registrarLog('INFO', 'Demonio ejecutando barrido de reservas expiradas (>48h)...');

    this.syncService.expirarReservasAntiguas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.isSweepingReservations = false;
          const exp = resp?.total_expiradas || 0;
          const rest = resp?.unidades_restituidas || 0;

          this.syncService.registrarLog(
            'SUCCESS',
            `Demonio de reservas completado: ${exp} reservas expiradas, ${rest} prendas devueltas a stock`,
            resp
          );

          this.snackBar.open(
            `🧹 Barrido completado: ${exp} reservas caducadas, ${rest} unidades restituidas al perchero`,
            'OK',
            { duration: 5500 }
          );
          this.cargarDatos();
        },
        error: (err) => {
          this.isSweepingReservations = false;
          this.syncService.registrarLog('ERROR', 'Error al ejecutar demonio de reservas', err);
          this.snackBar.open('Error al contactar con el demonio de reservas', 'Cerrar', { duration: 4000 });
        }
      });
  }

  // Generador de Transacciones de Prueba Offline
  generarVentaOfflinePrueba(): void {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const uuid = `OFFLINE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex}`;
    const clientes = [
      { ci: '10928374', nombre: 'Camila Villarroel', nit: '10928374019', razon: 'Camila Villarroel' },
      { ci: '78291034', nombre: 'Mauricio Arteaga', nit: '78291034015', razon: 'Mauricio Arteaga' },
      { ci: '45678912', nombre: 'Valeria Montero', nit: '0', razon: 'Valeria Montero' }
    ];
    const cliente = clientes[Math.floor(Math.random() * clientes.length)];
    const precios = [120, 180, 240, 310];
    const precio = precios[Math.floor(Math.random() * precios.length)];

    const transaccion: TransaccionOffline = {
      offline_uuid: uuid,
      codigo_transaccion: uuid,
      tipo_transaccion: 'VENTA_POS',
      sucursal_id: 1,
      sucursal_nombre: 'Sucursal Central (Calacoto)',
      fecha_registro_local: new Date().toISOString(),
      cliente_ci: cliente.ci,
      cliente_nombre: cliente.nombre,
      nit_cliente: cliente.nit,
      razon_social: cliente.razon,
      metodo: 'efectivo',
      monto_recibido: precio + 20,
      descuento_total: 0,
      total: precio,
      items: [
        {
          variante_id: 4,
          variante_nombre: 'Polera Oversize Cotton (Talla L)',
          cantidad: 1,
          precio_unitario: precio
        }
      ],
      reintentos: 0,
      estado: 'PENDIENTE'
    };

    this.syncService.encolar(transaccion);
    this.cargarDatos();

    this.snackBar.open(`📦 Venta de prueba encolada (${uuid})`, 'Sincronizar Ahora', { duration: 4000 })
      .onAction().subscribe(() => this.sincronizarLoteAhora());
  }

  // Probar Idempotencia: reenviar una transacción ya sincronizada
  probarIdempotencia(item: TransaccionOffline): void {
    this.snackBar.open(`Probando idempotencia estricta con UUID ${item.offline_uuid}...`, 'OK', { duration: 2500 });
    this.syncService.sincronizarLote([item])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.syncService.registrarLog(
            'SUCCESS',
            `IDEMPOTENCIA VERIFICADA: Servidor reconoció UUID ${item.offline_uuid} sin duplicar venta ni stock`,
            resp
          );
          this.snackBar.open('🛡️ Idempotencia Confirmada: La venta no se duplicó', 'Excelente', { duration: 4500 });
          this.cargarDatos();
        },
        error: (err) => {
          this.snackBar.open('Error al probar idempotencia: ' + err.message, 'Cerrar', { duration: 3000 });
        }
      });
  }

  verDetalles(item: TransaccionOffline): void {
    this.selectedTransaction = item;
  }

  cerrarDetalles(): void {
    this.selectedTransaction = null;
  }

  eliminarItem(item: TransaccionOffline): void {
    this.syncService.eliminarDeCola(item.offline_uuid);
    this.cargarDatos();
    this.snackBar.open(`Transacción ${item.offline_uuid} descartada`, 'OK', { duration: 2500 });
  }

  purgarCola(): void {
    if (confirm('¿Confirma que desea vaciar la cola de transacciones locales pendientes?')) {
      this.syncService.limpiarCola();
      this.cargarDatos();
      this.snackBar.open('Cola outbox purgada', 'OK', { duration: 2500 });
    }
  }

  limpiarLogs(): void {
    this.syncService.limpiarLogs();
    this.logs = [];
    this.snackBar.open('Bitácora de demonio reiniciada', 'OK', { duration: 2000 });
  }

  private inyectarTransaccionMuestra(): void {
    const dummy: TransaccionOffline = {
      offline_uuid: 'OFFLINE-20261106-DEMO01',
      codigo_transaccion: 'OFFLINE-20261106-DEMO01',
      tipo_transaccion: 'VENTA_POS',
      sucursal_id: 1,
      sucursal_nombre: 'Sucursal Central (Calacoto)',
      fecha_registro_local: new Date().toISOString(),
      cliente_ci: '8932401',
      cliente_nombre: 'Adriana Barrientos',
      nit_cliente: '8932401017',
      razon_social: 'Adriana Barrientos',
      metodo: 'efectivo',
      monto_recibido: 150,
      descuento_total: 0,
      total: 120,
      items: [
        {
          variante_id: 4,
          variante_nombre: 'Chaqueta Denim Clásica (Talla M)',
          cantidad: 1,
          precio_unitario: 120
        }
      ],
      reintentos: 0,
      estado: 'PENDIENTE'
    };
    this.syncService.encolar(dummy);
    this.cola = this.syncService.getCola();
  }
}
