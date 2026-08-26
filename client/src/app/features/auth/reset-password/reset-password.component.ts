import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../layout/auth-layout.component';
import { authControllerResetPassword } from '../../../core/api-client/sdk.gen';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <h1 class="auth-title">Nueva contraseña</h1>
      <p class="auth-subtitle">Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.</p>

      <!-- Formulario -->
      <form *ngIf="!success()" [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
        <div class="field">
          <label class="field-label">NUEVA CONTRASEÑA</label>
          <div class="input-wrapper">
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              class="input-field"
              placeholder="Mínimo 8 caracteres"
              autocomplete="new-password"
            />
            <button type="button" class="toggle-password" (click)="showPassword.set(!showPassword())" tabindex="-1">
              <svg *ngIf="!showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg *ngIf="showPassword()" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <span class="field-hint">Mínimo 8 caracteres, una mayúscula, un número y un símbolo</span>
        </div>

        <button type="submit" class="btn-primary" [disabled]="form.invalid || isLoading()">
          {{ isLoading() ? 'Guardando...' : 'Cambiar contraseña' }}
        </button>

        <p *ngIf="errorMessage()" class="error-message">{{ errorMessage() }}</p>
      </form>

      <!-- Éxito -->
      <div *ngIf="success()" class="success-box">
        <p>Tu contraseña ha sido actualizada correctamente.</p>
        <a routerLink="/login" class="btn-primary" style="display:block; text-align:center; margin-top:16px; text-decoration:none;">
          Iniciar sesión
        </a>
      </div>
      <!-- Columna derecha -->
      <div rightContent class="right-decorative">
        <img src="/images/3.jpeg" alt="Lumi Guardian" class="mascot" />
        <h2 class="right-title">Casi listo.</h2>
        <p class="right-text">Elige una contraseña segura para proteger tu cuenta.</p>
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
    .field-hint { font-size: 0.8rem; color: var(--color-text-muted); }
    .input-wrapper { position: relative; }
    .input-wrapper .input-field { padding-right: 48px; }
    .toggle-password {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px;
    }
    .error-message { color: var(--color-error); font-size: 0.85rem; text-align: center; }
    .success-box {
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 12px;
      padding: 20px;
    }
    .success-box p { color: var(--color-text-secondary); font-size: 0.9rem; }
    .right-decorative { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .mascot { width: 220px; height: auto; margin-bottom: 24px; border-radius: 16px; }
    .right-title { font-size: 1.3rem; font-family: var(--font-heading); color: var(--color-text-primary); margin-bottom: 8px; }
    .right-text { color: var(--color-text-secondary); font-size: 0.9rem; max-width: 300px; text-align: center; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  isLoading = signal(false);
  success = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  private token = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('Token no proporcionado — solicita un nuevo enlace.');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.token) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await authControllerResetPassword({
        body: { token: this.token, password: this.form.value.password },
      });

      if (response.error) {
        const err = response.error as { message?: string };
        this.errorMessage.set(err?.message ?? 'Token inválido o expirado — solicita uno nuevo.');
      } else {
        this.success.set(true);
      }
    } catch {
      this.errorMessage.set('Error de conexión — intenta de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
