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
          <svg *ngIf="msg.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <svg *ngIf="msg.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <svg *ngIf="msg.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
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

    .toast-icon { display: inline-flex; align-items: center; justify-content: center; }
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
