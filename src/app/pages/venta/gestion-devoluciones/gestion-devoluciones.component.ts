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
    'id',
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

  ngOnInit(): void {
    this.cargarDevoluciones();
  }

  cargarDevoluciones(): void {
    this.isLoading = true;
    this.devolucionesService.getTodasDevolucionesAdmin().subscribe({
      next: (data) => {
        this.devoluciones = data;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
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
          this.snackBar.open(`Solicitud #${devActualizada.id} ${statusText} exitosamente.`, 'Cerrar', { duration: 4000 });
          this.cerrarModal();
          this.cargarDevoluciones();
        },
        error: (err) => {
          const detail = err?.error?.detail || 'Error al procesar la devolución';
          this.snackBar.open(detail, 'Cerrar', { duration: 4000 });
        }
      });
  }

  getEstadoClass(estado: string): string {
    switch (estado.toUpperCase()) {
      case 'APROBADA':
        return 'badge bg-success';
      case 'RECHAZADA':
        return 'badge bg-danger';
      case 'PENDIENTE':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }
}
