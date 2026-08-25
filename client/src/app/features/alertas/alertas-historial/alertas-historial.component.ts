import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { alertasControllerFindAll, alertasControllerFindOne } from '../../../core/api-client/sdk.gen';
import { VpsService } from '../../../core/services/vps.service';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

interface AlertaRow {
  id: string;
  vpsId: string;
  tipo: string;
  severidad: string;
  ipOrigen: string | null;
  accionTomada: string;
  estado: string;
  detectadoEn: string;
  descripcionSimple: string;
  descripcionTecnica?: string;
  evidencia?: Record<string, unknown>;
}

interface VpsOption { id: string; nombre: string; }

const TIPO_LABELS: Record<string, string> = {
  BRUTE_FORCE: 'Intentos de acceso SSH sospechosos',
  SQL_INJECTION: 'Inyección SQL detectada',
  HTTP_FLOOD: 'Tráfico HTTP inusual',
  IP_MALICIOSA: 'IP maliciosa conocida',
  ANOMALIA_PROCESO: 'Anomalía en procesos',
  ESCANEO_PUERTOS: 'Escaneo de puertos detectado',
  ESCALACION_DATOS: 'Escalación de datos',
};

const SEVERIDAD_STYLES: Record<string, { bg: string; color: string }> = {
  BAJA: { bg: 'rgba(100, 116, 139, 0.2)', color: 'var(--color-severidad-baja)' },
  MEDIA: { bg: 'rgba(245, 158, 11, 0.2)', color: 'var(--color-severidad-media)' },
  ALTA: { bg: 'rgba(249, 115, 22, 0.2)', color: 'var(--color-severidad-alta)' },
  CRITICA: { bg: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-severidad-critica)' },
};

const ESTADO_STYLES: Record<string, { bg: string; color: string }> = {
  DETECTADA: { bg: 'rgba(0, 240, 255, 0.15)', color: 'var(--color-accent)' },
  REVISADA: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' },
  FALSO_POSITIVO: { bg: 'rgba(100, 116, 139, 0.2)', color: 'var(--color-text-muted)' },
  RESUELTA: { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' },
};

const ACCION_LABELS: Record<string, string> = {
  NOTIFICADO: 'Notificado',
  SUGERENCIA_ENVIADA: 'Sugerencia enviada',
  BLOQUEADO_AUTOMATICAMENTE: 'Bloqueado automáticamente',
  AISLADO_AUTOMATICAMENTE: 'Aislado automáticamente',
  SIN_ACCION: 'Sin acción',
};

@Component({
  standalone: true,
  selector: 'app-alertas-historial',
  imports: [CommonModule, FormsModule, TimeAgoPipe],
  template: `
    <div class="page-header">
      <h1>Historial de Alertas</h1>
      <p class="subtitle">Registro completo de todas las amenazas detectadas.</p>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <select class="select-field" [ngModel]="filtroVps()" (ngModelChange)="filtroVps.set($event); loadAlertas()">
        <option value="">Todos los VPS</option>
        <option *ngFor="let v of vpsList()" [value]="v.id">{{ v.nombre }}</option>
      </select>
      <select class="select-field" [ngModel]="filtroSeveridad()" (ngModelChange)="filtroSeveridad.set($event); loadAlertas()">
        <option value="">Severidad</option>
        <option value="BAJA">Baja</option>
        <option value="MEDIA">Media</option>
        <option value="ALTA">Alta</option>
        <option value="CRITICA">Crítica</option>
      </select>
      <select class="select-field" [ngModel]="filtroEstado()" (ngModelChange)="filtroEstado.set($event); loadAlertas()">
        <option value="">Estado</option>
        <option value="DETECTADA">Detectada</option>
        <option value="REVISADA">Revisada</option>
        <option value="FALSO_POSITIVO">Falso positivo</option>
        <option value="RESUELTA">Resuelta</option>
      </select>
    </div>

    <!-- Tabla -->
    <div class="table-container" *ngIf="!isLoading()">
      <table class="alertas-table">
        <thead>
          <tr>
            <th>TIPO DE AMENAZA</th>
            <th>SEVERIDAD</th>
            <th>IP DE ORIGEN</th>
            <th>ACCIÓN DEL SISTEMA</th>
            <th>ESTADO</th>
            <th>FECHA</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let alerta of alertas()"
            class="alerta-row"
            [class.expanded]="expandedId() === alerta.id"
            (click)="toggleExpand(alerta.id)"
          >
            <td class="col-tipo">{{ getTipoLabel(alerta.tipo) }}</td>
            <td>
              <span class="badge" [style.background]="getSeveridadStyle(alerta.severidad).bg" [style.color]="getSeveridadStyle(alerta.severidad).color">
                {{ alerta.severidad | lowercase }}
              </span>
            </td>
            <td class="col-ip">{{ alerta.ipOrigen ?? '—' }}</td>
            <td class="col-accion">{{ getAccionLabel(alerta.accionTomada) }}</td>
            <td>
              <span class="badge" [style.background]="getEstadoStyle(alerta.estado).bg" [style.color]="getEstadoStyle(alerta.estado).color">
                {{ alerta.estado | lowercase }}
              </span>
            </td>
            <td class="col-fecha">{{ alerta.detectadoEn | timeAgo }}</td>
          </tr>

          <!-- Fila expandida -->
          <tr *ngIf="expandedId() && expandedDetail()" class="detail-row">
            <td colspan="6">
              <div class="detail-content">
                <p class="detail-desc"><strong>Descripción:</strong> {{ expandedDetail()!.descripcionSimple }}</p>
                <p class="detail-tech" *ngIf="expandedDetail()!.descripcionTecnica"><strong>Detalle técnico:</strong> {{ expandedDetail()!.descripcionTecnica }}</p>
                <div class="detail-evidence" *ngIf="expandedDetail()!.evidencia">
                  <strong>Evidencia:</strong>
                  <pre>{{ expandedDetail()!.evidencia | json }}</pre>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="alertas().length === 0" class="empty-state">
        No se encontraron alertas con los filtros seleccionados.
      </div>
    </div>

    <div *ngIf="isLoading()" class="loading">Cargando alertas...</div>

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
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.6rem; color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px; }

    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

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
      overflow: hidden;
    }

    .alertas-table {
      width: 100%;
      border-collapse: collapse;
    }

    .alertas-table thead tr {
      border-bottom: 1px solid var(--color-input-border);
    }

    .alertas-table th {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      text-align: left;
    }

    .alertas-table td {
      padding: 14px 16px;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-input-border);
    }

    .alerta-row {
      cursor: pointer;
      transition: background 0.15s;
    }

    .alerta-row:hover {
      background: rgba(0, 240, 255, 0.03);
    }

    .alerta-row.expanded {
      background: rgba(0, 240, 255, 0.05);
    }

    .col-tipo {
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .col-ip {
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }

    .col-accion { font-size: 0.8rem; }
    .col-fecha { font-size: 0.8rem; color: var(--color-text-muted); }

    .badge {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      padding: 3px 10px;
      border-radius: 20px;
      font-weight: 500;
      text-transform: capitalize;
      white-space: nowrap;
    }

    .detail-row td {
      padding: 0 16px 16px;
      border-bottom: 1px solid var(--color-input-border);
    }

    .detail-content {
      background: var(--color-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 10px;
      padding: 16px;
    }

    .detail-desc, .detail-tech {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .detail-evidence pre {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-surface);
      padding: 10px;
      border-radius: 8px;
      margin-top: 6px;
      overflow-x: auto;
    }

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

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `],
})
export class AlertasHistorialComponent implements OnInit {
  alertas = signal<AlertaRow[]>([]);
  vpsList = signal<VpsOption[]>([]);
  isLoading = signal(true);
  expandedId = signal<string | null>(null);
  expandedDetail = signal<AlertaRow | null>(null);

  // Filtros
  filtroVps = signal('');
  filtroSeveridad = signal('');
  filtroEstado = signal('');

  // Paginación
  page = signal(1);
  totalPages = signal(1);
  limit = 20;

  pagesArray = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  constructor(private readonly vpsService: VpsService) {}

  ngOnInit(): void {
    this.loadVps();
    this.loadAlertas();
  }

  getTipoLabel(tipo: string): string {
    return TIPO_LABELS[tipo] ?? tipo;
  }

  getSeveridadStyle(sev: string) {
    return SEVERIDAD_STYLES[sev] ?? SEVERIDAD_STYLES['BAJA'];
  }

  getEstadoStyle(estado: string) {
    return ESTADO_STYLES[estado] ?? ESTADO_STYLES['DETECTADA'];
  }

  getAccionLabel(accion: string): string {
    return ACCION_LABELS[accion] ?? accion;
  }

  async toggleExpand(id: string): Promise<void> {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.expandedDetail.set(null);
      return;
    }

    this.expandedId.set(id);
    try {
      const response = await alertasControllerFindOne({ path: { id } });
      if (!response.error) {
        this.expandedDetail.set(response.data as AlertaRow);
      }
    } catch {
      this.expandedDetail.set(null);
    }
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadAlertas();
  }

  async loadAlertas(): Promise<void> {
    this.isLoading.set(true);
    this.expandedId.set(null);
    this.expandedDetail.set(null);

    try {
      const response = await alertasControllerFindAll({
        query: {
          page: this.page(),
          limit: this.limit,
          ...(this.filtroVps() && { vpsId: this.filtroVps() }),
          ...(this.filtroSeveridad() && { severidad: this.filtroSeveridad() as never }),
          ...(this.filtroEstado() && { estado: this.filtroEstado() as never }),
        },
      });

      if (!response.error) {
        const data = response.data as { data: AlertaRow[]; meta: { total: number; totalPages: number } };
        this.alertas.set(data.data);
        this.totalPages.set(data.meta.totalPages);
      }
    } catch {
      this.alertas.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadVps(): Promise<void> {
    try {
      const list = await this.vpsService.getAll();
      this.vpsList.set(list.map((v) => ({ id: v.id, nombre: v.nombre })));
    } catch {
      this.vpsList.set([]);
    }
  }
}
