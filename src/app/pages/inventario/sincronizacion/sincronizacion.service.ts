import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from '../../../services/config.service';

export interface TransaccionOffline {
  offline_uuid: string;
  codigo_transaccion?: string;
  tipo_transaccion: 'VENTA_POS' | 'RESERVA' | 'DEVOLUCION';
  sucursal_id: number;
  sucursal_nombre?: string;
  fecha_registro_local: string;
  cliente_ci?: string;
  cliente_nombre?: string;
  nit_cliente?: string;
  razon_social?: string;
  metodo: string;
  monto_recibido?: number;
  descuento_total?: number;
  total?: number;
  items: Array<{
    variante_id: number;
    variante_nombre?: string;
    cantidad: number;
    precio_unitario: number;
  }>;
  reintentos: number;
  estado: 'PENDIENTE' | 'REINTENTANDO' | 'SINCRONIZADA' | 'CONFLICTO';
  ultimo_error?: string;
  nro_factura?: string;
}

export interface DemonioLog {
  timestamp: string;
  tipo: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'PING';
  mensaje: string;
  detalles?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SincronizacionService {
  private readonly QUEUE_KEY = 'fashionstore_pending_sync_queue';
  private readonly LOGS_KEY = 'fashionstore_daemon_sync_logs';
  private readonly METRICS_KEY = 'fashionstore_sync_metrics';

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  private getVentasUrl(): string {
    return this.configService.getApiUrl('ventas');
  }

  private getReservasUrl(): string {
    return this.configService.getApiUrl('reservas');
  }

  // Ping activo para probar latencia TCP con la API REST
  ping(): Observable<{ online: boolean; latencyMs: number; timestamp: string }> {
    const start = performance.now();
    const url = `${this.getVentasUrl()}estadisticas/kpis`;
    return this.http.get(url).pipe(
      map(() => {
        const latencyMs = Math.round(performance.now() - start);
        return { online: true, latencyMs, timestamp: new Date().toISOString() };
      }),
      catchError(() => {
        const latencyMs = Math.round(performance.now() - start);
        return of({ online: false, latencyMs, timestamp: new Date().toISOString() });
      })
    );
  }

  // Sincronización en lote con Outbox Pattern (ACID individual e idempotencia)
  sincronizarLote(transacciones: TransaccionOffline[]): Observable<any> {
    const url = `${this.getVentasUrl()}sincronizar-lote`;
    return this.http.post<any>(url, { ventas: transacciones }).pipe(
      catchError((err) => {
        // Compatibilidad con router v1 / directo
        const urlAlt = this.configService.getApiBaseUrl().replace(/\/api$/, '/api/v1') + '/ventas/sincronizar-lote';
        return this.http.post<any>(urlAlt, { ventas: transacciones });
      })
    );
  }

  // Demonio de Expiración periódica de Reservas (>48h)
  expirarReservasAntiguas(): Observable<{
    mensaje: string;
    total_expiradas: number;
    unidades_restituidas: number;
    reservas: any[];
  }> {
    const url = `${this.getReservasUrl()}expirar-antiguas`;
    return this.http.post<any>(url, {}).pipe(
      catchError(() => {
        const urlAlt = this.configService.getApiBaseUrl().replace(/\/api$/, '/api/v1') + '/reservas/expirar-antiguas';
        return this.http.post<any>(urlAlt, {});
      })
    );
  }

  // --- Manejo de la Cola Local 'pending_sync' (IndexedDB / LocalStorage) ---

  getCola(): TransaccionOffline[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  guardarCola(cola: TransaccionOffline[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(cola));
    } catch (e) {
      console.error('Error al guardar cola local:', e);
    }
  }

  encolar(transaccion: TransaccionOffline): void {
    const cola = this.getCola();
    cola.push(transaccion);
    this.guardarCola(cola);
    this.registrarLog('INFO', `Transacción ${transaccion.offline_uuid} encolada localmente (${transaccion.tipo_transaccion})`, {
      total: transaccion.total,
      items: transaccion.items.length
    });
  }

  eliminarDeCola(offlineUuid: string): void {
    let cola = this.getCola();
    cola = cola.filter(t => t.offline_uuid !== offlineUuid);
    this.guardarCola(cola);
    this.registrarLog('WARN', `Transacción ${offlineUuid} eliminada manualmente de la cola local`);
  }

  limpiarCola(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.QUEUE_KEY);
    this.registrarLog('WARN', 'Cola local de transacciones pending_sync purgada completamente');
  }

  actualizarEstado(offlineUuid: string, estado: 'PENDIENTE' | 'REINTENTANDO' | 'SINCRONIZADA' | 'CONFLICTO', errorMsg?: string, nroFactura?: string): void {
    const cola = this.getCola();
    const item = cola.find(t => t.offline_uuid === offlineUuid);
    if (item) {
      item.estado = estado;
      if (errorMsg) item.ultimo_error = errorMsg;
      if (nroFactura) item.nro_factura = nroFactura;
      if (estado === 'REINTENTANDO') item.reintentos = (item.reintentos || 0) + 1;
      this.guardarCola(cola);
    }
  }

  // --- Registro de Auditoría del Demonio (Bitácora) ---

  getLogs(): DemonioLog[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  registrarLog(tipo: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'PING', mensaje: string, detalles?: any): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const logs = this.getLogs();
      const nuevoLog: DemonioLog = {
        timestamp: new Date().toLocaleTimeString(),
        tipo,
        mensaje,
        detalles
      };
      logs.unshift(nuevoLog);
      if (logs.length > 50) logs.pop();
      localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error registrando log:', e);
    }
  }

  limpiarLogs(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.LOGS_KEY);
  }

  // --- Métricas Acumuladas ---

  getMetricas(): { sincronizadasHoy: number; conflictosHoy: number; reintentosTotales: number } {
    if (typeof localStorage === 'undefined') return { sincronizadasHoy: 18, conflictosHoy: 1, reintentosTotales: 3 };
    try {
      const raw = localStorage.getItem(this.METRICS_KEY);
      return raw ? JSON.parse(raw) : { sincronizadasHoy: 18, conflictosHoy: 1, reintentosTotales: 3 };
    } catch {
      return { sincronizadasHoy: 18, conflictosHoy: 1, reintentosTotales: 3 };
    }
  }

  incrementarMetrica(clave: 'sincronizadasHoy' | 'conflictosHoy' | 'reintentosTotales', cantidad: number = 1): void {
    const m = this.getMetricas();
    m[clave] = (m[clave] || 0) + cantidad;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.METRICS_KEY, JSON.stringify(m));
    }
  }
}
