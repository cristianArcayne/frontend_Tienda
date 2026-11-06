import { EditarEmpresaModal } from './editar-empresa-modal/editar-empresa-modal';
import { RegistrarEmpresaModal } from './registrar-empresa-modal/registrar-empresa-modal';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ConfigService } from '../../../services/config.service';
import { EmpresaPanel } from '../../../models/empresa/empresa-panel.model';
import { Pagination } from '../../../models/pagination.model';
import { SuscripcionModal } from './suscripcion-modal/suscripcion-modal';

@Component({
  selector: 'app-panel-superadmin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './panel-superadmin.html',
  styleUrls: ['./panel-superadmin.scss'],
})
export class PanelSuperadmin implements OnInit {
  todasEmpresas: EmpresaPanel[] = [];
  empresasFiltradas: EmpresaPanel[] = [];
  isLoading = false;
  totalEmpresas = 0;
  paginaActual = 1;
  pageSize = 20;

  // Filtros
  searchTerm = '';
  filtroEstado = 'TODOS';
  filtroPlan = 'TODOS';

  displayedColumns: string[] = [
    'id',
    'empresa',
    'contacto',
    'plan',
    'periodo',
    'cuotas',
    'estado',
    'acciones',
  ];

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    public authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.authService.isSuperuser()) {
      this.snackBar.open(
        'Acceso denegado: El Panel Multi-Tenant está reservado exclusivamente para el Superadministrador de la plataforma.',
        'Cerrar',
        { duration: 5000 }
      );
      this.router.navigate(['/dashboard']);
      return;
    }
    this.cargarEmpresas();
  }

  get username(): string {
    return this.authService.getCurrentAuthState().username ?? 'Superadmin';
  }

  // KPIs
  get totalActivas(): number {
    return this.todasEmpresas.filter((e) => e.is_active).length;
  }

  get totalProfesionales(): number {
    return this.todasEmpresas.filter(
      (e) => e.suscripcion_actual?.plan_nombre?.toLowerCase().includes('profesional')
    ).length;
  }

  get totalBasicos(): number {
    return this.todasEmpresas.filter(
      (e) => !e.suscripcion_actual?.plan_nombre?.toLowerCase().includes('profesional')
    ).length;
  }

  get mrrTotal(): number {
    return this.todasEmpresas.reduce((acc, curr) => {
      const precio = curr.suscripcion_actual?.plan_precio || 0;
      return acc + precio;
    }, 0);
  }

  cargarEmpresas(): void {
    this.isLoading = true;
    const url = `${this.configService.getApiBaseUrl()}/empresas/panel/`;
    this.apiService
      .getWithPagination<EmpresaPanel>(url, this.paginaActual, this.pageSize)
      .subscribe({
        next: (res: Pagination<EmpresaPanel>) => {
          this.todasEmpresas = res.results || [];
          this.totalEmpresas = res.count || this.todasEmpresas.length;
          this.aplicarFiltros();
          this.isLoading = false;
        },
        error: () => {
          this.snackBar.open('Error al cargar datos de empresas y suscripciones', 'Cerrar', {
            duration: 4000,
          });
          this.isLoading = false;
        },
      });
  }

  aplicarFiltros(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.empresasFiltradas = this.todasEmpresas.filter((e) => {
      const matchText =
        !term ||
        e.nombre?.toLowerCase().includes(term) ||
        e.razon_social?.toLowerCase().includes(term) ||
        e.subdominio?.toLowerCase().includes(term) ||
        e.correo?.toLowerCase().includes(term) ||
        e.nit?.toLowerCase().includes(term);

      const matchEstado =
        this.filtroEstado === 'TODOS' ||
        (this.filtroEstado === 'ACTIVA' && e.is_active) ||
        (this.filtroEstado === 'INACTIVA' && !e.is_active);

      const matchPlan =
        this.filtroPlan === 'TODOS' ||
        (this.filtroPlan === 'PROFESIONAL' &&
          e.suscripcion_actual?.plan_nombre?.toLowerCase().includes('profesional')) ||
        (this.filtroPlan === 'BASICO' &&
          !e.suscripcion_actual?.plan_nombre?.toLowerCase().includes('profesional'));

      return matchText && matchEstado && matchPlan;
    });
  }

  limpiarFiltros(): void {
    this.searchTerm = '';
    this.filtroEstado = 'TODOS';
    this.filtroPlan = 'TODOS';
    this.aplicarFiltros();
  }

  
  abrirModalEditar(empresa: EmpresaPanel): void {
    const dialogRef = this.dialog.open(EditarEmpresaModal, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: false,
      data: empresa,
    });

    dialogRef.afterClosed().subscribe((guardado) => {
      if (guardado) {
        this.cargarEmpresas();
      }
    });
  }

  abrirModalRegistro(): void {
    const dialogRef = this.dialog.open(RegistrarEmpresaModal, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((creado) => {
      if (creado) {
        this.cargarEmpresas();
      }
    });
  }

  verSuscripcion(empresa: EmpresaPanel, tabInicial: number = 0): void {
    const dialogRef = this.dialog.open(SuscripcionModal, {
      width: '650px',
      maxWidth: '95vw',
      data: { empresa, tabInicial },
    });

    dialogRef.afterClosed().subscribe((res: any) => {
      if (res === true) {
        this.cargarEmpresas();
      } else if (res && res.abrirEditar) {
        this.abrirModalEditar(empresa);
      }
    });
  }

  abrirModificarPlan(empresa: EmpresaPanel): void {
    this.verSuscripcion(empresa, 2);
  }

  cambiarAEmpresa(empresa: EmpresaPanel): void {
    this.authService.setEmpresaActiva(empresa.id, empresa.nombre);
    this.snackBar.open(
      `Cambiado a contexto de empresa: ${empresa.nombre} (ID ${empresa.id})`,
      'Entendido',
      { duration: 4000 }
    );
    this.router.navigate(['/dashboard']);
  }

  restablecerContextoGlobal(): void {
    this.authService.setEmpresaActiva(null, null);
    this.snackBar.open('Contexto restablecido a Plataforma Global SaaS', 'Cerrar', {
      duration: 3000,
    });
  }

  toggleEstado(empresa: EmpresaPanel): void {
    const nuevoEstado = empresa.is_active ? 'SUSPENDIDA' : 'ACTIVA';
    const url = `${this.configService.getApiBaseUrl()}/empresas/${empresa.id}/estado/`;
    this.apiService.put(url, { estado: nuevoEstado }).subscribe({
      next: () => {
        empresa.is_active = !empresa.is_active;
        empresa.estado = nuevoEstado;
        this.snackBar.open(
          `Empresa ${empresa.nombre} ahora está ${nuevoEstado}`,
          'Cerrar',
          { duration: 3000 }
        );
      },
      error: () => {
        this.snackBar.open('No se pudo cambiar el estado de la empresa', 'Cerrar', {
          duration: 4000,
        });
      },
    });
  }

  getEstadoColor(estado?: string): string {
    const st = (estado || '').toLowerCase();
    if (st === 'activa') return '#16a34a'; // verde
    if (st === 'trial') return '#2563eb'; // azul
    if (st === 'pausada') return '#ea580c'; // naranja
    if (st === 'suspendida' || st === 'cancelada') return '#dc2626'; // rojo
    return '#64748b';
  }

  getPlanBadgeClass(planNombre?: string): string {
    const n = (planNombre || '').toLowerCase();
    if (n.includes('profesional')) return 'badge-profesional';
    if (n.includes('enterprise')) return 'badge-enterprise';
    return 'badge-basico';
  }
}