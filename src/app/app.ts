import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  public authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  currentSectionTitle = 'Panel de Gestión';
  currentFormattedDate = '';

  constructor() {
    this.updateCurrentDate();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateSectionTitle(event.urlAfterRedirects || event.url);
    });
  }

  updateCurrentDate() {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.currentFormattedDate = new Date().toLocaleDateString('es-ES', options);
  }

  updateSectionTitle(url: string) {
    if (url.includes('usuarios')) {
      this.currentSectionTitle = 'Control de Usuarios';
    } else if (url.includes('configuracion')) {
      this.currentSectionTitle = 'Configuración del Sistema';
    } else if (url.includes('bitacora')) {
      this.currentSectionTitle = 'Bitácora de Uso y Auditoría';
    } else if (url.includes('vestidor')) {
      this.currentSectionTitle = 'Catálogo & Tienda POS';
    } else if (url.includes('dashboard')) {
      this.currentSectionTitle = 'Panel Principal TPV';
    } else {
      this.currentSectionTitle = 'Sistema de Gestión';
    }
  }

  logout() {
    this.authService.logout();
  }

  isAdmin(): boolean {
    return this.authService.hasAnyRole(['administrador']);
  }

  isStaff(): boolean {
    return this.authService.hasAnyRole(['administrador', 'trabajador', 'empleado']);
  }

  isGuest(): boolean {
    return this.currentUser()?.rol === 'invitado';
  }
}
