import { Component, OnInit, ChangeDetectorRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DevolucionesService, Devolucion } from '../../../services/devoluciones.service';

@Component({
  selector: 'app-gestion-devoluciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './gestion-devoluciones.component.html',
  styleUrls: ['./gestion-devoluciones.component.scss']
})
export class GestionDevolucionesComponent implements OnInit {
  @ViewChild('responderDialog') responderDialog!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

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
  isLoading = false;

  // Modal para responder solicitud
  selectedDevolucion: Devolucion | null = null;
  observacionAdmin: string = '';

  constructor(
    private devolucionesService: DevolucionesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

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

  ngOnInit(): void {
    this.cargarDevoluciones();
  }

  cargarDevoluciones(): void {
    this.isLoading = true;
    this.devolucionesService.getTodasDevolucionesAdmin().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.devoluciones = data;
        } else if (data && Array.isArray(data.results)) {
          this.devoluciones = data.results;
        } else {
          this.devoluciones = [];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar la lista de devoluciones:', err);
        this.snackBar.open('Error al cargar la lista de devoluciones', 'Cerrar', { duration: 4000 });
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

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
          const statusText = estado === 'APROBADA' ? 'aprobada' : 'rechazada';
          this.snackBar.open(`Solicitud #${devActualizada.id || this.selectedDevolucion?.id} ${statusText} exitosamente.`, 'Cerrar', { duration: 4000 });
          this.cerrarModal();
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
}
