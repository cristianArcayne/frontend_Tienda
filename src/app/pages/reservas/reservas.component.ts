import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReservasService, Reserva } from '../../services/reservas.service';
import { AuthService } from '../../services/auth.service';
import { PermisosService } from '../../services/permisos.service';
import { CrearReservaDialogComponent } from './crear-reserva-dialog/crear-reserva-dialog.component';
import { ConfirmDialogComponent } from '../inventario/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.scss']
})
export class ReservasComponent implements OnInit {
  misReservas: Reserva[] = [];
  todasReservas: Reserva[] = [];
  reservasFiltradas: Reserva[] = [];

  isLoadingMis = false;
  isLoadingTodas = false;
  isProcessing = false;

  filtroEstado = 'TODOS';
  filtroSucursal = 'TODAS';
  sucursales: any[] = [];

  esPersonal = false;
  usuarioActual = '';

  displayedColumns: string[] = ['id', 'prenda', 'sucursal', 'fecha', 'limite', 'total', 'estado', 'acciones'];

  constructor(
    private reservasService: ReservasService,
    private authService: AuthService,
    private permisosService: PermisosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.usuarioActual = this.authService.getUsername() || 'admin';
    const roles = this.authService.getRoles() || [];
    this.esPersonal = this.authService.isSuperuser() || roles.some(r =>
      r && ['administrador', 'admin', 'cajero pos', 'vendedor'].includes(r.toLowerCase())
    );
  }

  ngOnInit(): void {
    this.cargarMisReservas();
    this.cargarSucursales();
    if (this.esPersonal) {
      this.cargarTodasReservas();
    }
  }

  cargarSucursales(): void {
    this.reservasService.getSucursales().subscribe({
      next: (res) => { this.sucursales = res; },
      error: () => {
        this.sucursales = [
          { id: 1, nombre: 'Sucursal Central' },
          { id: 2, nombre: 'Sucursal Equipetrol' },
          { id: 3, nombre: 'Sucursal Ventura Mall' }
        ];
      }
    });
  }

  cargarMisReservas(): void {
    this.isLoadingMis = true;
    this.reservasService.getMisReservas(this.usuarioActual).subscribe({
      next: (data) => {
        this.misReservas = data;
        this.isLoadingMis = false;
      },
      error: () => {
        this.isLoadingMis = false;
        this.snackBar.open('Error al cargar mis reservas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarTodasReservas(): void {
    this.isLoadingTodas = true;
    this.reservasService.getTodasReservas().subscribe({
      next: (data) => {
        this.todasReservas = data;
        this.aplicarFiltros();
        this.isLoadingTodas = false;
      },
      error: () => {
        this.isLoadingTodas = false;
        this.snackBar.open('Error al cargar reservas de la cadena', 'Cerrar', { duration: 3000 });
      }
    });
  }

  aplicarFiltros(): void {
    this.reservasFiltradas = this.todasReservas.filter(r => {
      const matchEstado = this.filtroEstado === 'TODOS' || r.estado === this.filtroEstado;
      const matchSucursal = this.filtroSucursal === 'TODAS' || r.sucursal_id.toString() === this.filtroSucursal;
      return matchEstado && matchSucursal;
    });
  }

  abrirDialogoNuevaReserva(): void {
    const ref = this.dialog.open(CrearReservaDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      disableClose: false,
      data: {}
    });

    ref.afterClosed().subscribe((reservaCreada) => {
      if (reservaCreada) {
        this.cargarMisReservas();
        if (this.esPersonal) {
          this.cargarTodasReservas();
        }
      }
    });
  }

  confirmarRetiro(reserva: Reserva): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        titulo: 'Confirmar Retiro en Tienda',
        mensaje: `¿Confirmar retiro presencial y cobro en mostrador para la Reserva #${reserva.id} (${reserva.cliente_nombre || 'Cliente'})?`,
        submensaje: 'Se emitirá la factura fiscal y se descontará el stock físico de la sucursal.',
        textoBoton: 'Confirmar Retiro',
        colorBoton: 'primary',
        icono: 'storefront'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.isProcessing = true;
      this.reservasService.confirmarRetiro(reserva.id).subscribe({
        next: (res) => {
          this.isProcessing = false;
          this.snackBar.open(`¡Retiro confirmado! Stock físico rebajado y reserva #${res.id} completada.`, 'OK', { duration: 4000 });
          this.cargarMisReservas();
          if (this.esPersonal) this.cargarTodasReservas();
        },
        error: (err) => {
          this.isProcessing = false;
          const msg = err.error?.detail || 'Error al confirmar retiro';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
    });
  }

  cancelarReserva(reserva: Reserva): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        titulo: 'Cancelar Reserva',
        mensaje: `¿Estás seguro de cancelar la Reserva #${reserva.id}?`,
        submensaje: 'El stock congelado volverá a estar disponible inmediatamente en la tienda.',
        textoBoton: 'Cancelar Reserva',
        colorBoton: 'warn',
        icono: 'event_busy'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.isProcessing = true;
      this.reservasService.cancelarReserva(reserva.id).subscribe({
        next: () => {
          this.isProcessing = false;
          this.snackBar.open(`Reserva #${reserva.id} cancelada. Stock liberado exitosamente.`, 'OK', { duration: 3000 });
          this.cargarMisReservas();
          if (this.esPersonal) this.cargarTodasReservas();
        },
        error: (err) => {
          this.isProcessing = false;
          const msg = err.error?.detail || 'Error al cancelar la reserva';
          this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  expirarVencidas(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        titulo: 'Barrido de Expiración',
        mensaje: '¿Deseas ejecutar el barrido de expiración automática de reservas con más de 48 horas?',
        submensaje: 'Las reservas vencidas pasarán a EXPIRADA y se liberará su stock.',
        textoBoton: 'Ejecutar Barrido',
        colorBoton: 'warn',
        icono: 'history'
      }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      this.isProcessing = true;
      this.reservasService.expirarVencidas().subscribe({
        next: (res) => {
          this.isProcessing = false;
          this.snackBar.open(`Barrido ejecutado: ${res.reservas_expiradas} reservas expiradas, ${res.unidades_stock_liberadas} unidades liberadas.`, 'OK', { duration: 5000 });
          this.cargarMisReservas();
          if (this.esPersonal) this.cargarTodasReservas();
        },
        error: () => {
          this.isProcessing = false;
          this.snackBar.open('Error al ejecutar expiración', 'Cerrar', { duration: 3000 });
        }
      });
    });
  }

  getHorasRestantes(fechaLimiteStr: string): string {
    if (!fechaLimiteStr) return '48h 00m';
    const fin = new Date(fechaLimiteStr).getTime();
    const ahora = new Date().getTime();
    const difMs = fin - ahora;
    if (isNaN(fin) || difMs <= 0) return 'Vencida';
    let horas = Math.floor(difMs / (1000 * 60 * 60));
    if (horas > 48) {
      horas = 48;
    }
    const minutos = Math.floor((difMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}h ${minutos < 10 ? '0' + minutos : minutos}m`;
  }
}
