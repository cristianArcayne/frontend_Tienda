import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { AuthService } from 'src/app/services/auth.service';
import { Plan } from 'src/app/models/empresa/plan.model';

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
    MatChipsModule
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class EmpresaInicioComponent implements OnInit {
  planes: Plan[] = [];
  isLoading = false;
  errorMessage = '';
  isLoggedIn = false;

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    this.cargarPlanes();
  }

  cerrarSesion(): void {
    this.authService.logout().subscribe(() => {
      this.isLoggedIn = false;
      this.router.navigate(['/login']);
    });
  }

  cargarPlanes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const url = this.configService.getApiUrl('planes');

    this.apiService.getWithPagination<Plan>(url, 1, 100, { activos: 1 })
      .subscribe({
        next: (data: any) => {
          this.planes = data.results || (Array.isArray(data) ? data : []);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar planes:', error);
          this.errorMessage = 'No se pudieron cargar los planes disponibles.';
          this.isLoading = false;
        }
      });
  }

  getPrecio(plan: Plan, ciclo: 'mensual' | 'anual'): number {
    return ciclo === 'mensual' ? plan.precio_mensual : plan.precio_anual;
  }

  getFeatures(plan: Plan): string[] {
    const features: string[] = [];

    if (plan.soporta_ar || plan.feature_realidad_aumentada) {
      features.push('Probador Virtual con Realidad Aumentada (AR)');
    }
    if (plan.soporta_ia || plan.feature_reportes_dinamicos) {
      features.push('Analítica Predictiva y Reportes con IA / ML');
    } else {
      features.push('Reportes estándar de inventario y ventas');
    }
    if (plan.soporta_offline || plan.feature_backup_automatico) {
      features.push('Operación POS Offline y Sincronización');
    }
    features.push('Gestión de Clientes, Ventas POS y Reservas');
    features.push('Facturación y Catálogo Digital');

    return features;
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
