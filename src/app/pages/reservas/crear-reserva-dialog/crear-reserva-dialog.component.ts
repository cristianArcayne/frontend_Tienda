import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { ReservasService } from '../../../services/reservas.service';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';

export interface DialogReservaData {
  producto?: any;
  variante?: any;
  sucursalId?: number;
}

@Component({
  selector: 'app-crear-reserva-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './crear-reserva-dialog.component.html',
  styleUrls: ['./crear-reserva-dialog.component.scss']
})
export class CrearReservaDialogComponent implements OnInit {
  form: FormGroup;
  sucursales: any[] = [];
  productos: any[] = [];
  variantes: any[] = [];
  isLoading = false;
  isSaving = false;
  cargandoDisponibilidad = false;

  turnos = [
    'Hoy - Turno Tarde (14:00 - 18:00)',
    'Mañana - Turno Mañana (10:00 - 13:00)',
    'Mañana - Turno Tarde (14:00 - 18:30)',
    'En 48 horas - Mañana (10:00 - 13:00)',
    'En 48 horas - Tarde (14:00 - 18:30)'
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CrearReservaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogReservaData,
    private reservasService: ReservasService,
    private authService: AuthService,
    private apiService: ApiService,
    private configService: ConfigService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      producto_id: [data?.producto?.id || null, Validators.required],
      variante_id: [data?.variante?.id || null, Validators.required],
      sucursal_id: [data?.sucursalId || null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      hora_estimada: [this.turnos[0], Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarSucursales();
    if (!this.data?.producto) {
      this.cargarProductos();
    } else {
      this.productos = [this.data.producto];
      if (this.data.producto.variantes && this.data.producto.variantes.length > 0) {
        this.variantes = this.data.producto.variantes;
        if (!this.form.value.variante_id) {
          this.form.patchValue({ variante_id: this.variantes[0].id });
        }
        this.actualizarDisponibilidadSucursales();
      } else {
        this.cargarVariantesDeProducto(this.data.producto.id);
      }
    }

    // Escuchar cambios de variante o cantidad para re-evaluar stock por sucursal
    this.form.get('variante_id')?.valueChanges.subscribe(() => {
      this.actualizarDisponibilidadSucursales();
    });
  }

  cargarSucursales(): void {
    this.reservasService.getSucursales().subscribe({
      next: (sucursales) => {
        this.sucursales = sucursales.map(s => ({ ...s, stock_disponible: undefined }));
        if (this.form.value.variante_id) {
          this.actualizarDisponibilidadSucursales();
        }
      },
      error: () => {
        this.sucursales = [
          { id: 1, nombre: 'Sucursal Central - Calle 21 Calacoto', stock_disponible: undefined },
          { id: 2, nombre: 'Sucursal Equipetrol - Av. San Martín', stock_disponible: undefined },
          { id: 3, nombre: 'Sucursal Ventura Mall - 4to Anillo', stock_disponible: undefined }
        ];
      }
    });
  }

  cargarProductos(): void {
    const url = this.configService.getApiUrl('catalogo');
    this.apiService.getWithPagination<any>(url, 1, 50).subscribe({
      next: (res: any) => {
        this.productos = res?.results || (Array.isArray(res) ? res : []);
        if (this.productos.length > 0) {
          this.form.patchValue({ producto_id: this.productos[0].id });
          this.onProductoChange(this.productos[0].id);
        }
      }
    });
  }

  onProductoChange(productoId: number): void {
    this.form.patchValue({ variante_id: null });
    this.cargarVariantesDeProducto(productoId);
  }

  cargarVariantesDeProducto(productoId: number): void {
    const prodLocal = this.productos.find(p => p.id === productoId);
    if (prodLocal && prodLocal.variantes && prodLocal.variantes.length > 0) {
      this.variantes = prodLocal.variantes;
      this.form.patchValue({ variante_id: this.variantes[0].id });
      this.actualizarDisponibilidadSucursales();
      return;
    }
    this.apiService.getById<any>(this.configService.getApiUrl('catalogo'), productoId).subscribe({
      next: (prod) => {
        this.variantes = prod?.variantes || [];
        if (this.variantes.length > 0) {
          this.form.patchValue({ variante_id: this.variantes[0].id });
          this.actualizarDisponibilidadSucursales();
        }
      }
    });
  }

  actualizarDisponibilidadSucursales(): void {
    const varId = this.form.value.variante_id;
    const prodId = this.form.value.producto_id;
    if (!prodId && !varId) return;

    this.cargandoDisponibilidad = true;
    const url = `${this.configService.getApiBaseUrl()}/v1/catalogo-disponibilidad/?buscar=`;

    this.http.get<any[]>(url).subscribe({
      next: (catalogoDisponibilidad) => {
        this.cargandoDisponibilidad = false;
        if (!Array.isArray(catalogoDisponibilidad)) return;

        // Buscar producto en el desglose omnicanal
        const pMatch = catalogoDisponibilidad.find((item: any) => item.id === prodId);
        if (pMatch && pMatch.variantes) {
          const vMatch = pMatch.variantes.find((v: any) => v.variante_id === varId);
          if (vMatch && vMatch.existencias_por_sucursal) {
            // Mapear stock disponible por sucursal
            this.sucursales.forEach(s => {
              const ex = vMatch.existencias_por_sucursal.find((e: any) => e.sucursal_id === s.id);
              s.stock_disponible = ex ? ex.stock_disponible : 0;
            });

            // Auto-seleccionar la primera sucursal con stock disponible
            const sucursalConStock = this.sucursales.find(s => s.stock_disponible > 0);
            if (sucursalConStock && (!this.form.value.sucursal_id || (this.sucursalSeleccionada && this.sucursalSeleccionada.stock_disponible === 0))) {
              this.form.patchValue({ sucursal_id: sucursalConStock.id });
            }
          }
        }
      },
      error: () => {
        this.cargandoDisponibilidad = false;
      }
    });
  }

  get sucursalSeleccionada(): any {
    const sid = this.form.value.sucursal_id;
    return this.sucursales.find(s => s.id === sid) || null;
  }

  get varianteSeleccionada(): any {
    const vid = this.form.value.variante_id;
    return this.variantes.find(v => v.id === vid) || null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor completa todos los campos de la reserva.', 'OK', { duration: 3000 });
      return;
    }

    const v = this.form.value;
    const sucursalElegida = this.sucursales.find(s => s.id === v.sucursal_id);

    if (sucursalElegida && sucursalElegida.stock_disponible !== undefined && sucursalElegida.stock_disponible < v.cantidad) {
      this.snackBar.open(`Stock insuficiente en ${sucursalElegida.nombre}. Disponibles: ${sucursalElegida.stock_disponible}. Selecciona otra sucursal.`, 'Cerrar', { duration: 5000 });
      return;
    }

    this.isSaving = true;
    const clienteId = this.authService.getUsername() || 'admin';

    const payload = {
      cliente_id: clienteId,
      sucursal_id: v.sucursal_id, // Enviado exactamente para descontar de ESTA sucursal específica
      hora_estimada: v.hora_estimada,
      detalles: [
        {
          variante_id: v.variante_id,
          cantidad: v.cantidad
        }
      ]
    };

    this.reservasService.crearReserva(payload).subscribe({
      next: (reserva) => {
        this.isSaving = false;
        const nombreSuc = sucursalElegida ? sucursalElegida.nombre : `Sucursal #${reserva.sucursal_id}`;
        this.snackBar.open(`¡Reserva #${reserva.id} confirmada! Stock apartado por 48h en ${nombreSuc}.`, 'OK', { duration: 5000 });
        this.dialogRef.close(reserva);
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err.error?.detail || err.error?.message || 'Error al crear la reserva. Verifica el stock en la sucursal elegida.';
        this.snackBar.open(msg, 'Cerrar', { duration: 6000 });
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
