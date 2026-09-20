import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

export interface PerfilUsuarioData {
  username: string;
  nombreCompleto: string;
  roles: string[];
  usuarioId: number | null;
  isSuperuser: boolean;
}

@Component({
  selector: 'app-perfil-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <div class="perfil-dialog-container">
      <!-- Header Banner -->
      <div class="perfil-header-banner">
        <div class="avatar-circle">
          <mat-icon class="avatar-icon">person</mat-icon>
        </div>
        <button mat-icon-button class="btn-close" (click)="cerrar()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Contenido Principal -->
      <div class="perfil-body">
        <h2 class="user-name">{{ data.nombreCompleto || data.username || 'Usuario' }}</h2>
        <p class="user-handle">{{ '@' + (data.username || 'usuario') }}</p>

        <!-- Rol y Estado Badges -->
        <div class="badges-row">
          <span class="role-badge" [class.super-admin]="data.isSuperuser">
            <mat-icon class="badge-icon">{{ data.isSuperuser ? 'verified' : 'shield' }}</mat-icon>
            {{ data.isSuperuser ? 'Super Administrador' : (data.roles[0] || 'Usuario') }}
          </span>
          <span class="status-badge">
            <span class="status-dot"></span> Activo
          </span>
        </div>

        <mat-divider class="my-3"></mat-divider>

        <!-- Información Detallada -->
        <div class="info-list">
          <div class="info-item">
            <div class="info-label">
              <mat-icon class="info-icon">badge</mat-icon>
              <span>ID de Usuario</span>
            </div>
            <div class="info-value">#{{ data.usuarioId || '1' }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <mat-icon class="info-icon">account_circle</mat-icon>
              <span>Nombre de Usuario</span>
            </div>
            <div class="info-value">{{ data.username }}</div>
          </div>

          <div class="info-item">
            <div class="info-label">
              <mat-icon class="info-icon">security</mat-icon>
              <span>Rol Asignado</span>
            </div>
            <div class="info-value">{{ data.roles.join(', ') || 'Cliente' }}</div>
          </div>
        </div>

        <!-- Acciones Rápidas -->
        <div class="quick-links mt-4">
          <button mat-stroked-button color="primary" class="w-100 mb-2" (click)="irA('/favoritos')">
            <mat-icon>favorite</mat-icon>
            Ver Mis Favoritos
          </button>
          <button mat-stroked-button class="w-100" (click)="irA('/configuracion')">
            <mat-icon>settings</mat-icon>
            Configuración de Empresa
          </button>
        </div>
      </div>

      <!-- Footer Actions -->
      <mat-dialog-actions align="end" class="p-3 bg-light">
        <button mat-button (click)="cerrar()">Cerrar</button>
        <button mat-flat-button color="warn" (click)="cerrarSesion()">
          <mat-icon>logout</mat-icon>
          Cerrar Sesión
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .perfil-dialog-container {
      margin: -24px;
      overflow: hidden;
      border-radius: 12px;
      font-family: inherit;
    }

    .perfil-header-banner {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      height: 90px;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .avatar-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: absolute;
      bottom: -36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #ffffff;
    }

    .avatar-icon {
      font-size: 42px;
      width: 42px;
      height: 42px;
      color: #4f46e5;
    }

    .btn-close {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #ffffff;
    }

    .perfil-body {
      padding: 48px 24px 16px;
      text-align: center;
    }

    .user-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 2px;
    }

    .user-handle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 12px;
    }

    .badges-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #bfdbfe;
    }

    .role-badge.super-admin {
      background: #fdf2f8;
      color: #db2777;
      border-color: #fbcfe8;
    }

    .badge-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0fdf4;
      color: #16a34a;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #bbf7d0;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
    }

    .info-list {
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }

    .info-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .info-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }

    .info-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }

    .info-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1e293b;
    }

    .quick-links {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  `]
})
export class PerfilUsuarioDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PerfilUsuarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PerfilUsuarioData,
    private router: Router,
    private authService: AuthService
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  irA(ruta: string): void {
    this.dialogRef.close();
    this.router.navigate([ruta]);
  }

  cerrarSesion(): void {
    this.dialogRef.close();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
