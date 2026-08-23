import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../layout/auth-layout.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <!-- Contenido izquierdo: formulario -->
      <h1 class="auth-title">Crea tu cuenta</h1>
      <p class="auth-subtitle">Tu tienda merece estar protegida desde el primer día.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
        <div class="field">
          <label class="field-label">NOMBRE COMPLETO</label>
          <input
            type="text"
            formControlName="nombre"
            class="input-field"
            placeholder="Ana García"
            autocomplete="name"
          />
        </div>

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

        <div class="field">
          <label class="field-label">CONTRASEÑA</label>
          <div class="input-wrapper">
            <input
              [type]="showPassword ? 'text' : 'password'"
              formControlName="password"
              class="input-field"
              placeholder="Mínimo 8 caracteres"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="toggle-password"
              (click)="showPassword = !showPassword"
              tabindex="-1"
            >
              <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <span class="field-hint">Mínimo 8 caracteres</span>
        </div>

        <button
          type="submit"
          class="btn-primary"
          [disabled]="form.invalid || isLoading"
        >
          {{ isLoading ? 'Creando cuenta...' : 'Crear cuenta' }}
        </button>

        <p *ngIf="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>

      <p class="auth-link">
        ¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a>
      </p>

      <!-- Contenido derecho: decorativo -->
      <div rightContent class="right-decorative">
        <img src="/images/3.jpeg" alt="Lumi Guardian" class="mascot" />
        <h2 class="right-title">Empieza en minutos.</h2>
        <p class="right-text">
          Conecta tu VPS, instala el agente con un comando, y Lumi comienza a vigilar de inmediato.
        </p>
      </div>
    </app-auth-layout>
  `,
  styles: [`
    .auth-title {
      font-size: 1.8rem;
      margin-bottom: 8px;
      color: var(--color-text-primary);
    }

    .auth-subtitle {
      color: var(--color-text-secondary);
      margin-bottom: 32px;
      font-size: 0.95rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .field-hint {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .input-wrapper {
      position: relative;
    }

    .input-wrapper .input-field {
      padding-right: 48px;
    }

    .toggle-password {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .error-message {
      color: var(--color-error);
      font-size: 0.85rem;
      text-align: center;
    }

    .auth-link {
      text-align: center;
      margin-top: 24px;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }

    /* Columna derecha */
    .right-decorative {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .mascot {
      width: 220px;
      height: auto;
      margin-bottom: 24px;
      border-radius: 16px;
    }

    .right-title {
      font-size: 1.3rem;
      font-family: var(--font-heading);
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .right-text {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      max-width: 300px;
      text-align: center;
    }
  `],
})
export class RegisterComponent {
  form: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.register(
        this.form.value.nombre,
        this.form.value.email,
        this.form.value.password,
      );
      this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err?.status === 409) {
        this.errorMessage = 'Este email ya está registrado';
      } else {
        this.errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';
      }
    } finally {
      this.isLoading = false;
    }
  }
}
