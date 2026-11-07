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

export interface BackupItem {
  nombre: string;
  tamano_kb: number;
  fecha_creacion: string;
  hash_sha256: string;
  estado: string;
  tipo: string;
  etiqueta: string;
  badge_class?: string;
}

export interface ProgramacionConfig {
  activo: boolean;
  hora: string;
  frecuencia: string;
  dia_semana: string;
  max_retencion: number;
  plan_activo: string;
  tipo_programacion?: string;
  ultimo_backup_automatico?: string;
  proxima_ejecucion?: string;
  rotacion_habilitada?: boolean;
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
  private destroy$ = new Subject<void>();

  // Estados de carga
  cargandoLista = false;
  generandoBackup = false;
  ejecutandoCronAuto = false;
  guardandoProgramacion = false;
  restaurando = false;
  descargando = false;

  // Catálogo de backups
  backups: BackupItem[] = [];
  displayedColumns: string[] = ['archivo', 'tipo', 'fecha', 'tamano', 'hash', 'acciones'];

  // Pestaña / Vista activa: 'CATALOGO', 'AUTOMATIZACION', 'MANUAL', 'EXTERNO'
  seccionActiva: 'CATALOGO' | 'AUTOMATIZACION' | 'MANUAL' = 'CATALOGO';

  // Configuración de Programación Automática (CU-18)
  configAuto: ProgramacionConfig = {
    activo: true,
    hora: '01:00',
    frecuencia: 'diario',
    dia_semana: 'todos',
    max_retencion: 30,
    plan_activo: 'PROFESIONAL',
    proxima_ejecucion: '2026-11-07T01:00:00'
  };

  // Modalidad Manual: opciones de tipo
  tipoManualSeleccionado: string = 'MANUAL_OPERATIVO';
  descripcionManual: string = 'Respaldo preventivo bajo demanda';

  // Modalidad Restauración de Contingencia
  backupSeleccionadoParaRestaurar: BackupItem | null = null;
  codigoConfirmacion: string = '';
  readonly CODIGO_OFICIAL = 'CONFIRMAR_RESTAURACION';

  // Subida de archivo local externo
  archivoSeleccionado: File | null = null;

  // Resultado de la última restauración
  ultimoResultadoRestauracion: RestauracionResultado | null = null;
  hashCopiado: string | null = null;

  // Gobernanza de Plan SaaS
  planSimulado: 'PROFESIONAL' | 'BASICO' = 'PROFESIONAL';

  get esPlanProfesional(): boolean {
    return this.planSimulado === 'PROFESIONAL';
  }

  get cuotaMaximaPlan(): number {
    return this.esPlanProfesional ? 30 : 5;
  }

  get puedeDescargarBackup(): boolean {
    return true;
  }

  get puedeRestaurar(): boolean {
    return true;
  }

  ngOnInit(): void {
    this.cargarCatalogoBackups();
    this.cargarProgramacion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cambia el plan simulado (para evaluar Básico vs Profesional según indicación docente)
   */
  cambiarPlanSimulado(plan: 'PROFESIONAL' | 'BASICO'): void {
    this.planSimulado = plan;
    this.configAuto.plan_activo = plan;
    this.configAuto.max_retencion = this.cuotaMaximaPlan;
    if (!this.esPlanProfesional && this.configAuto.frecuencia === 'diario') {
      this.configAuto.frecuencia = 'semanal';
    }
    this.snackBar.open(
      `Gobernanza actualizada: ${plan === 'PROFESIONAL' ? 'Plan Profesional (Backups Diarios a la 1 AM + 30 copias)' : 'Plan Básico (Cuota 5 copias, solo Semanal)'}`,
      'OK',
      { duration: 4000 }
    );
  }

  /**
   * Carga el catálogo de backups almacenados en el servidor (CU-18)
   */
  cargarCatalogoBackups(): void {
    this.cargandoLista = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/listar`;

    this.http.get<{ total_backups: number; backups: BackupItem[]; configuracion_cron?: ProgramacionConfig }>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.backups = resp.backups || [];
          if (resp.configuracion_cron) {
            this.configAuto = { ...this.configAuto, ...resp.configuracion_cron };
            if (this.configAuto.plan_activo) {
              this.planSimulado = this.configAuto.plan_activo.toUpperCase() === 'BASICO' ? 'BASICO' : 'PROFESIONAL';
            }
          }
          this.cargandoLista = false;
        },
        error: () => {
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
   * Consulta la configuración de automatización y cron
   */
  cargarProgramacion(): void {
    const url = `${this.config.getApiBaseUrl()}/v1/backup/programacion`;
    this.http.get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp.configuracion) {
            this.configAuto = { ...this.configAuto, ...resp.configuracion };
            if (this.configAuto.plan_activo) {
              this.planSimulado = this.configAuto.plan_activo.toUpperCase() === 'BASICO' ? 'BASICO' : 'PROFESIONAL';
            }
          }
        },
        error: (err) => console.log('Error cargando programacion:', err)
      });
  }

  /**
   * Guarda los parámetros de programación automática (Hora, Frecuencia, Días, Retención)
   */
  guardarConfiguracionProgramacion(): void {
    this.guardandoProgramacion = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/programacion`;

    const payload = {
      activo: this.configAuto.activo,
      hora: this.configAuto.hora,
      frecuencia: this.configAuto.frecuencia,
      dia_semana: this.configAuto.dia_semana,
      max_retencion: Number(this.configAuto.max_retencion) || this.cuotaMaximaPlan,
      plan: this.planSimulado
    };

    this.http.post<any>(url, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.guardandoProgramacion = false;
          if (resp.configuracion) {
            this.configAuto = { ...this.configAuto, ...resp.configuracion };
          }
          this.snackBar.open(
            `Programación guardada: Ejecución ${this.configAuto.frecuencia} a las ${this.configAuto.hora} (${this.configAuto.dia_semana}).`,
            'OK',
            { duration: 4500 }
          );
        },
        error: (err) => {
          this.guardandoProgramacion = false;
          console.error('Error guardando programacion:', err);
          this.snackBar.open('Error al guardar la configuración de automatización.', 'Cerrar', { duration: 4000 });
        }
      });
  }

  /**
   * Dispara el ciclo automático simulando el cron de las 01:00 AM (demostración en vivo para la docente)
   */
  simularCronAutomatico(): void {
    this.ejecutandoCronAuto = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/disparar-cron-automatico`;

    this.http.post<any>(url, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.ejecutandoCronAuto = false;
          const archivo = resp.archivo;
          this.snackBar.open(
            `Ciclo de backup automático ejecutado a las ${this.configAuto.hora} AM. Archivo '${archivo.nombre}' registrado con firma SHA-256.`,
            'OK',
            { duration: 5500 }
          );
          this.cargarCatalogoBackups();
          this.seccionActiva = 'CATALOGO';
        },
        error: (err) => {
          this.ejecutandoCronAuto = false;
          console.error('Error disparando cron automatico:', err);
          this.snackBar.open('Error al disparar el ciclo automático de backup.', 'Cerrar', { duration: 4000 });
        }
      });
  }

  /**
   * Genera un volcado manual bajo demanda con tipo configurable (Operativo, Cierre de Mes, Fin de Gestión)
   */
  generarBackupManual(): void {
    this.generandoBackup = true;
    const url = `${this.config.getApiBaseUrl()}/v1/backup/generar`;

    const payload = {
      tipo: this.tipoManualSeleccionado,
      descripcion: this.descripcionManual
    };

    this.http.post<any>(url, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          this.generandoBackup = false;
          const archivo = resp.archivo;
          const metricas = resp.metricas;
          this.snackBar.open(
            `Copia manual '${archivo.nombre}' generada exitosamente (${metricas.tablas_respaldadas} tablas, ${metricas.total_tuplas_respaldadas} tuplas).`,
            'OK',
            { duration: 5000 }
          );
          this.cargarCatalogoBackups();
          this.seccionActiva = 'CATALOGO';
        },
        error: (err) => {
          this.generandoBackup = false;
          console.error('Error generando backup manual:', err);
          this.snackBar.open('Error al generar la copia manual de seguridad.', 'Cerrar', { duration: 5000 });
        }
      });
  }

  /**
   * Compatibilidad: botón directo rápido
   */
  generarNuevoBackup(): void {
    this.generarBackupManual();
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

  prepararRestauracion(backup: BackupItem): void {
    this.backupSeleccionadoParaRestaurar = backup;
    this.codigoConfirmacion = '';
    this.ultimoResultadoRestauracion = null;
  }

  cancelarRestauracion(): void {
    this.backupSeleccionadoParaRestaurar = null;
    this.codigoConfirmacion = '';
  }

  usarCodigoOficial(): void {
    this.codigoConfirmacion = this.CODIGO_OFICIAL;
  }

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
        },
        error: (err) => {
          this.restaurando = false;
          console.error('Error restaurando archivo local:', err);
          this.snackBar.open('Error al restaurar archivo local externo.', 'Cerrar', { duration: 5000 });
        }
      });
  }
}
