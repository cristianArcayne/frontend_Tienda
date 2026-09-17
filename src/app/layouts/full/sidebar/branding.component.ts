import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreService } from 'src/app/services/core.service';
import { ConfigService } from 'src/app/services/config.service';
import { ConfiguracionEmpresaService } from 'src/app/services/configuracion-empresa.service';

@Component({
  selector: 'app-branding',
  imports: [CommonModule],
  template: `
    <div class="branding-container" [style.justify-content]="logoUrl ? 'flex-start' : 'center'">
      <img *ngIf="logoUrl" [src]="logoUrl" class="tenant-logo" alt="Logo">
      <span class="tenant-name" [style.text-align]="logoUrl ? 'left' : 'center'">{{ tenantName }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .branding-container {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      overflow: hidden;
      width: 100%;
      box-sizing: border-box;
    }

    .tenant-logo {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid white;
      background: white;
      flex-shrink: 0;
    }

    .tenant-name {
      font-weight: 700;
      font-size: 16px;
      color: white;
      letter-spacing: 0.5px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      flex: 1;
    }
  `]
})
export class BrandingComponent implements OnInit {
  options = this.settings.getOptions();
  tenantName: string = '';
  logoUrl: string | null = null;

  constructor(
    private settings: CoreService,
    private configService: ConfigService,
    private configuracionEmpresaService: ConfiguracionEmpresaService
  ) {}

  ngOnInit(): void {
    this.configuracionEmpresaService.config$.subscribe(config => {
      if (config && config.nombre) {
        this.tenantName = config.nombre;
      } else {
        this.tenantName = this.formatTenantName();
      }
      this.logoUrl = config ? config.logoUrl : null;
    });
  }

  /**
   * Formatear el nombre del tenant
   * Ejemplos:
   * - tienda-amiga → Tienda Amiga
   * - empresa-xyz → Empresa Xyz
   * - null (localhost) → [Desarrollo Local]
   */
  private formatTenantName(): string {
    const tenant = this.configService.getCurrentTenant();
    
    if (!tenant) {
      return '[Desarrollo Local]';
    }

    return tenant
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
