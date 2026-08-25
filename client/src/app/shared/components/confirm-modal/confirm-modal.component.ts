import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-confirm-modal',
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="onCancel()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3 class="modal-title" [class.danger]="variant === 'danger'">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        <div class="modal-actions">
          <button class="btn-outline" (click)="onCancel()">Cancelar</button>
          <button
            class="btn-confirm"
            [class.btn-danger]="variant === 'danger'"
            (click)="onConfirm()"
          >
            {{ confirmText }}
          </button>
        </div>
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
      z-index: 2000;
    }

    .modal {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 420px;
      width: 100%;
    }

    .modal-title {
      font-size: 1.1rem;
      color: var(--color-text-primary);
      margin-bottom: 10px;
    }

    .modal-title.danger {
      color: var(--color-error);
    }

    .modal-message {
      font-size: 0.88rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-outline {
      padding: 8px 18px;
      font-size: 0.85rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--color-input-border);
      color: var(--color-text-primary);
      cursor: pointer;
    }

    .btn-confirm {
      padding: 8px 18px;
      font-size: 0.85rem;
      border-radius: 8px;
      background: var(--color-accent);
      border: none;
      color: var(--color-bg);
      font-weight: 600;
      cursor: pointer;
    }

    .btn-danger {
      background: var(--color-error);
    }
  `],
})
export class ConfirmModalComponent {
  @Input() title = '¿Estás seguro?';
  @Input() message = '';
  @Input() confirmText = 'Confirmar';
  @Input() variant: 'default' | 'danger' = 'default';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void { this.cancelled.emit(); }
}
