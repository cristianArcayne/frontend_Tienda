import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
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
  templateUrl: './gestion-devoluciones.component.html'
})
export class GestionDevolucionesComponent implements OnInit {
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
    private cdr: ChangeDetectorRef
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
    this.observacionAdmin = '';
  }

  cerrarModal(): void {
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
    switch ((estado || '').toUpperCase()) {
      case 'APROBADA':
        return 'badge bg-success text-white px-2 py-1';
      case 'RECHAZADA':
        return 'badge bg-danger text-white px-2 py-1';
      case 'PENDIENTE':
      case 'SOLICITADA':
      case 'EN_REVISION':
        return 'badge bg-warning text-dark px-2 py-1';
      default:
        return 'badge bg-secondary text-white px-2 py-1';
    }
  }
}

