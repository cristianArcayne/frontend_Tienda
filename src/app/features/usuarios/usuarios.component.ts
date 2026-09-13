import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioDetail } from '../../core/models/auth.models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="users-container">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Control de Usuarios</h1>
          <p class="page-subtitle">
            Administración centralizada de cuentas segregadas para Administradores, Empleados y Clientes.
          </p>
        </div>
        <button class="btn-primary-green" (click)="openCreateModal()">
          <span class="material-symbols-outlined">person_add</span>
          Nuevo Usuario
        </button>
      </div>

      <!-- ALERTA MENSAJE -->
      <div *ngIf="successMessage()" class="alert-success">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ successMessage() }}</span>
      </div>
      <div *ngIf="errorMessage()" class="alert-error">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMessage() }}</span>
      </div>

      <!-- PESTAÑAS POR ROL -->
      <div class="tabs-container">
        <button 
          class="tab-item" 
          [class.active]="selectedTab() === 'todos'"
          (click)="setTab('todos')"
        >
          <span class="material-symbols-outlined tab-icon">groups</span>
          Todos ({{ users().length }})
        </button>
        <button 
          class="tab-item" 
          [class.active]="selectedTab() === 'administrador'"
          (click)="setTab('administrador')"
        >
          <span class="material-symbols-outlined tab-icon">shield_person</span>
          Administradores ({{ countByRole('administrador') }})
        </button>
        <button 
          class="tab-item" 
          [class.active]="selectedTab() === 'empleado'"
          (click)="setTab('empleado')"
        >
          <span class="material-symbols-outlined tab-icon">badge</span>
          Empleados ({{ countByRole('empleado') + countByRole('trabajador') }})
        </button>
        <button 
          class="tab-item" 
          [class.active]="selectedTab() === 'cliente'"
          (click)="setTab('cliente')"
        >
          <span class="material-symbols-outlined tab-icon">person</span>
          Clientes ({{ countByRole('cliente') }})
        </button>
      </div>

      <!-- BARRA DE FILTRO Y BÚSQUEDA -->
      <div class="filter-card">
        <div class="search-wrapper">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (input)="applyFilter()" 
            class="search-input" 
            placeholder="Buscar por CI, nombre o correo..."
          />
        </div>
        <button class="btn-secondary" (click)="loadUsers()">
          <span class="material-symbols-outlined" [class.spin]="isLoading()">refresh</span>
          Actualizar
        </button>
      </div>

      <!-- TABLA DE USUARIOS -->
      <div class="table-card">
        <div *ngIf="isLoading()" class="state-box">
          <span class="material-symbols-outlined spin state-icon">progress_activity</span>
          <p>Cargando lista de usuarios...</p>
        </div>

        <div *ngIf="!isLoading() && filteredUsers().length === 0" class="state-box">
          <span class="material-symbols-outlined state-icon">person_off</span>
          <p>No se encontraron usuarios en esta categoría.</p>
        </div>

        <table *ngIf="!isLoading() && filteredUsers().length > 0" class="custom-table">
          <thead>
            <tr>
              <th>CI / IDENTIFICADOR</th>
              <th>NOMBRE COMPLETO</th>
              <th>ROL ASIGNADO</th>
              <th>CONTACTO / CORREO</th>
              <th>DETALLES ESPECÍFICOS</th>
              <th style="text-align: right;">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of filteredUsers()">
              <td class="cell-ci">
                <span class="ci-code">{{ u.ci }}</span>
              </td>
              <td class="cell-name">
                <div class="user-info-flex">
                  <div class="user-avatar-small" [ngClass]="getAvatarClass(u.rol)">
                    {{ u.nombre.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <span class="name-bold">{{ u.nombre }} {{ u.apellido || '' }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span [ngClass]="getRoleBadgeClass(u.rol)">
                  {{ u.rol | uppercase }}
                </span>
              </td>
              <td class="cell-contact">
                <div *ngIf="u.correo_electronico">
                  <span class="email-text">{{ u.correo_electronico }}</span>
                </div>
                <div *ngIf="u.telefono" class="phone-text">
                  Tel: {{ u.telefono }}
                </div>
                <div *ngIf="!u.correo_electronico && !u.telefono" class="text-muted">
                  Sin contacto registrado
                </div>
              </td>
              <td class="cell-details">
                <span *ngIf="u.rol === 'cliente'" class="detail-tag">
                  Edad: {{ u.edad || 'N/A' }} • {{ u.genero || 'No especificado' }}
                </span>
                <span *ngIf="u.rol === 'empleado' || u.rol === 'trabajador'" class="detail-tag">
                  Sucursal: {{ u.sucursal_nombre || 'Principal (París)' }}
                </span>
                <span *ngIf="u.rol === 'administrador'" class="detail-tag tag-admin">
                  Acceso Total al Sistema
                </span>
              </td>
              <td class="cell-actions">
                <button 
                  class="btn-icon-danger" 
                  [disabled]="u.ci === currentUser()?.ci"
                  (click)="deleteUser(u)"
                  title="Eliminar usuario"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MODAL DE CREACIÓN DE USUARIO -->
      <div *ngIf="showModal()" class="modal-overlay" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-icon-box">
              <span class="material-symbols-outlined">person_add</span>
            </div>
            <div>
              <h2 class="modal-title">Nuevo Usuario</h2>
              <p class="modal-subtitle">Asigna credenciales y rol para el nuevo integrante.</p>
            </div>
            <button class="btn-close" (click)="closeModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form (ngSubmit)="saveUser()" class="modal-body">
            <!-- Selección de Rol -->
            <div class="form-group">
              <label class="form-label">TIPO DE USUARIO (ROL) *</label>
              <div class="role-cards-selector">
                <label class="role-option" [class.selected]="newUserData.rol === 'administrador'">
                  <input type="radio" name="rol" value="administrador" [(ngModel)]="newUserData.rol" />
                  <span class="material-symbols-outlined icon-role">shield_person</span>
                  <span class="option-title">Administrador</span>
                  <span class="option-sub">Acceso total</span>
                </label>
                <label class="role-option" [class.selected]="newUserData.rol === 'empleado'">
                  <input type="radio" name="rol" value="empleado" [(ngModel)]="newUserData.rol" />
                  <span class="material-symbols-outlined icon-role">badge</span>
                  <span class="option-title">Empleado</span>
                  <span class="option-sub">Ventas & Bitácora</span>
                </label>
                <label class="role-option" [class.selected]="newUserData.rol === 'cliente'">
                  <input type="radio" name="rol" value="cliente" [(ngModel)]="newUserData.rol" />
                  <span class="material-symbols-outlined icon-role">person</span>
                  <span class="option-title">Cliente</span>
                  <span class="option-sub">Compras & Vestidor</span>
                </label>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">CÉDULA / CI *</label>
                <input type="text" [(ngModel)]="newUserData.ci" name="ci" class="form-control-standard" placeholder="Ej. 4589123" required />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">NOMBRE *</label>
                <input type="text" [(ngModel)]="newUserData.nombre" name="nombre" class="form-control-standard" placeholder="Nombre" required />
              </div>
            </div>

            <!-- Si es cliente se pide apellido -->
            <div *ngIf="newUserData.rol === 'cliente'" class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">APELLIDO *</label>
                <input type="text" [(ngModel)]="newUserData.apellido" name="apellido" class="form-control-standard" placeholder="Apellido" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">CORREO ELECTRÓNICO *</label>
                <input type="email" [(ngModel)]="newUserData.correo_electronico" name="correo" class="form-control-standard" placeholder="cliente@correo.com" />
              </div>
            </div>

            <div *ngIf="newUserData.rol === 'cliente'" class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">TELÉFONO</label>
                <input type="text" [(ngModel)]="newUserData.telefono" name="tel" class="form-control-standard" placeholder="78945612" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">EDAD</label>
                <input type="number" [(ngModel)]="newUserData.edad" name="edad" class="form-control-standard" placeholder="25" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">CONTRASEÑA DE ACCESO *</label>
              <input type="password" [(ngModel)]="newUserData.contrasena" name="contrasena" class="form-control-standard" placeholder="••••••••" required />
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn-primary-green" [disabled]="isSaving()">
                <span *ngIf="!isSaving()">Guardar Usuario</span>
                <span *ngIf="isSaving()">Guardando...</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-container {
      padding: 1.5rem 0;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #111827;
      margin-bottom: 0.25rem;
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
    }

    /* PESTAÑAS */
    .tabs-container {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 1.25rem;
      overflow-x: auto;
    }
    .tab-item {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.75rem 1.15rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #6b7280;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-item:hover {
      color: #111827;
    }
    .tab-item.active {
      color: #10b981;
      border-bottom-color: #10b981;
    }
    .tab-icon {
      font-size: 1.15rem;
    }

    /* FILTROS */
    .filter-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #ffffff;
      padding: 0.85rem 1.25rem;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      margin-bottom: 1.25rem;
      gap: 1rem;
    }
    .search-wrapper {
      position: relative;
      flex: 1;
      max-width: 450px;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: #9ca3af;
    }
    .search-input {
      width: 100%;
      padding: 0.55rem 0.75rem 0.55rem 2.4rem;
      font-size: 0.85rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      outline: none;
    }
    .search-input:focus {
      border-color: #10b981;
    }

    /* TABLA */
    .table-card {
      background-color: #ffffff;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      overflow-x: auto;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .custom-table th {
      background-color: #f9fafb;
      padding: 0.85rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
    }
    .custom-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f3f4f6;
      font-size: 0.875rem;
      vertical-align: middle;
    }
    .cell-ci {
      font-family: monospace;
      font-weight: 700;
      color: #374151;
    }
    .user-info-flex {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-avatar-small {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .avatar-admin {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    .avatar-empleado {
      background-color: #dbeafe;
      color: #1d4ed8;
    }
    .avatar-cliente {
      background-color: #dcfce7;
      color: #047857;
    }
    .name-bold {
      font-weight: 600;
      color: #111827;
    }
    .email-text {
      color: #374151;
      font-size: 0.825rem;
    }
    .phone-text {
      font-size: 0.75rem;
      color: #6b7280;
    }
    .text-muted {
      color: #9ca3af;
      font-size: 0.8rem;
    }
    .detail-tag {
      font-size: 0.75rem;
      background-color: #f3f4f6;
      color: #4b5563;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
    }
    .tag-admin {
      background-color: #fef2f2;
      color: #991b1b;
    }
    .cell-actions {
      text-align: right;
    }
    .btn-icon-danger {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 0.25rem;
      transition: background 0.15s;
    }
    .btn-icon-danger:hover:not(:disabled) {
      background-color: #fee2e2;
    }
    .btn-icon-danger:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* MODAL */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      width: 100%;
      max-width: 550px;
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .header-icon-box {
      width: 40px;
      height: 40px;
      background-color: #ecfdf5;
      color: #10b981;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #111827;
    }
    .modal-subtitle {
      font-size: 0.8rem;
      color: #6b7280;
    }
    .btn-close {
      margin-left: auto;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .form-group {
      margin-bottom: 1.1rem;
    }
    .form-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #374151;
      margin-bottom: 0.35rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 {
      flex: 1;
    }
    .role-cards-selector {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .role-option {
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 0.75rem 0.5rem;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.15s;
    }
    .role-option input {
      display: none;
    }
    .role-option.selected {
      border-color: #10b981;
      background-color: #ecfdf5;
      color: #065f46;
    }
    .icon-role {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .option-title {
      font-size: 0.8rem;
      font-weight: 700;
    }
    .option-sub {
      font-size: 0.65rem;
      color: #6b7280;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f3f4f6;
    }
    .alert-success {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .alert-error {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .state-box {
      padding: 3rem;
      text-align: center;
      color: #6b7280;
    }
    .state-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class UsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private authService = inject(AuthService);

  users = signal<UsuarioDetail[]>([]);
  filteredUsers = signal<UsuarioDetail[]>([]);
  selectedTab = signal<string>('todos');
  searchTerm = '';
  isLoading = signal(false);
  isSaving = signal(false);
  showModal = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  currentUser = this.authService.currentUser;

  newUserData = {
    ci: '',
    nombre: '',
    apellido: '',
    rol: 'empleado',
    contrasena: '',
    correo_electronico: '',
    telefono: '',
    edad: 25,
    genero: 'No especificado',
    id_sucursal: 1
  };

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        this.users.set(data);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al cargar los usuarios.');
      }
    });
  }

  setTab(tab: string) {
    this.selectedTab.set(tab);
    this.applyFilter();
  }

  applyFilter() {
    let list = this.users();
    const tab = this.selectedTab();

    if (tab !== 'todos') {
      if (tab === 'empleado') {
        list = list.filter(u => u.rol.toLowerCase() === 'empleado' || u.rol.toLowerCase() === 'trabajador');
      } else {
        list = list.filter(u => u.rol.toLowerCase() === tab);
      }
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(u => 
        u.ci.toLowerCase().includes(s) || 
        u.nombre.toLowerCase().includes(s) ||
        (u.correo_electronico && u.correo_electronico.toLowerCase().includes(s))
      );
    }

    this.filteredUsers.set(list);
  }

  countByRole(role: string): number {
    return this.users().filter(u => u.rol.toLowerCase() === role).length;
  }

  openCreateModal() {
    this.newUserData = {
      ci: '',
      nombre: '',
      apellido: '',
      rol: 'empleado',
      contrasena: 'clave123',
      correo_electronico: '',
      telefono: '',
      edad: 25,
      genero: 'No especificado',
      id_sucursal: 1
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveUser() {
    if (!this.newUserData.ci || !this.newUserData.nombre || !this.newUserData.contrasena) {
      this.errorMessage.set('Completa los campos obligatorios (*)');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.usuariosService.createUsuario(this.newUserData).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.closeModal();
        this.successMessage.set(`Usuario ${res.nombre} (CI: ${res.ci}) creado con éxito en PostgreSQL.`);
        this.loadUsers();
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al crear el usuario.');
      }
    });
  }

  deleteUser(u: UsuarioDetail) {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${u.nombre} (CI: ${u.ci})?`)) return;

    this.usuariosService.deleteUsuario(u.ci).subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.loadUsers();
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'No se pudo eliminar el usuario.');
      }
    });
  }

  getRoleBadgeClass(rol: string): string {
    const r = rol.toLowerCase();
    if (r === 'administrador') return 'badge-role-admin';
    if (r === 'empleado' || r === 'trabajador') return 'badge-role-empleado';
    return 'badge-role-cliente';
  }

  getAvatarClass(rol: string): string {
    const r = rol.toLowerCase();
    if (r === 'administrador') return 'avatar-admin';
    if (r === 'empleado' || r === 'trabajador') return 'avatar-empleado';
    return 'avatar-cliente';
  }
}
