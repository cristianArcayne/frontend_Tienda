import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './panel-superadmin.html',
})
export class PanelSuperadmin implements OnInit {
  empresas: EmpresaPanel[] = [];
  isLoading = false;
  totalEmpresas = 0;
  paginaActual = 1;
  pageSize = 10;

  get totalPaginas(): number {
    return Math.ceil(this.totalEmpresas / this.pageSize);
  }

  get username(): string {
    return this.authService.getCurrentAuthState().username ?? 'Superadmin';
  }

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.isLoading = true;
    const url = `${this.configService.getApiBaseUrl()}/empresas/panel/`;
    this.apiService
      .getWithPagination<EmpresaPanel>(url, this.paginaActual, this.pageSize)
      .subscribe({
        next: (res: Pagination<EmpresaPanel>) => {
          this.empresas = res.results;
          this.totalEmpresas = res.count;
          this.isLoading = false;
        },
        error: () => {
          this.snackBar.open('Error al cargar empresas', 'Cerrar', { duration: 4000 });
          this.isLoading = false;
        },
      });
  }

  irPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
    this.cargarEmpresas();
  }

  verSuscripcion(empresa: EmpresaPanel): void {
    this.dialog.open(SuscripcionModal, {
      width: '420px',
      data: empresa,
    });
  }

  getEstadoColor(estado: string): string {
    const map: Record<string, string> = {
      activa: '#2e7d32',
      trial: '#1565c0',
      pausada: '#e65100',
      cancelada: '#c62828',
      expirada: '#757575',
    };
    return map[estado] ?? '#757575';
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/superadmin/login']);
    });
  }
}