import { Component, signal } from '@angular/core';
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
  loginId = signal('atelier@maison.com');
  password = signal('cliente123');
  rememberMe = signal(true);
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  activeTab = signal<'miembro' | 'rapido'>('miembro');

  constructor(private authService: AuthService, private router: Router) {}

  selectDemo(role: 'admin' | 'trabajador' | 'cliente') {
    if (role === 'admin') {
      this.loginId.set('1001');
      this.password.set('admin123');
    } else if (role === 'trabajador') {
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
      this.errorMessage.set('Por favor ingresa tu identificador y contraseña.');
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
        this.errorMessage.set(err.error?.detail || 'Error al iniciar sesión. Verifique sus credenciales.');
      }
    });
  }

  enterAsGuest() {
    this.selectDemo('cliente');
    this.onSubmit();
  }
}
