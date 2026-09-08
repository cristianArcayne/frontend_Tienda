import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <!-- HERO BIENVENIDA -->
      <div class="welcome-banner">
        <div class="banner-content">
          <div class="banner-badges">
            <span class="badge-role" [ngClass]="getRoleClass()">
              {{ currentUser()?.rol | uppercase }}
            </span>
            <span class="badge-ci">CI: {{ currentUser()?.ci }}</span>
          </div>
          <h1 class="font-serif banner-title">
            Bienvenido al Atelier, {{ currentUser()?.nombre }}
          </h1>
          <p class="banner-desc">
            Panel de control operativo y administrativo. Supervise las transacciones, bitácora de auditoría y catálogo de prendas.
          </p>
        </div>

        <div class="banner-actions">
          <a routerLink="/bitacora" class="btn-primary-action">
            <span class="material-symbols-outlined">security</span>
            CONSULTAR BITÁCORA DE AUDITORÍA
          </a>
        </div>
      </div>

      <!-- TARJETAS DE MÓDULOS -->
      <div class="modules-grid">
        <!-- Módulo 1: Bitácora -->
        <div class="module-card card-featured">
          <div class="card-icon">
            <span class="material-symbols-outlined">history_edu</span>
          </div>
          <span class="card-tag">CONTROL DE SEGURIDAD</span>
          <h2 class="card-title font-serif">Bitácora de Uso</h2>
          <p class="card-text">
            Visualice accesos exitosos, intentos fallidos, solicitudes de recuperación de clave y modificaciones sobre la base de datos.
          </p>
          <a routerLink="/bitacora" class="card-link">
            Abrir Bitácora &nbsp; →
          </a>
        </div>

        <!-- Módulo 2: Vestidor Virtual -->
        <div class="module-card">
          <div class="card-icon">
            <span class="material-symbols-outlined">checkroom</span>
          </div>
          <span class="card-tag">CATÁLOGO & TALLAS</span>
          <h2 class="card-title font-serif">Vestidor Atelier</h2>
          <p class="card-text">
            Explore el catálogo de alta costura, prendas disponibles, temporadas y reservas de citas en tienda.
          </p>
          <a routerLink="/vestidor" class="card-link">
            Explorar Vestidor &nbsp; →
          </a>
        </div>

        <!-- Módulo 3: Base de Datos & Configuración -->
        <div class="module-card">
          <div class="card-icon">
            <span class="material-symbols-outlined">database</span>
          </div>
          <span class="card-tag">POSTGRESQL</span>
          <h2 class="card-title font-serif">Estado de la Base de Datos</h2>
          <p class="card-text">
            Conectado a <strong>bd_tienda_virtual</strong> (21 tablas sincronizadas: usuario, cliente, empleado, bitacora_uso, ropa, etc.).
          </p>
          <span class="status-indicator">
            <span class="dot-green"></span> Conexión Estable (Puerto 5432)
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 1rem 0;
    }
    .welcome-banner {
      background: #fdfbf7;
      border: 1px solid #e8e3d8;
      padding: 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .banner-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .badge-role {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.25rem 0.65rem;
    }
    .badge-admin {
      background-color: #fce8e6;
      color: #b71c1c;
    }
    .badge-worker {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
    .badge-ci {
      background: #eeebe3;
      color: #666;
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
    }
    .banner-title {
      font-size: 2.2rem;
      color: #111;
      margin-bottom: 0.5rem;
    }
    .banner-desc {
      font-size: 0.9rem;
      color: #666;
      max-width: 600px;
    }
    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #111;
      color: #fff;
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.95rem 1.6rem;
      border-radius: 1px;
      transition: background 0.2s;
    }
    .btn-primary-action:hover {
      background: #333;
    }

    /* GRID */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .module-card {
      background: #ffffff;
      border: 1px solid #e8e3d8;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .card-featured {
      background: #fdfbf7;
      border-top: 3px solid #111;
    }
    .card-icon {
      color: #8e6d3d;
      margin-bottom: 1rem;
    }
    .card-icon span {
      font-size: 2rem;
    }
    .card-tag {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #8e6d3d;
      margin-bottom: 0.5rem;
      display: block;
    }
    .card-title {
      font-size: 1.5rem;
      color: #111;
      margin-bottom: 0.75rem;
    }
    .card-text {
      font-size: 0.85rem;
      color: #666;
      line-height: 1.5;
      margin-bottom: 1.5rem;
      flex: 1;
    }
    .card-link {
      color: #111;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #111;
      padding-bottom: 2px;
      align-self: flex-start;
    }
    .card-link:hover {
      opacity: 0.7;
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #137333;
      font-weight: 600;
    }
    .dot-green {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #137333;
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  getRoleClass(): string {
    const r = this.currentUser()?.rol?.toLowerCase();
    return r === 'administrador' ? 'badge-admin' : 'badge-worker';
  }
}
