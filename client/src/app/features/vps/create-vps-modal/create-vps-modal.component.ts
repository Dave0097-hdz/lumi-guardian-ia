import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VpsService } from '../../../core/services/vps.service';

@Component({
  standalone: true,
  selector: 'app-create-vps-modal',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="onClose()">
      <div class="modal" (click)="$event.stopPropagation()">

        <!-- Paso 1: Formulario -->
        <ng-container *ngIf="step() === 1">
          <h2>Nuevo servidor</h2>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
            <div class="field">
              <label class="field-label">NOMBRE *</label>
              <input formControlName="nombre" class="input-field" placeholder="Tienda Principal" />
            </div>

            <div class="field">
              <label class="field-label">DIRECCIÓN IP *</label>
              <input formControlName="ip" class="input-field" placeholder="196.51.100.1" />
            </div>

            <div class="field">
              <label class="field-label">SISTEMA OPERATIVO</label>
              <input formControlName="sistemaOperativo" class="input-field" placeholder="Ubuntu 22.04 LTS" />
            </div>

            <div class="field">
              <label class="field-label">PROVEEDOR</label>
              <select formControlName="proveedor" class="input-field select">
                <option value="DIGITAL_OCEAN">DigitalOcean</option>
                <option value="AWS">AWS</option>
                <option value="LINODE">Linode</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div class="field full-width">
              <label class="field-label">DESCRIPCIÓN (OPCIONAL)</label>
              <input formControlName="descripcion" class="input-field" placeholder="Para qué usas este servidor" />
            </div>

            <div class="form-actions full-width">
              <button type="button" class="btn-outline" (click)="onClose()">Cancelar</button>
              <button type="submit" class="btn-primary btn-modal" [disabled]="form.invalid || isLoading()">
                {{ isLoading() ? 'Creando...' : 'Continuar' }}
              </button>
            </div>

            <p *ngIf="errorMessage()" class="error-message full-width">{{ errorMessage() }}</p>
          </form>
        </ng-container>

        <!-- Paso 2: Script de instalación -->
        <ng-container *ngIf="step() === 2">
          <h2>Servidor creado</h2>
          <p class="step2-subtitle">Copia el script de instalación y ejecútalo en tu VPS.</p>

          <div class="script-block">
            <pre>{{ installScript() }}</pre>
          </div>

          <div class="token-section">
            <label class="field-label">TOKEN DEL AGENTE</label>
            <div class="token-display">
              <code>{{ agentToken() }}</code>
              <button class="btn-copy" (click)="copyToken()">
                {{ copied() ? '✓ Copiado' : 'Copiar' }}
              </button>
            </div>
          </div>

          <div class="warning-box">
            ⚠️ Guarda este token ahora — no podrás volver a verlo.
          </div>

          <button class="btn-primary btn-modal" (click)="onClose()">Cerrar</button>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal h2 {
      font-size: 1.3rem;
      color: var(--color-text-primary);
      margin-bottom: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .select {
      appearance: none;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-outline {
      padding: 10px 20px;
      font-size: 0.85rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--color-input-border);
      color: var(--color-text-primary);
      cursor: pointer;
    }

    .btn-modal {
      width: auto;
      padding: 10px 24px;
      font-size: 0.85rem;
    }

    .error-message {
      color: var(--color-error);
      font-size: 0.8rem;
      text-align: center;
    }

    /* Paso 2 */
    .step2-subtitle {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      margin-bottom: 16px;
    }

    .script-block {
      background: var(--color-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      overflow-x: auto;
    }

    .script-block pre {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }

    .token-section {
      margin-bottom: 16px;
    }

    .token-display {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
      background: var(--color-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 10px;
      padding: 10px 14px;
    }

    .token-display code {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-accent);
      flex: 1;
      word-break: break-all;
    }

    .btn-copy {
      padding: 4px 12px;
      font-size: 0.75rem;
      border-radius: 6px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--color-accent);
      color: var(--color-accent);
      cursor: pointer;
      white-space: nowrap;
    }

    .warning-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 0.8rem;
      color: var(--color-severidad-media);
      margin-bottom: 20px;
    }
  `],
})
export class CreateVpsModalComponent {
  @Output() closed = new EventEmitter<boolean>(); // true = VPS creado, false = cancelado

  step = signal(1);
  isLoading = signal(false);
  errorMessage = signal('');
  installScript = signal('');
  agentToken = signal('');
  copied = signal(false);

  form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly vpsService: VpsService,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required]],
      ip: ['', [Validators.required]],
      sistemaOperativo: ['', [Validators.required]],
      proveedor: ['DIGITAL_OCEAN', [Validators.required]],
      descripcion: [''],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.vpsService.create({
        nombre: this.form.value.nombre,
        ip: this.form.value.ip,
        sistemaOperativo: this.form.value.sistemaOperativo,
        proveedor: this.form.value.proveedor,
        descripcion: this.form.value.descripcion || undefined,
      });

      this.installScript.set(result.installScript);
      this.agentToken.set(result.agentToken);
      this.step.set(2);
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err?.status === 409) {
        this.errorMessage.set('Ya tienes un VPS registrado con esa IP');
      } else {
        this.errorMessage.set('Error al crear el servidor. Intenta de nuevo.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async copyToken(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.agentToken());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Fallback: no-op si clipboard no disponible
    }
  }

  onClose(): void {
    this.closed.emit(this.step() === 2); // true si se creó el VPS
  }
}
