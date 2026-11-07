import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ConfigService } from '../../../services/config.service';
import { PermisosService } from '../../../services/permisos.service';
import { AuthService } from '../../../services/auth.service';

export interface BackupItem {
  nombre: string;
  tamano_kb: number;
  fecha_creacion: string;
  hash_sha256: string;
  estado: string;
  tipo?: string;
  icono?: string;
}

export interface RestauracionResultado {
  success: boolean;
  mensaje: string;
  archivo_restaurado: string;
  lineas_sql_procesadas: number;
  hash_sha256_verificado: string;
  fecha_restauracion: string;
  estado_sistema: string;
}

export interface PoliticaPlanSaaS {
  empresa_id: number;
  empresa_nombre: string;
  plan_codigo: string;
  plan_nombre: string;
  soporta_backup_manual: boolean;
  soporta_backup_automatico: boolean;
  frecuencias_permitidas: string[];
  limite_backups_mes: string | number;
  retencion_dias: number;
  cierre_gestion_permitido: boolean;
  mensaje_politica: string;
}

export interface ProgramacionBackup {
  empresa_id: number;
  activo: boolean;
  frecuencia: string; // 'DIARIO', 'SEMANAL', 'MENSUAL'
  hora: string; // '01:00'
  dia_semana: string; // 'DOMINGO'
  dia_mes: number; // 1..31
  tipo_cierre: string; // 'REGULAR', 'CIERRE_MENSUAL', 'CIERRE_GESTION'
  retencion_dias: number;
  notificar_correo: boolean;
  ultima_ejecucion?: string | null;
  proxima_ejecucion?: string | null;
}

@Component({
  selector: 'app-database-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './database-management.component.html',
  styleUrl: './database-management.component.scss',
})
export class DatabaseManagementComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private http = inject(HttpClient);
  private config = inject(ConfigService);
  private snackBar = inject(MatSnackBar);
  private permisosService = inject(PermisosService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  // Navegación de secciones (Pestañas)
  seccionActiva: 'catalogo' | 'programacion' | 'manual' | 'externo' = 'catalogo';

  // Empresa actual
  empresaId: number = 1;
  empresaNombre: string = 'FashionStore S.A.';

  // Estados de carga
  cargandoLista = false;
  generandoBackup = false;
  guardandoProgramacion = false;
  ejecutandoProgramado = false;
  restaurando = false;
  descargando = false;

  // Catálogo de backups
  backups: BackupItem[] = [];
  displayedColumns: string[] = ['tipo', 'archivo', 'fecha', 'tamano', 'hash', 'estado', 'acciones'];

  // Política del Plan SaaS
  politicaPlan: PoliticaPlanSaaS | null = null;

  // Configuración de Backup Programado (Automático)
  programacion: ProgramacionBackup = {
    empresa_id: 1,
    activo: true,
    frecuencia: 'DIARIO',
    hora: '01:00',
    dia_semana: 'DOMINGO',
    dia_mes: 1,
    tipo_cierre: 'REGULAR',
    retencion_dias: 30,
    notificar_correo: true,
    ultima_ejecucion: null,
    proxima_ejecucion: null,
  };

  diasSemana = [
    { value: 'LUNES', label: 'Lunes' },
    { value: 'MARTES', label: 'Martes' },
    { value: 'MIERCOLES', label: 'Miércoles' },
    { value: 'JUEVES', label: 'Jueves' },
    { value: 'VIERNES', label: 'Viernes' },
    { value: 'SABADO', label: 'Sábado' },
    { value: 'DOMINGO', label: 'Domingo' },
  ];

  // Configuración de Backup Manual Bajo Demanda
  manualForm = {
    tipo: 'MANUAL',
    etiqueta: '',
  };

  // Backup seleccionado para restaurar ante contingencia
  backupSeleccionadoParaRestaurar: BackupItem | null = null;
  codigoConfirmacion: string = '';
  readonly CODIGO_OFICIAL = 'CONFIRMAR_RESTAURACION';

  // Subida de archivo local externo
  archivoSeleccionado: File | null = null;

  // Resultado de la última restauración
  ultimoResultadoRestauracion: RestauracionResultado | null = null;
  hashCopiado: string | null = null;

  // Permisos SuperAdmin / Admin
  get puedeDescargarBackup(): boolean {
    return true;
  }
  get puedeRestaurar(): boolean {
    return true;
  }

  ngOnInit(): void {
    const id = this.authService.getEmpresaId();
    if (id) {
      this.empresaId = id;
    }
    const nombre = this.authService.getEmpresaNombre();
    if (nombre) {
      this.empresaNombre = nombre;
    }

    this.cargarCatalogoBackups();
    this.cargarPoliticaPlan();
    this.cargarProgramacion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarSeccion(seccion: 'catalogo' | 'programacion' | 'manual' | 'externo'): void {
    this.seccionActiva = seccion;
  }

  /**
   * Carga la política de backup según el Plan SaaS de la empresa
   */
  cargarPoliticaPlan(): void {
    const url = `${this.config.getApiBaseUrl()}/v1/backup/politica-plan?empresa_id=${this.empresaId}`;
    this.http.get<PoliticaPlanSaaS>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.politicaPlan = resp;
        },
        error: (err) => {
          console.warn('Fallback política plan:', err);
        }
      });
  }

  /**
   * Carga la configuración de Backup Programado (Automático)
   */
  cargarProgramacion(): void {
    const url = `${this.config.getApiBaseUrl()}/v1/backup/programacion?empresa_id=${this.empresaId}`;
    this.http.get<ProgramacionBackup>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp) {
            this.programacion = { ...this.programacion, ...resp };
          }
        },
        error: (err) => {
          console.warn('Error cargando programación automática:', err);
        }
      });
  }

  /**
   * Guarda los cambios en la programación automática (hora, día, periodicidad)
   */
  guardarProgramacion(): void {
    this.guardandoProgramacion = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/programacion`;

    const payload = {
      empresa_id: this.empresaId,
      activo: this.programacion.activo,
      frecuencia: this.programacion.frecuencia,
      hora: this.programacion.hora,
      dia_semana: this.programacion.dia_semana,
      dia_mes: Number(this.programacion.dia_mes) || 1,
      tipo_cierre: this.programacion.tipo_cierre,
      notificar_correo: this.programacion.notificar_correo,
    };

    this.http.post<any>(url, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.guardandoProgramacion = false;
          if (resp.configuracion?.proxima_ejecucion) {
            this.programacion.proxima_ejecucion = resp.configuracion.proxima_ejecucion;
          }
          this.snackBar.open(
            `Programación guardada: ${this.programacion.frecuencia} a las ${this.programacion.hora}. Próxima ejecución estimada calculada.`,
            'OK',
            { duration: 5000 }
          );
        },
        error: (err) => {
          this.guardandoProgramacion = false;
          console.error('Error guardando programación:', err);
          this.snackBar.open('Error al guardar la programación automática.', 'Cerrar', { duration: 4000 });
        }
      });
  }

  /**
   * Simula o dispara la tarea programada inmediatamente (para evaluación)
   */
  dispararTareaProgramada(): void {
    this.ejecutandoProgramado = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/ejecutar-programado?empresa_id=${this.empresaId}`;

    this.http.post<any>(url, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.ejecutandoProgramado = false;
          this.cargarProgramacion();
          this.cargarCatalogoBackups();
          this.snackBar.open(
            `Demonio de Backup Ejecutado con Éxito: Respaldo automático '${resp.archivo.nombre}' generado y sellado con SHA-256.`,
            'OK',
            { duration: 6000 }
          );
        },
        error: (err) => {
          this.ejecutandoProgramado = false;
          console.error('Error ejecutando tarea programada:', err);
          this.snackBar.open('Error al ejecutar la tarea programada de backup.', 'Cerrar', { duration: 4000 });
        }
      });
  }

  /**
   * Carga el catálogo de backups almacenados en el servidor (CU-18)
   */
  cargarCatalogoBackups(): void {
    this.cargandoLista = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/listar`;

    this.http.get<{ total_backups: number; backups: BackupItem[] }>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.backups = resp.backups || [];
          this.cargandoLista = false;
        },
        error: (err) => {
          console.error('Error cargando catalogo de backups:', err);
          const urlCompat = `${this.config.getApiBaseUrl()}/backup/listar`;
          this.http.get<{ total_backups: number; backups: BackupItem[] }>(urlCompat)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (resp) => {
                this.backups = resp.backups || [];
                this.cargandoLista = false;
              },
              error: () => {
                this.cargandoLista = false;
                this.snackBar.open('Error al consultar el catálogo de copias de seguridad.', 'Cerrar', { duration: 4000 });
              }
            });
        }
      });
  }

  /**
   * Genera un nuevo volcado estructurado manual o cierre de gestión (CU-18)
   */
  generarBackupManual(): void {
    this.generandoBackup = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/generar`;

    const payload = {
      empresa_id: this.empresaId,
      tipo: this.manualForm.tipo,
      etiqueta: this.manualForm.etiqueta.trim() || `Respaldo Manual Solicitado por ${this.empresaNombre}`,
    };

    this.http.post<any>(url, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.generandoBackup = false;
          const archivo = resp.archivo;
          const metricas = resp.metricas;
          this.snackBar.open(
            `Copia de seguridad '${archivo.nombre}' generada exitosamente (${metricas.tablas_respaldadas} tablas, ${metricas.total_tuplas_respaldadas} tuplas).`,
            'OK',
            { duration: 5000 }
          );
          this.manualForm.etiqueta = '';
          this.cargarCatalogoBackups();
          this.seccionActiva = 'catalogo';
        },
        error: (err) => {
          this.generandoBackup = false;
          console.error('Error generando backup:', err);
          this.snackBar.open('Error al generar la copia de seguridad.', 'Cerrar', { duration: 5000 });
        }
      });
  }

  /**
   * Descarga un archivo .sql del catálogo por su nombre
   */
  descargarBackupArchivo(nombre: string): void {
    this.descargando = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/descargar/${nombre}`;

    this.http.get(url, { responseType: 'blob' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.descargando = false;
          const objectUrl = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = nombre;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(objectUrl);
          this.snackBar.open(`Descarga iniciada: ${nombre}`, 'OK', { duration: 3500 });
        },
        error: (err) => {
          this.descargando = false;
          console.error('Error descargando backup:', err);
          this.snackBar.open('Error al descargar el archivo de respaldo.', 'Cerrar', { duration: 4000 });
        }
      });
  }

  /**
   * Abre la sección de confirmación de restauración para un archivo seleccionado
   */
  prepararRestauracion(backup: BackupItem): void {
    this.backupSeleccionadoParaRestaurar = backup;
    this.codigoConfirmacion = '';
    this.ultimoResultadoRestauracion = null;
    this.seccionActiva = 'catalogo';
  }

  cancelarRestauracion(): void {
    this.backupSeleccionadoParaRestaurar = null;
    this.codigoConfirmacion = '';
  }

  usarCodigoOficial(): void {
    this.codigoConfirmacion = this.CODIGO_OFICIAL;
  }

  /**
   * Ejecuta la restauración ante contingencia validando el código estricto (CU-18)
   */
  ejecutarRestauracionSegura(): void {
    if (!this.backupSeleccionadoParaRestaurar) return;

    if (this.codigoConfirmacion.trim() !== this.CODIGO_OFICIAL) {
      this.snackBar.open(
        `Código de autorización inválido. Debe ingresar exactamente '${this.CODIGO_OFICIAL}'.`,
        'Cerrar',
        { duration: 4500 }
      );
      return;
    }

    this.restaurando = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/restaurar`;
    const payload = {
      nombre_archivo: this.backupSeleccionadoParaRestaurar.nombre,
      confirmacion: this.codigoConfirmacion.trim()
    };

    this.http.post<RestauracionResultado>(url, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.restaurando = false;
          this.ultimoResultadoRestauracion = resp;
          this.backupSeleccionadoParaRestaurar = null;
          this.codigoConfirmacion = '';
          this.snackBar.open(
            `Restauración Integral Exitosa: ${resp.lineas_sql_procesadas} sentencias SQL verificadas con SHA-256.`,
            'OK',
            { duration: 6000 }
          );
        },
        error: (err) => {
          this.restaurando = false;
          console.error('Error en restauración:', err);
          const errorMsg = err.error?.detail || 'Error al ejecutar la restauración del sistema.';
          this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  copiarHash(hash: string): void {
    navigator.clipboard.writeText(hash);
    this.hashCopiado = hash;
    this.snackBar.open('Sello Hash SHA-256 copiado.', 'OK', { duration: 2500 });
    setTimeout(() => {
      if (this.hashCopiado === hash) this.hashCopiado = null;
    }, 3000);
  }

  // Métodos de subida local externa
  abrirSelectorArchivo(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado = input.files[0];
    }
  }

  confirmarYRestaurarArchivoLocal(): void {
    if (!this.archivoSeleccionado) return;

    const confirmado = confirm(
      '⚠️ ADVERTENCIA CRÍTICA DE RESTAURACIÓN ⚠️\n\n' +
      `Se procesará el archivo externo '${this.archivoSeleccionado.name}'.\n` +
      'Esta operación sobreescribirá las estructuras de datos del tenant.\n\n' +
      '¿Desea continuar?'
    );

    if (!confirmado) return;

    this.restaurando = true;
    const url = `${this.config.getApiBaseUrl()}/seguridad/restore/`;
    const formData = new FormData();
    formData.append('backup_file', this.archivoSeleccionado);

    this.http.post<any>(url, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.restaurando = false;
          this.archivoSeleccionado = null;
          this.fileInput.nativeElement.value = '';
          this.snackBar.open(resp.mensaje || 'Base de datos restaurada correctamente desde archivo local.', 'OK', { duration: 5000 });
          this.cargarCatalogoBackups();
          this.seccionActiva = 'catalogo';
        },
        error: (err) => {
          this.restaurando = false;
          console.error('Error restaurando archivo local:', err);
          this.snackBar.open('Error al restaurar archivo local externo.', 'Cerrar', { duration: 5000 });
        }
      });
  }
}
