import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BitacoraService } from '../../core/services/bitacora.service';
import { AuthService } from '../../core/services/auth.service';
import { BitacoraEntry } from '../../core/models/auth.models';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bitacora-layout">
      <!-- HEADER -->
      <div class="bitacora-header">
        <div>
          <div class="header-badges">
            <span class="portal-badge">SEGURIDAD & AUDITORÍA</span>
            <span class="role-badge" [ngClass]="userRoleClass()">
              ROL: {{ currentUser()?.rol | uppercase }}
            </span>
          </div>
          <h1 class="header-title font-serif">Bitácora de Uso del Sistema</h1>
          <p class="header-subtitle">
            Registro cronológico y detallado de autenticaciones, transacciones y eventos en la plataforma.
          </p>
        </div>

        <div class="header-actions">
          <button class="btn-refresh" (click)="loadLogs()" [disabled]="isLoading()">
            <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
            ACTUALIZAR
          </button>
        </div>
      </div>

      <!-- BARRA DE FILTROS -->
      <div class="filter-card">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="applyFilter()"
            placeholder="Buscar por acción o descripción..."
            class="filter-input"
          />
        </div>

        <div class="user-filter-box">
          <span class="material-symbols-outlined">person</span>
          <input 
            type="text" 
            [(ngModel)]="userFilter" 
            (input)="applyFilter()"
            placeholder="Filtrar por CI..."
            class="filter-input"
          />
        </div>

        <div class="stats-badge">
          <span>Registros encontrados: <strong>{{ filteredLogs().length }}</strong></span>
        </div>
      </div>

      <!-- TABLA DE AUDITORÍA -->
      <div class="table-container">
        <div *ngIf="isLoading()" class="loading-state">
          <span class="material-symbols-outlined spin">progress_activity</span>
          <p>Consultando bitácora de auditoría...</p>
        </div>

        <div *ngIf="!isLoading() && filteredLogs().length === 0" class="empty-state">
          <span class="material-symbols-outlined">history_toggle_off</span>
          <p>No se encontraron registros de auditoría que coincidan con los filtros.</p>
        </div>

        <table *ngIf="!isLoading() && filteredLogs().length > 0" class="audit-table">
          <thead>
            <tr>
              <th style="width: 70px;">ID</th>
              <th style="width: 170px;">FECHA Y HORA</th>
              <th style="width: 220px;">USUARIO</th>
              <th style="width: 130px;">ROL</th>
              <th>ACCIÓN REALIZADA</th>
              <th style="width: 130px;">TABLA AFECTADA</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredLogs()" class="table-row">
              <td class="col-id">#{{ item.id_bitacora }}</td>
              <td class="col-time">{{ formatTime(item.fecha_hora) }}</td>
              <td class="col-user">
                <div class="user-meta">
                  <span class="user-name">{{ item.usuario_nombre || 'Usuario Desconocido' }}</span>
                  <span class="user-ci">CI: {{ item.id_usuario || 'N/A' }}</span>
                </div>
              </td>
              <td>
                <span class="chip-role" [ngClass]="getRoleBadgeClass(item.usuario_rol)">
                  {{ (item.usuario_rol || 'Invitado') | uppercase }}
                </span>
              </td>
              <td>
                <div class="action-cell">
                  <span class="action-tag" [ngClass]="getActionTagClass(item.accion_realizada)">
                    {{ getActionCategory(item.accion_realizada) }}
                  </span>
                  <span class="action-desc">{{ item.accion_realizada }}</span>
                </div>
              </td>
              <td>
                <span class="table-tag">
                  {{ item.tabla_afectada || 'general' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .bitacora-layout {
      padding: 1.5rem 0;
    }
    .bitacora-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .portal-badge {
      background-color: #eae5d9;
      color: #72624e;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.25rem 0.65rem;
    }
    .role-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.25rem 0.65rem;
    }
    .role-admin {
      background-color: #fce8e6;
      color: #b71c1c;
    }
    .role-worker {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
    .header-title {
      font-size: 2.2rem;
      color: #111;
      margin-bottom: 0.25rem;
    }
    .header-subtitle {
      font-size: 0.85rem;
      color: #666;
    }
    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background-color: #111;
      color: #fff;
      border: none;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-refresh:hover:not(:disabled) {
      background-color: #333;
    }
    .btn-refresh:disabled {
      opacity: 0.7;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* FILTROS */
    .filter-card {
      display: flex;
      gap: 1rem;
      background-color: #fdfbf7;
      border: 1px solid #e8e3d8;
      padding: 0.9rem 1.25rem;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .search-box, .user-filter-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #ddd7cc;
      padding: 0.5rem 0.85rem;
      flex: 1;
      min-width: 220px;
    }
    .search-box span, .user-filter-box span {
      color: #888;
      font-size: 1.1rem;
    }
    .filter-input {
      border: none;
      outline: none;
      width: 100%;
      font-size: 0.85rem;
      color: #222;
      background: transparent;
    }
    .stats-badge {
      font-size: 0.8rem;
      color: #666;
    }

    /* TABLA */
    .table-container {
      background-color: #ffffff;
      border: 1px solid #e8e3d8;
      overflow-x: auto;
    }
    .audit-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .audit-table th {
      background-color: #f5f2eb;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #555;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e0dad0;
    }
    .audit-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f0ecdf;
      font-size: 0.825rem;
      vertical-align: middle;
    }
    .table-row:hover {
      background-color: #fcfbf8;
    }
    .col-id {
      font-family: monospace;
      font-weight: 700;
      color: #888;
    }
    .col-time {
      color: #555;
      font-size: 0.78rem;
      white-space: nowrap;
    }
    .user-meta {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-weight: 600;
      color: #111;
    }
    .user-ci {
      font-size: 0.72rem;
      color: #888;
    }
    .chip-role {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
    }
    .chip-admin {
      background-color: #fce8e6;
      color: #b71c1c;
    }
    .chip-worker {
      background-color: #e8f0fe;
      color: #1a73e8;
    }
    .chip-client {
      background-color: #e6f4ea;
      color: #137333;
    }
    .chip-anon {
      background-color: #f1f1f1;
      color: #666;
    }
    .action-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .action-tag {
      display: inline-block;
      align-self: flex-start;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.15rem 0.45rem;
      border-radius: 2px;
    }
    .tag-login {
      background-color: #e6f4ea;
      color: #137333;
    }
    .tag-failed {
      background-color: #fde8e8;
      color: #b71c1c;
    }
    .tag-reset {
      background-color: #fef7e0;
      color: #b06000;
    }
    .tag-info {
      background-color: #f1ede5;
      color: #6e5c46;
    }
    .action-desc {
      color: #333;
      font-size: 0.8rem;
    }
    .table-tag {
      font-family: monospace;
      font-size: 0.72rem;
      background-color: #f5f2eb;
      padding: 0.2rem 0.45rem;
      color: #555;
    }
    .loading-state, .empty-state {
      padding: 3rem;
      text-align: center;
      color: #888;
    }
    .loading-state span, .empty-state span {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      display: block;
    }
  `]
})
export class BitacoraComponent implements OnInit {
  private bitacoraService = inject(BitacoraService);
  private authService = inject(AuthService);

  logs = signal<BitacoraEntry[]>([]);
  filteredLogs = signal<BitacoraEntry[]>([]);
  isLoading = signal(false);
  searchTerm = '';
  userFilter = '';
  currentUser = this.authService.currentUser;

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.isLoading.set(true);
    this.bitacoraService.getBitacoras({ limit: 100 }).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  applyFilter() {
    let result = this.logs();
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(log => 
        log.accion_realizada.toLowerCase().includes(term) ||
        (log.usuario_nombre && log.usuario_nombre.toLowerCase().includes(term))
      );
    }
    if (this.userFilter) {
      const uTerm = this.userFilter.toLowerCase();
      result = result.filter(log => log.id_usuario && log.id_usuario.toLowerCase().includes(uTerm));
    }
    this.filteredLogs.set(result);
  }

  userRoleClass(): string {
    const r = this.currentUser()?.rol?.toLowerCase();
    return r === 'administrador' ? 'role-admin' : 'role-worker';
  }

  getRoleBadgeClass(rol?: string | null): string {
    if (!rol) return 'chip-anon';
    const r = rol.toLowerCase();
    if (r === 'administrador') return 'chip-admin';
    if (r === 'trabajador' || r === 'empleado') return 'chip-worker';
    if (r === 'cliente') return 'chip-client';
    return 'chip-anon';
  }

  getActionTagClass(action: string): string {
    if (action.includes('EXITOSO')) return 'tag-login';
    if (action.includes('FALLIDO') || action.includes('FALLIDA')) return 'tag-failed';
    if (action.includes('RECUPERACION') || action.includes('RESTABLECIDA')) return 'tag-reset';
    return 'tag-info';
  }

  getActionCategory(action: string): string {
    if (action.includes('EXITOSO')) return 'SESIÓN VÁLIDA';
    if (action.includes('FALLIDO') || action.includes('FALLIDA')) return 'ALERTA SEGURIDAD';
    if (action.includes('RECUPERACION') || action.includes('RESTABLECIDA')) return 'CLAVE / TOKEN';
    return 'OPERACIÓN';
  }

  formatTime(isoDate: string): string {
    if (!isoDate) return 'N/A';
    const d = new Date(isoDate);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
