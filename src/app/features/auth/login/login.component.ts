import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  loginId = signal('admin');
  password = signal('admin123');
  rememberMe = signal(true);
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  statusMessage = signal('Sesión cerrada correctamente');

  selectDemo(role: 'admin' | 'empleado' | 'cliente') {
    if (role === 'admin') {
      this.loginId.set('1001');
      this.password.set('admin123');
    } else if (role === 'empleado') {
      this.loginId.set('2001');
      this.password.set('trabajador123');
    } else {
      this.loginId.set('atelier@maison.com');
      this.password.set('cliente123');
    }
    this.errorMessage.set('');
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (!this.loginId() || !this.password()) {
      this.errorMessage.set('Por favor ingresa tu usuario/correo y contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({
      login_id: this.loginId(),
      password: this.password(),
      remember_me: this.rememberMe()
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const role = res.user.rol.toLowerCase().trim();
        if (role === 'administrador' || role === 'trabajador' || role === 'empleado') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/vestidor']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Credenciales incorrectas.');
      }
    });
  }

  enterAsGuest() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.authService.guestLogin().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/vestidor']);
      },
      error: () => {
        this.isLoading.set(false);
        // Fallback local guest
        this.router.navigate(['/vestidor']);
      }
    });
  }
}
