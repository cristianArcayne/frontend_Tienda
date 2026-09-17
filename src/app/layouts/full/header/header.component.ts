import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { CartService } from 'src/app/services/cart.service';
import { FavoritosService } from 'src/app/services/favoritos.service';
import { ApiService } from 'src/app/services/api.service';
import { ConfigService } from 'src/app/services/config.service';
import { AlertasRefreshService } from 'src/app/services/alertas-refresh.service';
import { Pagination } from 'src/app/models/pagination.model';
import { AlertaIa } from 'src/app/models/ia/alerta-ia.model';
import { ConfigurarAtajosComponent } from 'src/app/components/configurar-atajos/configurar-atajos.component';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule
],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  currentUsername: string = '';
  conteoAlertasNoLeidas = signal(0);
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    public cartService: CartService,
    public favoritosService: FavoritosService,
    private apiService: ApiService,
    private configService: ConfigService,
    private alertasRefreshService: AlertasRefreshService,
    private router: Router,
    private dialog: MatDialog,
  ) {}


  ngOnInit(): void {
    this.obtenerUsuarioActual();
    if (!this.esCliente()) {
      this.cargarConteoAlertas();
      this.alertasRefreshService.alertasRefresh$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cargarConteoAlertas());
    }
  }

  private cargarConteoAlertas(): void {
    const url = this.configService.getApiUrl('ia/alertas');
    this.apiService.getWithPagination<AlertaIa>(url, 1, 1, { leida: 'false' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pagination<AlertaIa>) => this.conteoAlertasNoLeidas.set(data.count),
        error: () => this.conteoAlertasNoLeidas.set(0)
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtener el usuario actual del servicio de autenticación
   */
  private obtenerUsuarioActual(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuario) => {
          this.currentUsername = usuario.username;
        },
        error: (error) => {
          console.error('Error al obtener usuario actual:', error);
          this.currentUsername = 'Usuario';
        }
      });
  }

  /**
   * Cerrar sesión y redirigir al login
   */
  esCliente(): boolean {
    const roles = this.authService.getRoles();
    return !this.authService.isSuperuser() && roles.length === 1 && roles[0]?.toLowerCase() === 'cliente';
  }

  abrirConfigAtajos(): void {
    this.dialog.open(ConfigurarAtajosComponent, {
      width: '650px',
      disableClose: false,
    });
  }

  cerrarSesion(): void {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // El router.navigate ya ocurre en logout() del AuthService
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Error al cerrar sesión:', error);
          this.router.navigate(['/login']);
        }
      });
  }
}