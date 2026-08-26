import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-configuracion',
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>Configuración</h1>
    </div>

    <!-- Datos de la cuenta -->
    <section class="config-card">
      <h3 class="card-title">Datos de la cuenta</h3>

      <div class="fields-row">
        <div class="field">
          <label class="field-label">NOMBRE</label>
          <div class="field-value">{{ userName }}</div>
        </div>
        <div class="field">
          <label class="field-label">EMAIL</label>
          <div class="field-value">{{ userEmail }}</div>
        </div>
      </div>

      <p class="field-hint">Para actualizar tus datos de cuenta, contacta al soporte.</p>
    </section>

    <!-- Sesión -->
    <section class="config-card">
      <h3 class="card-title">Sesión</h3>
      <p class="session-info">
        Iniciaste sesión como <strong>{{ userName }}</strong>. Si cierras sesión tendrás que volver a ingresar tus credenciales.
      </p>
      <button class="btn-logout" (click)="onLogout()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16,17 21,12 16,7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
      </button>
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 1.6rem; color: var(--color-text-primary); }

    .config-card {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 1rem;
      color: var(--color-text-primary);
      margin-bottom: 16px;
    }

    .fields-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 12px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .field-value {
      padding: 12px 16px;
      background: var(--color-input-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 10px;
      color: var(--color-text-primary);
      font-size: 0.9rem;
    }

    .field-hint {
      font-size: 0.8rem;
      color: var(--color-accent);
      margin-top: 4px;
    }

    .session-info {
      font-size: 0.88rem;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .session-info strong {
      color: var(--color-text-primary);
    }

    .btn-logout {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 0.82rem;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--color-error);
      color: var(--color-error);
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 768px) {
      .fields-row { grid-template-columns: 1fr; }
    }
  `],
})
export class ConfiguracionComponent {
  userName = '';
  userEmail = '';

  constructor(private readonly authService: AuthService) {
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.nombre;
      this.userEmail = user.email;
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
