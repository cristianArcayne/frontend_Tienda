import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="atelier-wrapper">
      <div class="register-box">
        <div class="portal-badge-container">
          <span class="portal-badge">MEMBRESÍA ATELIER</span>
        </div>

        <h1 class="main-title font-serif">Crear Cuenta</h1>
        <p class="main-subtitle">
          Regístrate para acceder al vestidor virtual, agendar citas de estilismo y adquirir prendas exclusivas.
        </p>

        <div *ngIf="errorMessage()" class="alert-error">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage() }}</span>
        </div>

        <form (ngSubmit)="onSubmit()" class="register-form">
          <div class="form-row">
            <div class="input-field-group">
              <label class="field-label">CÉDULA / CI *</label>
              <input type="text" [(ngModel)]="ci" name="ci" class="clean-input" placeholder="Ej. 4589210" required />
            </div>
            <div class="input-field-group">
              <label class="field-label">EDAD</label>
              <input type="number" [(ngModel)]="edad" name="edad" class="clean-input" placeholder="25" />
            </div>
          </div>

          <div class="form-row">
            <div class="input-field-group">
              <label class="field-label">NOMBRE *</label>
              <input type="text" [(ngModel)]="nombre" name="nombre" class="clean-input" placeholder="Tu nombre" required />
            </div>
            <div class="input-field-group">
              <label class="field-label">APELLIDO *</label>
              <input type="text" [(ngModel)]="apellido" name="apellido" class="clean-input" placeholder="Tu apellido" required />
            </div>
          </div>

          <div class="input-field-group">
            <label class="field-label">CORREO ELECTRÓNICO *</label>
            <input type="email" [(ngModel)]="email" name="email" class="clean-input" placeholder="ejemplo@atelier.com" required />
          </div>

          <div class="form-row">
            <div class="input-field-group">
              <label class="field-label">TELÉFONO</label>
              <input type="text" [(ngModel)]="telefono" name="telefono" class="clean-input" placeholder="+34 600 000 000" />
            </div>
            <div class="input-field-group">
              <label class="field-label">GÉNERO</label>
              <select [(ngModel)]="genero" name="genero" class="clean-input">
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="No binario">No binario</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div class="input-field-group">
            <label class="field-label">CONTRASEÑA *</label>
            <input type="password" [(ngModel)]="contrasena" name="contrasena" class="clean-input" placeholder="••••••••••••" required />
          </div>

          <button type="submit" class="btn-submit-atelier" [disabled]="isLoading()">
            <span *ngIf="!isLoading()">REGISTRARME &nbsp; →</span>
            <span *ngIf="isLoading()">CREANDO CUENTA...</span>
          </button>
        </form>

        <div class="footer-links">
          <span>¿Ya eres miembro?</span>
          <a routerLink="/auth/login" class="link-login">Inicia Sesión Aquí</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .atelier-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f6f4ee;
      padding: 2.5rem 1rem;
    }
    .register-box {
      width: 100%;
      max-width: 600px;
      background-color: #fdfbf7;
      padding: 3rem;
      box-shadow: 0 15px 35px rgba(0,0,0,0.06);
      border: 1px solid #e8e3d8;
    }
    .portal-badge {
      display: inline-block;
      background-color: #eae5d9;
      color: #72624e;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      padding: 0.25rem 0.65rem;
      margin-bottom: 0.75rem;
    }
    .main-title {
      font-size: 2.2rem;
      color: #111;
      margin-bottom: 0.4rem;
    }
    .main-subtitle {
      font-size: 0.85rem;
      color: #666;
      line-height: 1.45;
      margin-bottom: 1.75rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .input-field-group {
      flex: 1;
    }
    .input-field-group {
      margin-bottom: 1.2rem;
    }
    .field-label {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #666;
      margin-bottom: 0.4rem;
    }
    .clean-input {
      width: 100%;
      padding: 0.8rem 1rem;
      font-size: 0.88rem;
      background-color: #ffffff;
      border: 1px solid #e2ddd4;
      border-radius: 1px;
      color: #111;
      outline: none;
    }
    .btn-submit-atelier {
      width: 100%;
      background-color: #0d0d0d;
      color: #ffffff;
      border: none;
      padding: 1rem 1.5rem;
      font-size: 0.825rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      cursor: pointer;
      margin-top: 1rem;
    }
    .btn-submit-atelier:disabled {
      opacity: 0.7;
    }
    .alert-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fde8e8;
      border-left: 3px solid #b71c1c;
      color: #b71c1c;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      margin-bottom: 1.25rem;
    }
    .footer-links {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.825rem;
      color: #736e67;
    }
    .link-login {
      margin-left: 0.4rem;
      color: #111;
      font-weight: 700;
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  ci = '';
  nombre = '';
  apellido = '';
  email = '';
  telefono = '';
  genero = 'Femenino';
  edad = 25;
  contrasena = '';
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.ci || !this.nombre || !this.apellido || !this.email || !this.contrasena) {
      this.errorMessage.set('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      ci: this.ci,
      nombre: this.nombre,
      apellido: this.apellido,
      correo_electronico: this.email,
      telefono: this.telefono,
      genero: this.genero,
      edad: this.edad,
      contrasena: this.contrasena
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/vestidor']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al registrar el cliente.');
      }
    });
  }
}
