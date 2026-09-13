import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { EmpresaConfig } from '../../core/models/auth.models';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-layout">
      <!-- SUB-MENÚ LATERAL IZQUIERDO -->
      <div class="sub-nav-card">
        <button 
          class="sub-nav-item" 
          [class.active]="activeSubTab === 'empresa'"
          (click)="activeSubTab = 'empresa'"
        >
          <span class="material-symbols-outlined">storefront</span>
          Datos de Empresa
        </button>
        <button 
          class="sub-nav-item" 
          [class.active]="activeSubTab === 'general'"
          (click)="activeSubTab = 'general'"
        >
          <span class="material-symbols-outlined">settings</span>
          General
        </button>
        <button 
          class="sub-nav-item" 
          [class.active]="activeSubTab === 'facturacion'"
          (click)="activeSubTab = 'facturacion'"
        >
          <span class="material-symbols-outlined">receipt_long</span>
          Facturación
        </button>
        <button 
          class="sub-nav-item" 
          [class.active]="activeSubTab === 'ticket'"
          (click)="activeSubTab = 'ticket'"
        >
          <span class="material-symbols-outlined">confirmation_number</span>
          Ticket
        </button>
      </div>

      <!-- FORMULARIO PRINCIPAL DE CONFIGURACIÓN -->
      <div class="form-content-card">
        <div class="card-header-row">
          <div class="header-badge-title">
            <span class="material-symbols-outlined header-icon">storefront</span>
            <h2 class="card-main-title">Datos de la Empresa</h2>
          </div>
        </div>

        <div *ngIf="successMessage()" class="alert-success">
          <span class="material-symbols-outlined">check_circle</span>
          <span>{{ successMessage() }}</span>
        </div>

        <form (ngSubmit)="saveConfig()" class="config-form">
          <!-- Logo de la empresa -->
          <div class="logo-field-section">
            <label class="field-label-bold">Logo de la Empresa</label>
            <div class="logo-picker-row">
              <div class="logo-preview-box">
                <span class="material-symbols-outlined store-preview-icon">storefront</span>
              </div>
              <div class="file-picker-group">
                <label class="btn-file-select">
                  Seleccionar archivo
                  <input type="file" style="display: none;" (change)="onFileChange($event)" />
                </label>
                <span class="file-name-text">{{ fileName }}</span>
              </div>
            </div>
          </div>

          <!-- Razón Social -->
          <div class="form-group">
            <label class="form-label">Razón Social *</label>
            <input type="text" [(ngModel)]="config.razon_social" name="razon_social" class="form-control-standard" required />
          </div>

          <!-- Nombre Comercial y RUC/NIT -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Nombre Comercial</label>
              <input type="text" [(ngModel)]="config.nombre_comercial" name="nombre_comercial" class="form-control-standard" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">RUC / NIT</label>
              <input type="text" [(ngModel)]="config.ruc_nit" name="ruc_nit" class="form-control-standard" />
            </div>
          </div>

          <!-- Dirección -->
          <div class="form-group">
            <label class="form-label">Dirección</label>
            <input type="text" [(ngModel)]="config.direccion" name="direccion" class="form-control-standard" />
          </div>

          <!-- Ciudad y Teléfono -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Ciudad</label>
              <input type="text" [(ngModel)]="config.ciudad" name="ciudad" class="form-control-standard" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Teléfono</label>
              <input type="text" [(ngModel)]="config.telefono" name="telefono" class="form-control-standard" />
            </div>
          </div>

          <!-- Email y Sitio Web -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Email</label>
              <input type="email" [(ngModel)]="config.email" name="email" class="form-control-standard" />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Sitio Web</label>
              <input type="text" [(ngModel)]="config.sitio_web" name="sitio_web" class="form-control-standard" />
            </div>
          </div>

          <div class="section-divider-title">
            <span>Moneda e Impuestos</span>
          </div>

          <!-- Moneda e Impuestos -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Símbolo Moneda *</label>
              <input type="text" [(ngModel)]="config.simbolo_moneda" name="simbolo_moneda" class="form-control-standard" required />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Código Moneda *</label>
              <input type="text" [(ngModel)]="config.codigo_moneda" name="codigo_moneda" class="form-control-standard" required />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">IVA (%) *</label>
              <input type="number" [(ngModel)]="config.iva_porcentaje" name="iva_porcentaje" class="form-control-standard" required />
            </div>
          </div>

          <!-- Checkbox Precios con impuesto -->
          <div class="checkbox-row">
            <label class="checkbox-label-styled">
              <input type="checkbox" [(ngModel)]="config.precios_con_impuesto" name="precios_con_impuesto" />
              <span>Precios con impuesto incluido</span>
            </label>
          </div>

          <!-- Botón Guardar -->
          <div class="form-actions-right">
            <button type="submit" class="btn-primary-green" [disabled]="isSaving()">
              <span class="material-symbols-outlined">save</span>
              <span *ngIf="!isSaving()">Guardar Configuración</span>
              <span *ngIf="isSaving()">Guardando...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .config-layout {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
      padding: 1.5rem 0;
      flex-wrap: wrap;
    }
    .sub-nav-card {
      width: 220px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .sub-nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.9rem 1.25rem;
      border: none;
      background: none;
      color: #4b5563;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .sub-nav-item:hover {
      background-color: #f9fafb;
      color: #111827;
    }
    .sub-nav-item.active {
      background-color: #10b981;
      color: #ffffff;
    }
    .form-content-card {
      flex: 1;
      min-width: 320px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 2rem;
    }
    .card-header-row {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 1rem;
    }
    .header-badge-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .header-icon {
      color: #10b981;
      font-size: 1.5rem;
    }
    .card-main-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }
    .logo-field-section {
      margin-bottom: 1.5rem;
    }
    .field-label-bold {
      font-size: 0.8rem;
      font-weight: 700;
      color: #374151;
      margin-bottom: 0.5rem;
      display: block;
    }
    .logo-picker-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .logo-preview-box {
      width: 48px;
      height: 48px;
      background-color: #10b981;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .store-preview-icon {
      color: #ffffff;
      font-size: 26px;
    }
    .btn-file-select {
      background-color: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #374151;
      border-radius: 0.375rem;
      cursor: pointer;
    }
    .btn-file-select:hover {
      background-color: #e5e7eb;
    }
    .file-name-text {
      margin-left: 0.75rem;
      font-size: 0.8rem;
      color: #9ca3af;
    }
    .form-group {
      margin-bottom: 1.2rem;
    }
    .form-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
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
    .section-divider-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #111827;
      margin: 1.75rem 0 1rem 0;
      padding-top: 1rem;
      border-top: 1px solid #f3f4f6;
    }
    .checkbox-row {
      margin: 1.25rem 0;
    }
    .checkbox-label-styled {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #374151;
      cursor: pointer;
    }
    .checkbox-label-styled input {
      accent-color: #10b981;
      width: 16px;
      height: 16px;
    }
    .form-actions-right {
      display: flex;
      justify-content: flex-end;
      margin-top: 1.5rem;
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
  `]
})
export class ConfiguracionComponent implements OnInit {
  private usuariosService = inject(UsuariosService);

  activeSubTab = 'empresa';
  fileName = 'Ningún archivo seleccionado';
  isSaving = signal(false);
  successMessage = signal('');

  config: EmpresaConfig = {
    razon_social: 'TPV Minimarket Demo S.A.C.',
    nombre_comercial: 'Mi Minimarket',
    ruc_nit: '20100100100',
    direccion: 'Av. Principal 123',
    ciudad: 'Lima',
    telefono: '01-555-1234',
    email: 'contacto@minimarket.com',
    sitio_web: 'www.minimarket.com',
    simbolo_moneda: '$',
    codigo_moneda: 'Dólar (USD)',
    iva_porcentaje: 18.0,
    precios_con_impuesto: true
  };

  ngOnInit() {
    this.usuariosService.getEmpresaConfig().subscribe({
      next: (data) => {
        this.config = data;
      },
      error: () => {}
    });
  }

  onFileChange(e: any) {
    if (e.target.files && e.target.files.length > 0) {
      this.fileName = e.target.files[0].name;
    }
  }

  saveConfig() {
    this.isSaving.set(true);
    this.usuariosService.updateEmpresaConfig(this.config).subscribe({
      next: (updated) => {
        this.config = updated;
        this.isSaving.set(false);
        this.successMessage.set('Configuración de la empresa guardada y auditada con éxito.');
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }
}
