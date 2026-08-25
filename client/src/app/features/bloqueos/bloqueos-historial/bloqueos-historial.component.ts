import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { bloqueosControllerFindAll, bloqueosControllerRemove } from '../../../core/api-client/sdk.gen';
import { VpsService } from '../../../core/services/vps.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

interface BloqueoRow {
  id: string;
  vpsId: string;
  userId: string | null;
  ip: string;
  motivo: string;
  estado: string;
  bloqueadoEn: string;
  desbloqueadoEn: string | null;
}

interface VpsOption { id: string; nombre: string; }

const ESTADO_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  BLOQUEADO: { bg: 'rgba(0, 240, 255, 0.15)', color: 'var(--color-accent)', label: 'Bloqueado' },
  DESBLOQUEADO: { bg: 'rgba(100, 116, 139, 0.15)', color: 'var(--color-text-muted)', label: 'Desbloqueado' },
  FALSO_POSITIVO: { bg: 'rgba(100, 116, 139, 0.15)', color: 'var(--color-text-muted)', label: 'Falso positivo' },
  FALLIDO: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)', label: 'Fallido' },
};

@Component({
  standalone: true,
  selector: 'app-bloqueos-historial',
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  template: `
    <div class="page-header">
      <h1>Bloqueos</h1>
      <p class="subtitle">IPs que han sido bloqueadas en tus servidores.</p>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <select class="select-field" [ngModel]="filtroVps()" (ngModelChange)="filtroVps.set($event); loadBloqueos()">
        <option value="">Todos los VPS</option>
        <option *ngFor="let v of vpsList()" [value]="v.id">{{ v.nombre }}</option>
      </select>
      <select class="select-field" [ngModel]="filtroEstado()" (ngModelChange)="filtroEstado.set($event); loadBloqueos()">
        <option value="">Estado</option>
        <option value="BLOQUEADO">Bloqueado</option>
        <option value="DESBLOQUEADO">Desbloqueado</option>
        <option value="FALLIDO">Fallido</option>
      </select>
    </div>

    <!-- Tabla -->
    <div class="table-container" *ngIf="!isLoading()">
      <table class="bloqueos-table">
        <thead>
          <tr>
            <th>IP</th>
            <th>VPS</th>
            <th>MOTIVO</th>
            <th>ORIGEN</th>
            <th>ESTADO</th>
            <th>FECHA</th>
            <th>ACCIÓN</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let b of bloqueos()">
            <td class="col-ip">{{ b.ip }}</td>
            <td>{{ getVpsNombre(b.vpsId) }}</td>
            <td class="col-motivo">{{ b.motivo }}</td>
            <td>
              <span class="badge" [class.badge-auto]="!b.userId" [class.badge-manual]="!!b.userId">
                {{ b.userId ? 'Manual' : 'Automático' }}
              </span>
            </td>
            <td>
              <span
                class="badge"
                [style.background]="getEstadoStyle(b.estado).bg"
                [style.color]="getEstadoStyle(b.estado).color"
              >
                {{ getEstadoStyle(b.estado).label }}
              </span>
            </td>
            <td class="col-fecha">{{ formatDate(b.bloqueadoEn) }}</td>
            <td>
              <button
                *ngIf="b.estado === 'BLOQUEADO'"
                class="btn-desbloquear"
                [disabled]="desbloqueandoId() === b.id"
                (click)="confirmarDesbloqueo(b)"
              >
                {{ desbloqueandoId() === b.id ? '...' : 'Desbloquear' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="bloqueos().length === 0" class="empty-state">
        No se encontraron bloqueos con los filtros seleccionados.
      </div>
    </div>

    <div *ngIf="isLoading()" class="loading">Cargando bloqueos...</div>

    <!-- Paginación -->
    <div class="pagination" *ngIf="totalPages() > 1">
      <button class="page-btn" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">Anterior</button>
      <button
        *ngFor="let p of pagesArray()"
        class="page-btn"
        [class.active]="p === page()"
        (click)="goToPage(p)"
      >{{ p }}</button>
      <button class="page-btn" [disabled]="page() >= totalPages()" (click)="goToPage(page() + 1)">Siguiente</button>
    </div>

    <!-- Modal de confirmación -->
    <app-confirm-modal
      *ngIf="showConfirm()"
      title="Desbloquear IP"
      [message]="'¿Desbloquear la IP ' + desbloqueoTarget()?.ip + '? Se enviará la orden al agente.'"
      confirmText="Desbloquear"
      variant="default"
      (confirmed)="doDesbloqueo()"
      (cancelled)="showConfirm.set(false)"
    ></app-confirm-modal>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.6rem; color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px; }

    .filters { display: flex; gap: 12px; margin-bottom: 20px; }

    .select-field {
      padding: 10px 14px;
      background: var(--color-input-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 10px;
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      appearance: none;
      cursor: pointer;
      min-width: 130px;
    }

    .table-container {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      overflow-x: auto;
    }

    .bloqueos-table { width: 100%; border-collapse: collapse; min-width: 900px; }

    .bloqueos-table thead tr { border-bottom: 1px solid var(--color-input-border); }

    .bloqueos-table th {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      text-align: left;
    }

    .bloqueos-table td {
      padding: 14px 16px;
      font-size: 0.83rem;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-input-border);
    }

    .col-ip {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--color-accent);
    }

    .col-motivo {
      min-width: 200px;
      white-space: normal;
      line-height: 1.4;
    }

    .col-fecha {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .badge {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      padding: 3px 10px;
      border-radius: 20px;
      font-weight: 500;
      white-space: nowrap;
    }

    .badge-auto {
      background: rgba(0, 240, 255, 0.12);
      color: var(--color-accent);
    }

    .badge-manual {
      background: rgba(249, 115, 22, 0.12);
      color: var(--color-severidad-alta);
    }

    .btn-desbloquear {
      padding: 5px 12px;
      font-size: 0.75rem;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--color-input-border);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .btn-desbloquear:hover:not(:disabled) {
      border-color: var(--color-accent);
      color: var(--color-text-primary);
    }

    .btn-desbloquear:disabled { opacity: 0.4; cursor: not-allowed; }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }

    .loading { color: var(--color-text-secondary); padding: 20px 0; }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 20px;
    }

    .page-btn {
      padding: 8px 14px;
      font-size: 0.8rem;
      border-radius: 8px;
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .page-btn:hover:not(:disabled) {
      border-color: var(--color-accent);
      color: var(--color-text-primary);
    }

    .page-btn.active {
      background: var(--color-accent);
      color: var(--color-bg);
      border-color: var(--color-accent);
    }

    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class BloqueosHistorialComponent implements OnInit {
  bloqueos = signal<BloqueoRow[]>([]);
  vpsList = signal<VpsOption[]>([]);
  isLoading = signal(true);

  filtroVps = signal('');
  filtroEstado = signal('');

  page = signal(1);
  totalPages = signal(1);
  limit = 20;

  showConfirm = signal(false);
  desbloqueoTarget = signal<BloqueoRow | null>(null);
  desbloqueandoId = signal<string | null>(null);

  private vpsMap = new Map<string, string>();

  constructor(
    private readonly vpsService: VpsService,
    private readonly toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.loadVps();
    this.loadBloqueos();
  }

  pagesArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  getEstadoStyle(estado: string) {
    return ESTADO_STYLES[estado] ?? ESTADO_STYLES['FALLIDO'];
  }

  getVpsNombre(vpsId: string): string {
    return this.vpsMap.get(vpsId) ?? vpsId;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadBloqueos();
  }

  confirmarDesbloqueo(bloqueo: BloqueoRow): void {
    this.desbloqueoTarget.set(bloqueo);
    this.showConfirm.set(true);
  }

  async doDesbloqueo(): Promise<void> {
    const target = this.desbloqueoTarget();
    this.showConfirm.set(false);
    if (!target) return;

    this.desbloqueandoId.set(target.id);

    try {
      const response = await bloqueosControllerRemove({ path: { id: target.id } });
      if (response.error) throw response.error;
      this.toast.show('IP desbloqueada correctamente', 'success');
      this.loadBloqueos();
    } catch {
      this.toast.show('Error al desbloquear — el agente puede no estar conectado', 'error');
    } finally {
      this.desbloqueandoId.set(null);
    }
  }

  async loadBloqueos(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await bloqueosControllerFindAll({
        query: {
          page: this.page(),
          limit: this.limit,
          ...(this.filtroVps() && { vpsId: this.filtroVps() }),
          ...(this.filtroEstado() && { estado: this.filtroEstado() as never }),
        },
      });

      if (!response.error) {
        const data = response.data as { data: BloqueoRow[]; meta: { totalPages: number } };
        this.bloqueos.set(data.data);
        this.totalPages.set(data.meta.totalPages);
      }
    } catch {
      this.bloqueos.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadVps(): Promise<void> {
    try {
      const list = await this.vpsService.getAll();
      this.vpsList.set(list.map((v) => ({ id: v.id, nombre: v.nombre })));
      this.vpsMap = new Map(list.map((v) => [v.id, v.nombre]));
    } catch {
      this.vpsList.set([]);
    }
  }
}
