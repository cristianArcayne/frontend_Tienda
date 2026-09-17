import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { Plan } from 'src/app/models/empresa/plan.model';
import { LoginEmpresaComponent } from './login-empresa/login-empresa.component';

@Component({
  selector: 'app-empresa-inicio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class EmpresaInicioComponent implements OnInit {
  planes: Plan[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const url = this.configService.getApiUrl('planes');

    this.apiService.getWithPagination<Plan>(url, 1, 100, { activos: 1 })
      .subscribe({
        next: (data) => {
          this.planes = data.results || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar planes:', error);
          this.errorMessage = 'No se pudieron cargar los planes.';
          this.isLoading = false;
        }
      });
  }

  getPrecio(plan: Plan, ciclo: 'mensual' | 'anual'): number {
    return ciclo === 'mensual' ? plan.precio_mensual : plan.precio_anual;
  }

  getFeatures(plan: Plan): string[] {
    const features: string[] = [];

    if (plan.feature_realidad_aumentada) {
      features.push('Realidad aumentada en el catalogo');
    }
    if (plan.feature_fotos_3d) {
      features.push('Fotos 3D para muebles');
    }
    if (plan.feature_reportes_dinamicos) {
      features.push('Reportes dinamicos');
    }
    if (plan.feature_backup_automatico) {
      features.push('Backup automatico');
    }

    return features;
  }

  abrirLogin(): void {
    const dialogRef = this.dialog.open(LoginEmpresaComponent, {
      width: '420px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe((nombreEmpresa: string | undefined) => {
      if (!nombreEmpresa) {
        return;
      }

      const subdominio = this.generarSubdominio(nombreEmpresa);
      if (!subdominio) {
        return;
      }

      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';

      let baseDomain = hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        baseDomain = 'localhost';
      }

      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('tenant_schema');
      localStorage.removeItem('username');

      window.location.href = `${protocol}//${subdominio}.${baseDomain}${port}/login`;
    });
  }

  private generarSubdominio(nombreEmpresa: string): string {
    let slug = nombreEmpresa.toLowerCase();
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  }
}
