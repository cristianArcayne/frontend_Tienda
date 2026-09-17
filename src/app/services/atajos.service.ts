import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { AtajoConfig } from '../models/atajos.model';

export const DEFAULT_ATAJOS: AtajoConfig[] = [
  { id: 'dashboard', displayName: 'Dashboard', route: '/', iconName: 'solar:atom-line-duotone', key: 'alt.1' },
  { id: 'inventario_productos', displayName: 'Productos', route: '/inventario/productos', iconName: 'solar:shop-2-line-duotone', key: 'alt.2' },
  { id: 'compra_compras', displayName: 'Compras', route: '/compra/compras', iconName: 'solar:clipboard-list-line-duotone', key: 'alt.3' },
  { id: 'ventas', displayName: 'Ventas', route: '/ventas', iconName: 'solar:cart-check-line-duotone', key: 'alt.4' },
  { id: 'reportes', displayName: 'Reportes', route: '/reportes', iconName: 'solar:chart-square-line-duotone', key: 'alt.5' },
];

@Injectable({
  providedIn: 'root'
})
export class AtajosService {
  private readonly STORAGE_PREFIX = 'atajos_';

  constructor(private configService: ConfigService) {}

  private getStorageKey(): string {
    const tenant = this.configService.getCurrentTenant() || 'localhost';
    return `${this.STORAGE_PREFIX}${tenant}`;
  }

  getAtajos(): AtajoConfig[] {
    const stored = localStorage.getItem(this.getStorageKey());
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.getDefaults();
      }
    }
    return this.getDefaults();
  }

  saveAtajos(atajos: AtajoConfig[]): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(atajos));
  }

  private getDefaults(): AtajoConfig[] {
    return DEFAULT_ATAJOS.map(a => ({ ...a }));
  }

  resetDefaults(): void {
    localStorage.removeItem(this.getStorageKey());
  }

  getRouteForKey(key: string): string | null {
    const atajos = this.getAtajos();
    const atajo = atajos.find(a => a.key === key);
    return atajo ? atajo.route : null;
  }

  getKeyForRoute(route: string): string | null {
    const atajos = this.getAtajos();
    const atajo = atajos.find(a => a.route === route);
    return atajo ? atajo.key : null;
  }
}
