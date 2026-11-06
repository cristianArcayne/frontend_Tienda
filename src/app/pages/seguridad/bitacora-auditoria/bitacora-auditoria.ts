import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { BitacoraAuditoria } from 'src/app/models/bitacora-auditoria.model';
import { ConfigService } from 'src/app/services/config.service';

interface BitacoraPaginatedResponse {
  count?: number;
  total?: number;
  next?: string | null;
  previous?: string | null;
  results?: BitacoraAuditoria[];
  registros?: BitacoraAuditoria[];
}

interface EstadisticasDev {
  total_eventos_sistema: number;
  eventos_retornados: number;
  ips_auditadas_unicas: number;
  usuarios_activos_auditados: number;
}

interface SeguridadDev {
  autenticado_por: string;
  hash_sha256_integridad: string;
  inmutable: boolean;
}

interface ConfidencialDevResponse {
  status: string;
  seguridad: SeguridadDev;
  estadisticas_confidenciales: EstadisticasDev;
  registros_bitacora: any[];
}

@Component({
  selector: 'app-bitacora-auditoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './bitacora-auditoria.html',
  styleUrl: './bitacora-auditoria.scss',
})
export class BitacoraAuditoriaComponent implements OnInit, OnDestroy {
  // Columnas de la tabla (en modo normal vs modo desarrollador forense)
  displayedColumnsNormal: string[] = [
    'fecha',
    'hora',
    'usuario_username',
    'accion',
    'ip_cliente',
    'detalles',
  ];

  displayedColumnsDev: string[] = [
    'fecha',
    'hora',
    'usuario_username',
    'accion',
    'tabla_afectada',
    'registro_id',
    'ip_cliente',
    'detalles',
  ];

  get displayedColumns(): string[] {
    return this.isDevUnlocked ? this.displayedColumnsDev : this.displayedColumnsNormal;
  }

  dataSource: any[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  // Llave del Desarrollador (CU-17)
  readonly LLAVE_OFICIAL_DEFECTO = 'DEV-KEY-FASHIONSTORE-SECURE-2026';
  developerKeyInput: string = 'DEV-KEY-FASHIONSTORE-SECURE-2026';
  hideDevKey: boolean = true;
  isDevUnlocked: boolean = false;
  isDevLoading: boolean = false;
  isDownloadingLog: boolean = false;
  devErrorMsg: string | null = null;

  // Datos criptográficos y forenses
  devSecurityInfo: SeguridadDev | null = null;
  devEstadisticas: EstadisticasDev | null = null;
  sha256Hash: string = '';
  copiadoHash: boolean = false;

  // Simulador de Inyección Forense en Vivo
  mostrarSimulador: boolean = false;
  simulandoInyeccion: boolean = false;
  inyeccionFormAccion: string = 'UPDATE';
  inyeccionFormTabla: string = 'seguridad_privilegios';
  inyeccionFormRegistroId: number = 42;
  inyeccionFormDetalle: string = '[CU-17] Auditoría Forense: Verificación de no repudio criptográfico SHA-256';

  private fb = inject(FormBuilder);

  filtrosForm = this.fb.group({
    accion: [''],
  });

  acciones = [
    { value: 'INSERT', label: 'Creación (INSERT)' },
    { value: 'UPDATE', label: 'Actualización (UPDATE)' },
    { value: 'DELETE', label: 'Eliminación (DELETE)' },
    { value: 'LOGIN', label: 'Inicio de sesión (LOGIN)' },
    { value: 'LOGOUT', label: 'Cierre de sesión (LOGOUT)' },
    { value: 'VENTA', label: 'Venta Digital / POS' },
    { value: 'RESERVA', label: 'Reserva' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private configService: ConfigService
  ) {}

  ngOnInit(): void {
    this.loadBitacora();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga la bitácora pública u operacional estándar
   */
  loadBitacora(): void {
    if (this.isDevUnlocked) {
      this.consultarModoDev();
      return;
    }

    this.isLoading = true;
    const url = `${this.configService.getApiBaseUrl()}/bitacora/`;

    this.http.get<BitacoraPaginatedResponse>(url, { params: this.getParams() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dataSource = this.getRegistros(data);
          this.totalItems = this.getTotalRegistros(data, this.dataSource.length);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar bitacora:', error);
          this.snackBar.open('Error al cargar la bitácora de auditoría', 'Cerrar', { duration: 4000 });
          this.isLoading = false;
        }
      });
  }

  /**
   * Desbloquea la bitácora confidencial usando la Llave del Desarrollador (CU-17)
   */
  desbloquearConLlaveDev(): void {
    const key = this.developerKeyInput.trim();
    if (!key) {
      this.devErrorMsg = 'Por favor ingrese la Llave del Desarrollador.';
      return;
    }

    this.isDevLoading = true;
    this.devErrorMsg = null;

    const url = `${this.configService.getApiBaseUrl()}/bitacora/confidencial-dev`;
    const headers = new HttpHeaders({
      'X-Developer-Key': key
    });

    const params = new HttpParams().set('limite', '100');

    this.http.get<ConfidencialDevResponse>(url, { headers, params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.isDevLoading = false;
          this.isDevUnlocked = true;
          this.devSecurityInfo = resp.seguridad;
          this.devEstadisticas = resp.estadisticas_confidenciales;
          this.sha256Hash = resp.seguridad.hash_sha256_integridad;
          this.dataSource = resp.registros_bitacora || [];
          this.totalItems = resp.estadisticas_confidenciales.total_eventos_sistema || this.dataSource.length;

          this.snackBar.open(
            `Acceso Confidencial Autorizado con Llave de Desarrollador. Sello SHA-256 Verificado.`,
            'OK',
            { duration: 4500 }
          );
        },
        error: (err) => {
          this.isDevLoading = false;
          if (err.status === 403) {
            this.devErrorMsg = 'Acceso Denegado (403 Forbidden): La Llave de Desarrollador es inválida o no autorizada.';
          } else {
            this.devErrorMsg = `Error al consultar bitácora confidencial: ${err.statusText || 'Servidor no disponible'}`;
          }
          this.snackBar.open(this.devErrorMsg || 'Error de autenticación forense', 'Cerrar', { duration: 5000 });
        }
      });
  }

  /**
   * Consulta de actualización en Modo Dev
   */
  consultarModoDev(): void {
    if (!this.isDevUnlocked) return;
    this.desbloquearConLlaveDev();
  }

  /**
   * Bloquea el modo desarrollador y vuelve a la vista estándar
   */
  bloquearModoDev(): void {
    this.isDevUnlocked = false;
    this.devSecurityInfo = null;
    this.devEstadisticas = null;
    this.sha256Hash = '';
    this.devErrorMsg = null;
    this.loadBitacora();
    this.snackBar.open('Modo Desarrollador cerrado. Bitácora devuelta al modo operacional estándar.', 'Cerrar', { duration: 3000 });
  }

  /**
   * Coloca la llave oficial en el input
   */
  usarLlaveOficial(): void {
    this.developerKeyInput = this.LLAVE_OFICIAL_DEFECTO;
    this.devErrorMsg = null;
  }

  /**
   * Copia el Sello SHA-256 al portapapeles
   */
  copiarHashSha256(): void {
    if (!this.sha256Hash) return;
    navigator.clipboard.writeText(this.sha256Hash);
    this.copiadoHash = true;
    this.snackBar.open('Sello Hash SHA-256 copiado al portapapeles.', 'OK', { duration: 2500 });
    setTimeout(() => (this.copiadoHash = false), 3000);
  }

  /**
   * Descarga el archivo forense .log firmado con SHA-256 (CU-17)
   */
  descargarLogCifrado(): void {
    const key = this.developerKeyInput.trim() || this.LLAVE_OFICIAL_DEFECTO;
    this.isDownloadingLog = true;

    const url = `${this.configService.getApiBaseUrl()}/bitacora/descargar-log-cifrado`;
    const headers = new HttpHeaders({
      'X-Developer-Key': key
    });

    this.http.get(url, { headers, responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blobData) => {
          this.isDownloadingLog = false;
          const blob = new Blob([blobData], { type: 'text/plain;charset=utf-8' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `bitacora_confidencial_fashionstore_${new Date().toISOString().slice(0, 10)}.log`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);

          this.snackBar.open('Archivo log forense sellado con SHA-256 descargado correctamente.', 'OK', { duration: 4000 });
        },
        error: (err) => {
          this.isDownloadingLog = false;
          console.error('Error al descargar log cifrado:', err);
          this.snackBar.open('Error al descargar log confidencial sellado', 'Cerrar', { duration: 4000 });
        }
      });
  }

  /**
   * Inyecta un evento de prueba en tiempo real para verificar no repudio y recálculo de SHA-256
   */
  ejecutarInyeccionForense(): void {
    this.simulandoInyeccion = true;
    const url = `${this.configService.getApiBaseUrl()}/bitacora/`;

    const payload = {
      accion: this.inyeccionFormAccion,
      tabla_afectada: this.inyeccionFormTabla,
      registro_id: Number(this.inyeccionFormRegistroId) || 1,
      detalles: this.inyeccionFormDetalle.trim()
    };

    this.http.post(url, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.simulandoInyeccion = false;
          this.snackBar.open('Evento forense inyectado con éxito. Recalculando integridad SHA-256...', 'OK', { duration: 3000 });
          this.desbloquearConLlaveDev();
        },
        error: (err) => {
          this.simulandoInyeccion = false;
          console.error('Error inyectando evento:', err);
          this.snackBar.open('Error al inyectar evento forense', 'Cerrar', { duration: 3000 });
        }
      });
  }

  consultar(): void {
    this.currentPage = 0;
    this.loadBitacora();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({
      accion: '',
    });
    this.consultar();
  }

  actualizar(): void {
    if (this.isDevUnlocked) {
      this.desbloquearConLlaveDev();
    } else {
      this.loadBitacora();
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadBitacora();
  }

  getUsuario(registro: any): string {
    if (registro.usuario_username) return registro.usuario_username;
    if (registro.username) return registro.username;
    if (registro.usuarios_id) return `Usuario #${registro.usuarios_id}`;
    if (typeof registro.usuario === 'string') return registro.usuario;
    if (typeof registro.usuario === 'number') return `Usuario #${registro.usuario}`;
    if (registro.usuario) {
      return registro.usuario.nombre_completo || registro.usuario.username || registro.usuario.email || 'Usuario';
    }
    return 'Sistema';
  }

  getTablaAfectada(registro: any): string {
    return registro.tabla_afectada || registro.tabla || registro.model || '-';
  }

  getRegistroId(registro: any): string {
    if (registro.registro_id !== undefined && registro.registro_id !== null) {
      return `#${registro.registro_id}`;
    }
    return '-';
  }

  getAccionFormatted(registro: any): string {
    const raw = (registro.accion || registro.action || registro.metodo || 'Consulta').toUpperCase().trim();
    if (raw.includes('INSERT') || raw.includes('CREATE') || raw.includes('ADD') || raw.includes('CREAR')) return 'Creación';
    if (raw.includes('UPDATE') || raw.includes('EDIT') || raw.includes('ACTUALIZAR')) return 'Actualización';
    if (raw.includes('DELETE') || raw.includes('REMOVE') || raw.includes('ELIMINAR')) return 'Eliminación';
    if (raw.includes('LOGIN') || raw.includes('ACCESO') || raw.includes('INICIO')) return 'Inicio de sesión';
    if (raw.includes('LOGOUT') || raw.includes('CIERRE') || raw.includes('SALIDA')) return 'Cierre de sesión';
    if (raw.includes('VENTA') || raw.includes('ECOMMERCE') || raw.includes('PAGO')) return 'Venta digital';
    if (raw.includes('RESERVA')) return 'Reserva';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  getAccionClass(registro: any): string {
    const raw = (registro.accion || registro.action || registro.metodo || '').toUpperCase().trim();
    if (raw.includes('INSERT') || raw.includes('CREATE') || raw.includes('ADD') || raw.includes('CREAR')) return 'badge-crear';
    if (raw.includes('UPDATE') || raw.includes('EDIT') || raw.includes('ACTUALIZAR')) return 'badge-actualizar';
    if (raw.includes('DELETE') || raw.includes('REMOVE') || raw.includes('ELIMINAR')) return 'badge-eliminar';
    if (raw.includes('LOGIN') || raw.includes('ACCESO') || raw.includes('INICIO')) return 'badge-login';
    if (raw.includes('LOGOUT') || raw.includes('CIERRE') || raw.includes('SALIDA')) return 'badge-logout';
    if (raw.includes('VENTA') || raw.includes('ECOMMERCE') || raw.includes('PAGO')) return 'badge-venta';
    if (raw.includes('RESERVA')) return 'badge-reserva';
    return 'badge-default';
  }

  getAccionIcon(registro: any): string {
    const raw = (registro.accion || registro.action || registro.metodo || '').toUpperCase().trim();
    if (raw.includes('INSERT') || raw.includes('CREATE') || raw.includes('ADD') || raw.includes('CREAR')) return 'add_circle_outline';
    if (raw.includes('UPDATE') || raw.includes('EDIT') || raw.includes('ACTUALIZAR')) return 'edit_note';
    if (raw.includes('DELETE') || raw.includes('REMOVE') || raw.includes('ELIMINAR')) return 'delete_outline';
    if (raw.includes('LOGIN') || raw.includes('ACCESO') || raw.includes('INICIO')) return 'vpn_key';
    if (raw.includes('LOGOUT') || raw.includes('CIERRE') || raw.includes('SALIDA')) return 'logout';
    if (raw.includes('VENTA') || raw.includes('ECOMMERCE') || raw.includes('PAGO')) return 'shopping_bag';
    if (raw.includes('RESERVA')) return 'event_available';
    return 'info';
  }

  getDescripcion(registro: any): string {
    return (
      registro.detalles ||
      registro.descripcion ||
      registro.detalle ||
      registro.mensaje ||
      registro.objeto ||
      registro.object_repr ||
      'Sin descripción'
    );
  }

  getCuBadge(registro: any): string | null {
    const desc = this.getDescripcion(registro);
    const match = desc.match(/\[?(CU\s*-?\s*\d+)\]?/i);
    if (match) {
      return match[1].toUpperCase().replace(/\s+/g, '');
    }
    return null;
  }

  getDescripcionLimpia(registro: any): string {
    const desc = this.getDescripcion(registro);
    const cleaned = desc.replace(/\[?CU\s*-?\s*\d+\]?:?\s*/i, '').trim();
    return cleaned || desc;
  }

  getIp(registro: any): string {
    return registro.ip_cliente || registro.ip || registro.ip_address || '-';
  }

  getFecha(registro: any): string | null {
    return registro.fecha || registro.fecha_hora || registro.created_at || registro.timestamp || null;
  }

  getHora(registro: any): string | null {
    if (registro.fecha_hora) return registro.fecha_hora;
    if (registro.created_at) return registro.created_at;
    if (registro.timestamp) return registro.timestamp;
    if (registro.fecha && registro.hora) return `${registro.fecha}T${registro.hora}Z`;
    return null;
  }

  private getParams(): HttpParams {
    const raw = this.filtrosForm.getRawValue();
    let params = new HttpParams()
      .set('page', String(this.currentPage + 1))
      .set('page_size', String(this.pageSize));

    Object.entries(raw).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });

    return params;
  }

  private getRegistros(response: unknown): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (this.isObjectResponse(response)) {
      const results = response['results'];
      const data = response['data'];
      const registros = response['registros'];
      if (Array.isArray(results)) return results;
      if (Array.isArray(data)) return data;
      if (Array.isArray(registros)) return registros;
    }
    return [];
  }

  private getTotalRegistros(response: unknown, fallback: number): number {
    if (this.isObjectResponse(response)) {
      const total = response['count'] ?? response['total'] ?? response['totalItems'];
      if (typeof total === 'number') {
        return total;
      }
    }
    return fallback;
  }

  private isObjectResponse(response: unknown): response is Record<string, unknown> {
    return typeof response === 'object' && response !== null;
  }
}
