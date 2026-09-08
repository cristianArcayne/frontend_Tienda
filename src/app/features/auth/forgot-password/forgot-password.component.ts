import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="atelier-wrapper">
      <div class="recovery-box">
        <div class="portal-badge-container">
          <span class="portal-badge">SEGURIDAD & ACCESO</span>
        </div>

        <h1 class="main-title font-serif">Recuperar Cuenta</h1>
        <p class="main-subtitle">
          Ingresa tu correo o CI registrado para restablecer tu contraseña y acceder nuevamente al vestidor.
        </p>

        <!-- ALERTA MENSAJE / ERROR -->
        <div *ngIf="errorMessage()" class="alert-error">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage() }}</span>
        </div>

        <div *ngIf="successMessage()" class="alert-success">
          <span class="material-symbols-outlined">check_circle</span>
          <span>{{ successMessage() }}</span>
        </div>

        <!-- PASO 1: SOLICITAR TOKEN DE RECUPERACIÓN -->
        <div *ngIf="step() === 1" class="step-container">
          <div class="input-field-group">
            <label class="field-label">CORREO ELECTRÓNICO O CI</label>
            <input 
              type="text" 
              [(ngModel)]="loginId" 
              class="clean-input" 
              placeholder="atelier@maison.com o 1001"
              required
            />
          </div>

          <button 
            type="button" 
            class="btn-submit-atelier" 
            [disabled]="isLoading()" 
            (click)="requestToken()"
          >
            <span *ngIf="!isLoading()">SOLICITAR RECUPERACIÓN &nbsp; →</span>
            <span *ngIf="isLoading()">PROCESANDO...</span>
          </button>
        </div>

        <!-- PASO 2: INGRESAR NUEVA CONTRASEÑA CON TOKEN -->
        <div *ngIf="step() === 2" class="step-container">
          <div class="token-banner">
            <span class="token-title">Token de verificación generado:</span>
            <span class="token-val">{{ resetToken().substring(0, 32) }}...</span>
          </div>

          <div class="input-field-group">
            <label class="field-label">NUEVA CONTRASEÑA</label>
            <input 
              type="password" 
              [(ngModel)]="newPassword" 
              class="clean-input" 
              placeholder="••••••••••••"
              required
            />
          </div>

          <div class="input-field-group">
            <label class="field-label">CONFIRMAR NUEVA CONTRASEÑA</label>
            <input 
              type="password" 
              [(ngModel)]="confirmPassword" 
              class="clean-input" 
              placeholder="••••••••••••"
              required
            />
          </div>

          <button 
            type="button" 
            class="btn-submit-atelier" 
            [disabled]="isLoading()" 
            (click)="submitNewPassword()"
          >
            <span *ngIf="!isLoading()">ACTUALIZAR CONTRASEÑA &nbsp; →</span>
            <span *ngIf="isLoading()">GUARDANDO...</span>
          </button>
        </div>

        <div class="footer-links">
          <a routerLink="/auth/login" class="link-back">← Volver al Acceso al Vestidor</a>
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
      padding: 2rem 1rem;
    }
    .recovery-box {
      width: 100%;
      max-width: 520px;
      background-color: #fdfbf7;
      padding: 3rem;
      box-shadow: 0 15px 35px rgba(0,0,0,0.06);
      border-radius: 2px;
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
      font-size: 2.1rem;
      color: #111;
      margin-bottom: 0.4rem;
    }
    .main-subtitle {
      font-size: 0.85rem;
      color: #666;
      line-height: 1.45;
      margin-bottom: 1.75rem;
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
    .alert-success {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #e6f4ea;
      border-left: 3px solid #137333;
      color: #137333;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      margin-bottom: 1.25rem;
    }
    .token-banner {
      background: #f3efe6;
      padding: 0.75rem 1rem;
      border: 1px dashed #c4baa7;
      margin-bottom: 1.25rem;
      font-size: 0.75rem;
    }
    .token-title {
      font-weight: 700;
      display: block;
      color: #555;
      margin-bottom: 0.2rem;
    }
    .token-val {
      font-family: monospace;
      color: #8e6d3d;
      word-break: break-all;
    }
    .input-field-group {
      margin-bottom: 1.25rem;
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
      padding: 0.85rem 1rem;
      font-size: 0.9rem;
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
      border-radius: 1px;
      margin-top: 0.5rem;
    }
    .btn-submit-atelier:disabled {
      opacity: 0.7;
    }
    .footer-links {
      text-align: center;
      margin-top: 2rem;
    }
    .link-back {
      color: #736e67;
      font-size: 0.8rem;
      text-decoration: none;
      font-weight: 600;
    }
    .link-back:hover {
      color: #111;
      text-decoration: underline;
    }
  `]
})
export class ForgotPasswordComponent {
  loginId = 'atelier@maison.com';
  step = signal<1 | 2>(1);
  resetToken = signal('');
  newPassword = '';
  confirmPassword = '';
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(private authService: AuthService, private router: Router) {}

  requestToken() {
    if (!this.loginId) {
      this.errorMessage.set('Por favor ingresa tu identificador o correo.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.forgotPassword(this.loginId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.resetToken.set(res.reset_token);
        this.step.set(2);
        this.successMessage.set('Identidad validada. Ya puedes definir tu nueva contraseña.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'No se pudo procesar la solicitud.');
      }
    });
  }

  submitNewPassword() {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.resetPassword({
      reset_token: this.resetToken(),
      new_password: this.newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message);
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al restablecer la contraseña.');
      }
    });
  }
}
