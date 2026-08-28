import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import type { AlertaData } from '../../../core/services/dashboard.service';

const TIPO_LABELS: Record<string, string> = {
  BRUTE_FORCE: 'Intentos de acceso SSH sospechosos',
  SQL_INJECTION: 'Inyección SQL detectada',
  HTTP_FLOOD: 'Tráfico HTTP inusual',
  IP_MALICIOSA: 'IP maliciosa conocida',
  ANOMALIA_PROCESO: 'Anomalía en procesos del sistema',
  ESCANEO_PUERTOS: 'Escaneo de puertos detectado',
  ESCALACION_DATOS: 'Escalación de datos detectada',
};

const SEVERIDAD_STYLES: Record<string, { bg: string; color: string }> = {
  BAJA: { bg: 'rgba(100, 116, 139, 0.15)', color: 'var(--color-severidad-baja)' },
  MEDIA: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-severidad-media)' },
  ALTA: { bg: 'rgba(249, 115, 22, 0.15)', color: 'var(--color-severidad-alta)' },
  CRITICA: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-severidad-critica)' },
};

@Component({
  standalone: true,
  selector: 'app-alert-card',
  imports: [CommonModule, TimeAgoPipe],
  template: `
    <div class="alert-card" [style.--alert-color]="getSeveridadColor()">
      <div class="alert-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <strong class="alert-title">{{ getTitle() }}</strong>
        <span
          class="severity-badge"
          [style.background]="getSeveridadBg()"
          [style.color]="getSeveridadColor()"
        >
          {{ alerta.severidad | lowercase }}
        </span>
      </div>

      <p class="alert-meta">
        {{ alerta.detectadoEn | timeAgo }}
        <ng-container *ngIf="alerta.ipOrigen"> · IP de origen: {{ alerta.ipOrigen }}</ng-container>
        <ng-container *ngIf="alerta.vpsNombre"> · {{ alerta.vpsNombre }}</ng-container>
      </p>

      <p class="alert-description">{{ alerta.descripcionSimple }}</p>

      <div class="alert-actions">
        <button
          *ngIf="alerta.ipOrigen && bloqueoEstado !== 'bloqueada'"
          class="btn-primary btn-sm"
          [disabled]="bloqueoEstado === 'loading'"
          (click)="onBloquear()"
        >
          {{ bloqueoEstado === 'loading' ? 'Bloqueando...' : 'Bloquear IP' }}
        </button>

        <span *ngIf="bloqueoEstado === 'bloqueada'" class="btn-success btn-sm">
          Bloqueada
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>

        <span *ngIf="bloqueoEstado === 'fallido'" class="btn-error-msg">
          {{ bloqueoError }}
        </span>

        <button
          class="btn-secondary btn-sm"
          [disabled]="fpEstado === 'loading'"
          (click)="onMarcarFalsoPositivo()"
        >
          {{ fpEstado === 'loading' ? 'Marcando...' : 'Marcar como falso positivo' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .alert-card {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-left: 3px solid var(--alert-color, var(--color-input-border));
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 12px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .alert-card:hover {
      border-color: var(--alert-color, var(--color-accent));
      box-shadow: 0 0 12px -2px var(--alert-color, rgba(0, 240, 255, 0.2));
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .alert-header svg { color: var(--color-text-secondary); }

    .alert-title {
      font-size: 0.95rem;
      color: var(--color-text-primary);
    }

    .severity-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 2px 10px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .alert-meta {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin-bottom: 10px;
    }

    .alert-description {
      font-size: 0.88rem;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .alert-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn-sm {
      padding: 6px 14px;
      font-size: 0.75rem;
      border-radius: 6px;
      width: auto;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--color-secondary);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .btn-secondary:hover:not(:disabled) {
      border-color: var(--color-text-primary);
      color: var(--color-text-primary);
    }

    .btn-success {
      background: rgba(34, 197, 94, 0.15);
      color: var(--color-success);
      border: 1px solid var(--color-success);
      cursor: default;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .btn-error-msg {
      font-size: 0.75rem;
      color: var(--color-error);
    }
  `],
})
export class AlertCardComponent {
  @Input() alerta!: AlertaData;
  @Output() bloquear = new EventEmitter<AlertaData>();
  @Output() marcarFalsoPositivo = new EventEmitter<AlertaData>();

  bloqueoEstado: 'idle' | 'loading' | 'bloqueada' | 'fallido' = 'idle';
  bloqueoError = '';
  fpEstado: 'idle' | 'loading' = 'idle';

  getTitle(): string {
    return TIPO_LABELS[this.alerta.tipo] ?? this.alerta.tipo;
  }

  getSeveridadColor(): string {
    return SEVERIDAD_STYLES[this.alerta.severidad]?.color ?? 'var(--color-text-muted)';
  }

  getSeveridadBg(): string {
    return SEVERIDAD_STYLES[this.alerta.severidad]?.bg ?? 'rgba(100, 116, 139, 0.15)';
  }

  onBloquear(): void {
    this.bloqueoEstado = 'loading';
    this.bloquear.emit(this.alerta);
  }

  onMarcarFalsoPositivo(): void {
    this.fpEstado = 'loading';
    this.marcarFalsoPositivo.emit(this.alerta);
  }

  /** Llamado desde el parent después de recibir la respuesta del backend */
  setBloqueoResultado(estado: string, motivo?: string): void {
    if (estado === 'BLOQUEADO') {
      this.bloqueoEstado = 'bloqueada';
    } else {
      this.bloqueoEstado = 'fallido';
      this.bloqueoError = motivo ?? 'No se pudo bloquear — agente desconectado';
    }
  }

  resetFpEstado(): void {
    this.fpEstado = 'idle';
  }
}
