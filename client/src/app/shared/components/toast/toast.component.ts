import { Component, Injectable, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  messages = signal<ToastMessage[]>([]);
  private counter = 0;

  show(text: string, type: ToastType = 'success', duration = 3000): void {
    const id = ++this.counter;
    this.messages.update((msgs) => [...msgs, { id, text, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.messages.update((msgs) => msgs.filter((m) => m.id !== id));
  }
}

@Component({
  standalone: true,
  selector: 'app-toast',
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let msg of toastService.messages()"
        class="toast"
        [class.success]="msg.type === 'success'"
        [class.error]="msg.type === 'error'"
        [class.warning]="msg.type === 'warning'"
        (click)="toastService.dismiss(msg.id)"
      >
        <span class="toast-icon">
          {{ msg.type === 'success' ? '✓' : msg.type === 'error' ? '✕' : '⚠' }}
        </span>
        <span class="toast-text">{{ msg.text }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 0.85rem;
      cursor: pointer;
      animation: slideIn 0.2s ease;
      min-width: 260px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .toast.success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid var(--color-success);
      color: var(--color-success);
    }

    .toast.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid var(--color-error);
      color: var(--color-error);
    }

    .toast.warning {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--color-severidad-media);
      color: var(--color-severidad-media);
    }

    .toast-icon { font-size: 1rem; font-weight: bold; }
    .toast-text { flex: 1; }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `],
})
export class ToastComponent {
  constructor(public readonly toastService: ToastService) { }
}
