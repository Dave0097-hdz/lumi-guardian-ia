import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../layout/auth-layout.component';
import { authControllerForgotPassword } from '../../../core/api-client/sdk.gen';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <h1 class="auth-title">Recupera tu contraseña</h1>
      <p class="auth-subtitle">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>

      <!-- Formulario -->
      <form *ngIf="!sent()" [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
        <div class="field">
          <label class="field-label">EMAIL</label>
          <input
            type="email"
            formControlName="email"
            class="input-field"
            placeholder="tu&#64;email.com"
            autocomplete="email"
          />
        </div>

        <button type="submit" class="btn-primary" [disabled]="form.invalid || isLoading()">
          {{ isLoading() ? 'Enviando...' : 'Enviar enlace' }}
        </button>
      </form>

      <!-- Confirmación -->
      <div *ngIf="sent()" class="success-box">
        <p>Si el email existe en nuestra plataforma, recibirás un enlace para restablecer tu contraseña.</p>
        <p class="hint">Revisa tu bandeja de entrada y la carpeta de spam.</p>
      </div>

      <p class="auth-link">
        <a routerLink="/login">← Volver a iniciar sesión</a>
      </p>

      <!-- Columna derecha -->
      <div rightContent class="right-decorative">
        <img src="/images/3.jpeg" alt="Lumi Guardian" class="mascot" />
        <h2 class="right-title">No te preocupes.</h2>
        <p class="right-text">Te ayudamos a recuperar el acceso a tu cuenta en segundos.</p>
      </div>
    </app-auth-layout>
  `,
  styles: [`
    .auth-title { font-size: 1.8rem; margin-bottom: 8px; color: var(--color-text-primary); }
    .auth-subtitle { color: var(--color-text-secondary); margin-bottom: 32px; font-size: 0.95rem; }
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .field-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .auth-link { text-align: center; margin-top: 24px; color: var(--color-text-muted); font-size: 0.9rem; }
    .success-box {
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .success-box p { color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 8px; }
    .hint { color: var(--color-text-muted) !important; font-size: 0.8rem !important; }
    .right-decorative { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .mascot { width: 220px; height: auto; margin-bottom: 24px; border-radius: 16px; }
    .right-title { font-size: 1.3rem; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: 8px; }
    .right-text { color: var(--color-text-secondary); font-size: 0.9rem; max-width: 300px; text-align: center; }
  `],
})
export class ForgotPasswordComponent {
  form: FormGroup;
  isLoading = signal(false);
  sent = signal(false);

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);

    try {
      await authControllerForgotPassword({ body: { email: this.form.value.email } });
    } catch {
      // Siempre mostramos éxito (no revelar si el email existe)
    } finally {
      this.isLoading.set(false);
      this.sent.set(true);
    }
  }
}
