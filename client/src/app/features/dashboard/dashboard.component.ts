import { Component, OnInit, ViewChildren, QueryList, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertCardComponent } from '../../shared/components/alert-card/alert-card.component';
import {
  DashboardService,
  AlertaData,
  ConteoSeveridad,
} from '../../core/services/dashboard.service';
import { RealtimeService } from '../../core/services/realtime.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, AlertCardComponent],
  template: `
    <!-- Encabezado -->
    <div class="dashboard-header">
      <div class="header-title">
        <span class="status-dot" [class.pulse]="agenteConectado()"></span>
        <h1>{{ agenteConectado() ? 'Protección Activa' : 'Sin agentes conectados' }}</h1>
      </div>
      <p class="header-subtitle" *ngIf="agenteConectado()">
        Lumi se encuentra patrullando{{ ultimaRevision() ? ' — ' + ultimaRevision() : '' }}.
      </p>
      <p class="header-subtitle" *ngIf="!agenteConectado()">
        Instala el agente en un VPS para que Lumi empiece a monitorear.
      </p>
    </div>

    <!-- Tarjetas de resumen -->
    <div class="summary-cards">
      <div class="summary-card" *ngFor="let card of summaryCards()">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" [attr.stroke]="card.color" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span class="card-label">{{ card.label }}</span>
        </div>
        <span class="card-count" [style.color]="card.color">{{ card.count }}</span>
        <span class="card-text">alertas activas</span>
      </div>
    </div>

    <!-- Barra de filtro -->
    <div class="filter-bar">
      <div class="search-input">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar alertas..."
          class="input-field search"
          [ngModel]="searchText()"
          (ngModelChange)="searchText.set($event)"
        />
      </div>
      <select class="select-field" [ngModel]="filtroSeveridad()" (ngModelChange)="filtroSeveridad.set($event)">
        <option value="">Por severidad</option>
        <option value="BAJA">Baja</option>
        <option value="MEDIA">Media</option>
        <option value="ALTA">Alta</option>
        <option value="CRITICA">Crítica</option>
      </select>
    </div>

    <!-- Amenazas Pendientes -->
    <div class="alerts-section">
      <h2 class="section-title">
        Amenazas Pendientes
        <span class="count-badge">{{ alertasFiltradas().length }}</span>
      </h2>

      <div *ngIf="isLoading()" class="loading-text">Cargando alertas...</div>

      <div *ngIf="!isLoading() && alertasFiltradas().length === 0" class="empty-state">
        No hay amenazas pendientes. Todo tranquilo.
      </div>

      <app-alert-card
        *ngFor="let alerta of alertasFiltradas(); trackBy: trackById"
        [alerta]="alerta"
        [class.recien-llegada]="alertasNuevas().has(alerta.id)"
        (bloquear)="onBloquear($event)"
        (marcarFalsoPositivo)="onMarcarFalsoPositivo($event)"
      ></app-alert-card>
    </div>
  `,
  styles: [`
    .dashboard-header { margin-bottom: 28px; }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title h1 {
      font-size: 1.6rem;
      color: var(--color-text-primary);
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--color-accent);
    }

    .status-dot.pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.4); }
      50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(0, 240, 255, 0); }
    }

    .header-subtitle {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      margin-top: 6px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }

    .summary-card {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .card-count {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .card-text {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .filter-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
      align-items: center;
    }

    .search-input {
      position: relative;
      flex: 1;
      max-width: 300px;
    }

    .search-input svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
    }

    .search-input .input-field.search {
      padding-left: 40px;
    }

    .select-field {
      padding: 12px 16px;
      background: var(--color-input-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      appearance: none;
      cursor: pointer;
      min-width: 140px;
    }

    .alerts-section { margin-top: 8px; }

    .section-title {
      font-size: 1.2rem;
      color: var(--color-text-primary);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .count-badge {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .loading-text {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
      padding: 20px 0;
    }

    .empty-state {
      color: var(--color-text-muted);
      font-size: 0.9rem;
      padding: 40px 0;
      text-align: center;
    }

    /* Destello sutil al llegar una alerta en vivo por WebSocket (I2).
       Nada intrusivo: un borde que aparece y se desvanece, coherente con el
       tono silencioso de la marca. */
    app-alert-card {
      display: block;
      border-radius: 12px;
    }

    app-alert-card.recien-llegada {
      animation: destello-alerta 2s ease-out;
    }

    @keyframes destello-alerta {
      0% {
        box-shadow: 0 0 0 2px var(--color-accent, #00f0ff), 0 0 16px rgba(0, 240, 255, 0.5);
      }
      100% {
        box-shadow: 0 0 0 0 transparent, 0 0 0 transparent;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      app-alert-card.recien-llegada { animation: none; }
    }

    @media (max-width: 768px) {
      .summary-cards { grid-template-columns: repeat(2, 1fr); }
      .filter-bar { flex-wrap: wrap; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  @ViewChildren(AlertCardComponent) alertCards!: QueryList<AlertCardComponent>;

  // Estado reactivo con signals (Angular 21 zoneless)
  alertas = signal<AlertaData[]>([]);
  isLoading = signal(true);
  searchText = signal('');
  filtroSeveridad = signal('');

  // Computed signals derivados
  summaryCards = computed(() => {
    const conteos = this.dashboardService.calcularConteos(this.alertas());
    return [
      { label: 'BAJA', count: conteos.BAJA, color: 'var(--color-severidad-baja)' },
      { label: 'MEDIA', count: conteos.MEDIA, color: 'var(--color-severidad-media)' },
      { label: 'ALTA', count: conteos.ALTA, color: 'var(--color-severidad-alta)' },
      { label: 'CRITICA', count: conteos.CRITICA, color: 'var(--color-severidad-critica)' },
    ];
  });

  alertasFiltradas = computed(() => {
    let resultado = this.alertas();
    const severidad = this.filtroSeveridad();
    const texto = this.searchText().toLowerCase().trim();

    if (severidad) {
      resultado = resultado.filter((a) => a.severidad === severidad);
    }

    if (texto) {
      resultado = resultado.filter(
        (a) => a.descripcionSimple.toLowerCase().includes(texto) ||
          (a.ipOrigen && a.ipOrigen.includes(texto)),
      );
    }

    return resultado;
  });

  /** IDs recién llegados en vivo, para el destello visual sutil (I2). */
  alertasNuevas = signal<Set<string>>(new Set());

  /** Estado de conexión del agente — controla el encabezado. */
  agenteConectado = signal(false);
  /** Texto relativo de la última revisión (heartbeat), o null si no hay. */
  ultimaRevision = signal<string | null>(null);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly realtimeService: RealtimeService,
  ) {
    // Canal en tiempo real: cuando llega una alerta por WebSocket, la anteponemos
    // a la lista. Los conteos (summaryCards) se recalculan solos por ser computed().
    effect(() => {
      const alerta = this.realtimeService.nuevaAlerta();
      if (!alerta) return;

      // Deduplicar por id (I3): si ya está en la lista, no hacer nada.
      if (this.alertas().some((a) => a.id === alerta.id)) return;

      // Enriquecer con el nombre del VPS igual que las demás (reutiliza vpsMap).
      void this.dashboardService.enriquecerConVps(alerta).then((enriquecida) => {
        this.alertas.update((actuales) => [enriquecida, ...actuales]);

        // Marcar como nueva para el destello, y quitar la marca tras la animación.
        this.alertasNuevas.update((set) => new Set(set).add(enriquecida.id));
        setTimeout(() => {
          this.alertasNuevas.update((set) => {
            const copia = new Set(set);
            copia.delete(enriquecida.id);
            return copia;
          });
        }, 2000);
      });
    });
  }

  ngOnInit(): void {
    this.cargarAlertas();
    this.cargarEstadoAgente();
  }

  private async cargarEstadoAgente(): Promise<void> {
    try {
      const { conectado, ultimoHeartbeat } = await this.dashboardService.getEstadoAgente();
      this.agenteConectado.set(conectado);
      this.ultimaRevision.set(
        ultimoHeartbeat ? `última revisión ${this.tiempoRelativo(ultimoHeartbeat)}` : null,
      );
    } catch {
      this.agenteConectado.set(false);
      this.ultimaRevision.set(null);
    }
  }

  /** Convierte un ISO timestamp en texto relativo en español (ej. "hace 12 segundos"). */
  private tiempoRelativo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const seg = Math.max(0, Math.floor(diffMs / 1000));

    if (seg < 60) return `hace ${seg} segundo${seg === 1 ? '' : 's'}`;
    const min = Math.floor(seg / 60);
    if (min < 60) return `hace ${min} minuto${min === 1 ? '' : 's'}`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `hace ${hrs} hora${hrs === 1 ? '' : 's'}`;
    const dias = Math.floor(hrs / 24);
    return `hace ${dias} día${dias === 1 ? '' : 's'}`;
  }

  trackById(_index: number, alerta: AlertaData): string {
    return alerta.id;
  }

  async onBloquear(alerta: AlertaData): Promise<void> {
    const card = this.alertCards.find((c) => c.alerta.id === alerta.id);

    try {
      const resultado = await this.dashboardService.bloquearIp(
        alerta.vpsId,
        alerta.ipOrigen!,
        `Bloqueo manual desde dashboard — ${alerta.tipo}`,
        alerta.id,
      );

      // HTTP 201: estado BLOQUEADO o FALLIDO — ambos son respuestas válidas
      card?.setBloqueoResultado(resultado.estado, resultado.motivo);
    } catch {
      card?.setBloqueoResultado('FALLIDO', 'Error de conexión con el servidor');
    }
  }

  async onMarcarFalsoPositivo(alerta: AlertaData): Promise<void> {
    const card = this.alertCards.find((c) => c.alerta.id === alerta.id);

    try {
      await this.dashboardService.marcarFalsoPositivo(alerta.id);
      // Remover de la lista (signal update)
      this.alertas.update((list) => list.filter((a) => a.id !== alerta.id));
    } catch {
      card?.resetFpEstado();
    }
  }

  private async cargarAlertas(): Promise<void> {
    this.isLoading.set(true);
    try {
      const resultado = await this.dashboardService.getAlertasPendientes();
      this.alertas.set(resultado.data);
    } catch {
      this.alertas.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
