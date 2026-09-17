import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { TablerIconsModule } from 'angular-tabler-icons';
import { AtajosService } from '../../services/atajos.service';
import { PermisosService } from '../../services/permisos.service';
import { AtajoConfig } from '../../models/atajos.model';
import { navItems } from '../../layouts/full/sidebar/sidebar-data';
import { NavItem } from '../../layouts/full/sidebar/nav-item/nav-item';

const KEY_OPTIONS = [
  { value: null, label: '— Sin asignar' },
  { value: 'alt.1', label: 'Alt+1' },
  { value: 'alt.2', label: 'Alt+2' },
  { value: 'alt.3', label: 'Alt+3' },
  { value: 'alt.4', label: 'Alt+4' },
  { value: 'alt.5', label: 'Alt+5' },
  { value: 'alt.6', label: 'Alt+6' },
  { value: 'alt.7', label: 'Alt+7' },
  { value: 'alt.8', label: 'Alt+8' },
  { value: 'alt.9', label: 'Alt+9' },
  { value: 'alt.0', label: 'Alt+0' },
];

@Component({
  selector: 'app-configurar-atajos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTableModule,
    TablerIconsModule,
  ],
  templateUrl: './configurar-atajos.component.html',
  styleUrl: './configurar-atajos.component.scss',
})
export class ConfigurarAtajosComponent implements OnInit {
  paginas: { id: string; displayName: string; route: string; iconName?: string; key: string | null }[] = [];
  atajosOriginales: AtajoConfig[] = [];
  keyOptions = KEY_OPTIONS;

  displayedColumns = ['icono', 'pagina', 'atajo'];

  constructor(
    private dialogRef: MatDialogRef<ConfigurarAtajosComponent>,
    private atajosService: AtajosService,
    private permisosService: PermisosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.atajosOriginales = this.atajosService.getAtajos();
    this.paginas = this.obtenerPaginasNavegables();
    this.cargarAsignaciones();
  }

  private obtenerPaginasNavegables(): { id: string; displayName: string; route: string; iconName?: string; key: null }[] {
    const result: { id: string; displayName: string; route: string; iconName?: string; key: null }[] = [];
    const seen = new Set<string>();

    for (const item of navItems) {
      if (this.esPaginaValida(item) && !seen.has(item.route!)) {
        seen.add(item.route!);
        result.push({
          id: this.generarId(item),
          displayName: item.displayName!,
          route: item.route!,
          iconName: item.iconName,
          key: null,
        });
      }
    }

    return result;
  }

  private esPaginaValida(item: NavItem): boolean {
    if (!item.displayName || !item.route) return false;
    if (item.navCap) return false;
    if (item.divider) return false;
    if (item.external) return false;
    if (item.permiso) {
      if (Array.isArray(item.permiso)) {
        return this.permisosService.tieneAlguno(item.permiso);
      }
      return this.permisosService.tiene(item.permiso);
    }
    return true;
  }

  private generarId(item: NavItem): string {
    return (item.route || '').replace(/\//g, '_').replace(/^_/, '') || 'dashboard';
  }

  private cargarAsignaciones(): void {
    for (const pagina of this.paginas) {
      const atajo = this.atajosOriginales.find(
        a => a.route === pagina.route || a.id === this.generarId({ displayName: pagina.displayName, route: pagina.route } as NavItem)
      );
      pagina.key = atajo ? atajo.key : null;
    }
  }

  getKeysUsadas(): string[] {
    return this.paginas
      .map(p => p.key)
      .filter((k): k is string => k !== null);
  }

  isKeyOcupada(key: string, paginaActual: typeof this.paginas[0]): boolean {
    if (paginaActual.key === key) return false;
    return this.getKeysUsadas().includes(key);
  }

  onKeyChange(pagina: typeof this.paginas[0], nuevoKey: string | null): void {
    const anterior = pagina.key;
    if (anterior === nuevoKey) return;

    if (nuevoKey && this.isKeyOcupada(nuevoKey, pagina)) {
      const ocupante = this.paginas.find(p => p.key === nuevoKey);
      if (ocupante) {
        ocupante.key = anterior;
      }
    }

    pagina.key = nuevoKey;
  }

  guardar(): void {
    const atajos: AtajoConfig[] = this.paginas
      .filter(p => p.key !== null)
      .map(p => ({
        id: p.id,
        displayName: p.displayName,
        route: p.route,
        iconName: p.iconName,
        key: p.key!,
      }));

    this.atajosService.saveAtajos(atajos);
    this.snackBar.open('Atajos guardados correctamente', 'Cerrar', { duration: 3000 });
    this.dialogRef.close(true);
  }

  restablecer(): void {
    this.atajosService.resetDefaults();
    this.atajosOriginales = this.atajosService.getAtajos();
    this.cargarAsignaciones();
    this.snackBar.open('Atajos restablecidos a valores por defecto', 'Cerrar', { duration: 3000 });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
