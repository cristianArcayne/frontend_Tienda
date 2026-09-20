import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  count: number;
  next: string | null;
  previous: string | null;
  results: BitacoraAuditoria[];
}

@Component({
  selector: 'app-bitacora-auditoria',
  standalone: true,
  imports: [
    CommonModule,
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
  displayedColumns: string[] = [
    'fecha',
    'hora',
    'usuario_username',
    'accion',
    'ip_cliente',
    'detalles',
  ];
  dataSource: BitacoraAuditoria[] = [];

  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  isLoading = false;

  private fb = inject(FormBuilder);

  filtrosForm = this.fb.group({
    accion: [''],
  });

  acciones = [
    { value: 'INSERT', label: 'Creación' },
    { value: 'UPDATE', label: 'Actualización' },
    { value: 'DELETE', label: 'Eliminación' },
    { value: 'LOGIN', label: 'Inicio de sesión' },
    { value: 'LOGOUT', label: 'Cierre de sesión' },
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

  loadBitacora(): void {
    this.isLoading = true;

    this.http.get<BitacoraPaginatedResponse>(
      this.configService.getApiUrl('bitacora'),
      { params: this.getParams() }
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dataSource = this.getRegistros(data);
          this.totalItems = this.getTotalRegistros(data, this.dataSource.length);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar bitacora de auditoria:', error);
          this.snackBar.open('Error al cargar la bitácora de auditoría', 'Cerrar', { duration: 5000 });
          this.isLoading = false;
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
    this.loadBitacora();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadBitacora();
  }

  getUsuario(registro: BitacoraAuditoria): string {
    if (registro.usuario_username) {
      return registro.usuario_username;
    }
    if (registro.username) {
      return registro.username;
    }
    if (registro.usuarios_id) {
      return `Usuario #${registro.usuarios_id}`;
    }
    if (typeof registro.usuario === 'string') {
      return registro.usuario;
    }
    if (typeof registro.usuario === 'number') {
      return `Usuario #${registro.usuario}`;
    }
    if (registro.usuario) {
      return registro.usuario.nombre_completo || registro.usuario.username || registro.usuario.email || 'Usuario';
    }
    return 'Sistema';
  }

  getAccionFormatted(registro: BitacoraAuditoria): string {
    const raw = (registro.accion || registro.action || registro.metodo || 'Consulta').toUpperCase().trim();
    if (raw.includes('INSERT') || raw.includes('CREATE') || raw.includes('ADD') || raw.includes('CREAR')) {
      return 'Creación';
    }
    if (raw.includes('UPDATE') || raw.includes('EDIT') || raw.includes('ACTUALIZAR')) {
      return 'Actualización';
    }
    if (raw.includes('DELETE') || raw.includes('REMOVE') || raw.includes('ELIMINAR')) {
      return 'Eliminación';
    }
    if (raw.includes('LOGIN') || raw.includes('ACCESO') || raw.includes('INICIO')) {
      return 'Inicio de sesión';
    }
    if (raw.includes('LOGOUT') || raw.includes('CIERRE') || raw.includes('SALIDA')) {
      return 'Cierre de sesión';
    }
    if (raw.includes('VENTA') || raw.includes('ECOMMERCE') || raw.includes('PAGO')) {
      return 'Venta digital';
    }
    if (raw.includes('RESERVA')) {
      return 'Reserva';
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  getAccionClass(registro: BitacoraAuditoria): string {
    const raw = (registro.accion || registro.action || registro.metodo || '').toUpperCase().trim();
    if (raw.includes('INSERT') || raw.includes('CREATE') || raw.includes('ADD') || raw.includes('CREAR')) {
      return 'badge-crear';
    }
    if (raw.includes('UPDATE') || raw.includes('EDIT') || raw.includes('ACTUALIZAR')) {
      return 'badge-actualizar';
    }
    if (raw.includes('DELETE') || raw.includes('REMOVE') || raw.includes('ELIMINAR')) {
      return 'badge-eliminar';
    }
    if (raw.includes('LOGIN') || raw.includes('ACCESO') || raw.includes('INICIO')) {
      return 'badge-login';
    }
    if (raw.includes('LOGOUT') || raw.includes('CIERRE') || raw.includes('SALIDA')) {
      return 'badge-logout';
    }
    if (raw.includes('VENTA') || raw.includes('ECOMMERCE') || raw.includes('PAGO')) {
      return 'badge-venta';
    }
    if (raw.includes('RESERVA')) {
      return 'badge-reserva';
    }
    return 'badge-default';
  }

  getAccionIcon(registro: BitacoraAuditoria): string {
    const raw = (registro.accion || registro.action || registro.metodo || '').toUpperCase().trim();
    if (raw.includes('INSERT') || raw.includes('CREATE') || raw.includes('ADD') || raw.includes('CREAR')) {
      return 'add_circle_outline';
    }
    if (raw.includes('UPDATE') || raw.includes('EDIT') || raw.includes('ACTUALIZAR')) {
      return 'edit_note';
    }
    if (raw.includes('DELETE') || raw.includes('REMOVE') || raw.includes('ELIMINAR')) {
      return 'delete_outline';
    }
    if (raw.includes('LOGIN') || raw.includes('ACCESO') || raw.includes('INICIO')) {
      return 'login';
    }
    if (raw.includes('LOGOUT') || raw.includes('CIERRE') || raw.includes('SALIDA')) {
      return 'logout';
    }
    if (raw.includes('VENTA') || raw.includes('ECOMMERCE') || raw.includes('PAGO')) {
      return 'shopping_bag';
    }
    if (raw.includes('RESERVA')) {
      return 'event_available';
    }
    return 'info';
  }

  getDescripcion(registro: BitacoraAuditoria): string {
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

  getCuBadge(registro: BitacoraAuditoria): string | null {
    const desc = this.getDescripcion(registro);
    const match = desc.match(/\[?(CU\s*-?\s*\d+)\]?/i);
    if (match) {
      return match[1].toUpperCase().replace(/\s+/g, '');
    }
    return null;
  }

  getDescripcionLimpia(registro: BitacoraAuditoria): string {
    const desc = this.getDescripcion(registro);
    const cleaned = desc.replace(/\[?CU\s*-?\s*\d+\]?:?\s*/i, '').trim();
    return cleaned || desc;
  }

  getIp(registro: BitacoraAuditoria): string {
    return registro.ip_cliente || registro.ip || registro.ip_address || '-';
  }

  getFecha(registro: BitacoraAuditoria): string | null {
    return registro.fecha || registro.fecha_hora || registro.created_at || registro.timestamp || null;
  }

  getHora(registro: BitacoraAuditoria): string | null {
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

  private getRegistros(response: unknown): BitacoraAuditoria[] {
    if (Array.isArray(response)) {
      return response as BitacoraAuditoria[];
    }

    if (this.isObjectResponse(response)) {
      const results = response['results'];
      const data = response['data'];
      const registros = response['registros'];

      if (Array.isArray(results)) {
        return results as BitacoraAuditoria[];
      }
      if (Array.isArray(data)) {
        return data as BitacoraAuditoria[];
      }
      if (Array.isArray(registros)) {
        return registros as BitacoraAuditoria[];
      }
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
