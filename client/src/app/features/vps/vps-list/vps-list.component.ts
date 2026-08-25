import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VpsService, VpsData } from '../../../core/services/vps.service';
import { CreateVpsModalComponent } from '../create-vps-modal/create-vps-modal.component';

const ESTADO_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVO: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)', label: 'Activo' },
  PENDIENTE_INSTALACION: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-severidad-media)', label: 'Pendiente de instalación' },
  DESCONECTADO: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)', label: 'Desconectado' },
  MANTENIMIENTO: { bg: 'rgba(0, 240, 255, 0.15)', color: 'var(--color-accent)', label: 'Mantenimiento' },
  ELIMINADO: { bg: 'rgba(100, 116, 139, 0.15)', color: 'var(--color-text-muted)', label: 'Eliminado' },
};

@Component({
  standalone: true,
  selector: 'app-vps-list',
  imports: [CommonModule, CreateVpsModalComponent],
  template: `
    <div class="vps-header">
      <h1>Mis Servidores</h1>
      <p class="subtitle">{{ vpsList().length }} servidores registrados</p>
    </div>

    <div *ngIf="isLoading()" class="loading">Cargando servidores...</div>

    <div class="vps-cards" *ngIf="!isLoading()">
      <!-- VPS Cards -->
      <div class="vps-card" *ngFor="let vps of vpsList()">
        <div class="vps-card-left">
          <div class="vps-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div class="vps-info">
            <strong class="vps-name">{{ vps.nombre }}</strong>
            <span class="vps-meta">IP: {{ vps.ip }} · {{ vps.sistemaOperativo }} · {{ vps.proveedor }}</span>
          </div>
        </div>
        <div class="vps-card-right">
          <span
            class="status-badge"
            [style.background]="getEstadoStyle(vps.estado).bg"
            [style.color]="getEstadoStyle(vps.estado).color"
          >
            {{ getEstadoStyle(vps.estado).label }}
          </span>
          <button class="btn-outline" (click)="goToDetail(vps.id)">Configurar</button>
        </div>
      </div>

      <!-- Tarjeta añadir -->
      <div class="vps-card add-card" (click)="showModal.set(true)">
        <div class="add-content">
          <span class="add-icon">+</span>
          <span class="add-text">Añadir otro servidor</span>
        </div>
      </div>
    </div>

    <!-- Modal de creación -->
    <app-create-vps-modal
      *ngIf="showModal()"
      (closed)="onModalClosed($event)"
    ></app-create-vps-modal>
  `,
  styles: [`
    .vps-header { margin-bottom: 24px; }
    .vps-header h1 {
      font-size: 1.6rem;
      color: var(--color-text-primary);
    }
    .subtitle {
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      margin-top: 4px;
    }

    .loading {
      color: var(--color-text-secondary);
      padding: 20px 0;
    }

    .vps-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .vps-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 16px 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .vps-card:hover:not(.add-card) {
      border-color: var(--color-accent);
      box-shadow: 0 0 8px -2px rgba(0, 240, 255, 0.15);
    }

    .vps-card-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .vps-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 240, 255, 0.08);
      border-radius: 10px;
      color: var(--color-accent);
    }

    .vps-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .vps-name {
      font-size: 0.95rem;
      color: var(--color-text-primary);
    }

    .vps-meta {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .vps-card-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 500;
    }

    .btn-outline {
      padding: 8px 16px;
      font-size: 0.8rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--color-input-border);
      color: var(--color-text-primary);
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .btn-outline:hover {
      border-color: var(--color-accent);
    }

    .add-card {
      border-style: dashed;
      justify-content: center;
      cursor: pointer;
      padding: 24px;
    }

    .add-card:hover {
      border-color: var(--color-accent);
    }

    .add-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .add-icon {
      font-size: 1.5rem;
      color: var(--color-text-muted);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--color-input-border);
      border-radius: 8px;
    }

    .add-text {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
  `],
})
export class VpsListComponent implements OnInit {
  vpsList = signal<VpsData[]>([]);
  isLoading = signal(true);
  showModal = signal(false);

  constructor(
    private readonly vpsService: VpsService,
    private readonly router: Router,
  ) { }

  ngOnInit(): void {
    this.loadVps();
  }

  getEstadoStyle(estado: string) {
    return ESTADO_STYLES[estado] ?? ESTADO_STYLES['ELIMINADO'];
  }

  goToDetail(id: string): void {
    this.router.navigate(['/dashboard/vps', id]);
  }

  onModalClosed(created: boolean): void {
    this.showModal.set(false);
    if (created) {
      this.loadVps(); // Refresca la lista si se creó un VPS
    }
  }

  private async loadVps(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.vpsService.getAll();
      this.vpsList.set(data);
    } catch {
      this.vpsList.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
