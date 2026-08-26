import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VpsService, VpsData, VpsConfiguracion } from '../../../core/services/vps.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  standalone: true,
  selector: 'app-vps-detail',
  imports: [CommonModule, FormsModule, RouterLink, ConfirmModalComponent],
  template: `
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <a routerLink="/dashboard/vps" class="breadcrumb-link">Mis VPS</a>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{{ vps()?.nombre }}</span>
    </div>

    <div *ngIf="isLoading()" class="loading">Cargando configuración...</div>

    <div *ngIf="!isLoading() && vps()" class="detail-content">
      <!-- Encabezado -->
      <div class="detail-header">
        <div class="header-left">
          <div class="vps-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <h1 class="detail-title">{{ vps()!.nombre }}</h1>
            <p class="detail-meta">{{ vps()!.ip }} · {{ vps()!.sistemaOperativo }} · {{ vps()!.proveedor }}</p>
          </div>
        </div>
        <button class="btn-primary btn-save" (click)="guardarCambios()" [disabled]="isSaving()">
          {{ isSaving() ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>

      <!-- Configuración de Autonomía -->
      <section class="config-section">
        <h2>Configuración de Autonomía</h2>
        <p class="section-desc">¿Qué tan autónomo quieres que sea Lumi en este servidor?</p>

        <div class="autonomy-cards">
          <div
            class="autonomy-card"
            [class.active]="nivelAutonomia() === 'SOLO_ALERTAR'"
            (click)="nivelAutonomia.set('SOLO_ALERTAR')"
          >
            <span class="autonomy-icon">🔔</span>
            <strong class="autonomy-name">Solo Alertar</strong>
            <p class="autonomy-desc">Lumi detecta y te notifica. Tú decides cada acción por tu cuenta.</p>
          </div>

          <div
            class="autonomy-card"
            [class.active]="nivelAutonomia() === 'SUGERIR'"
            (click)="nivelAutonomia.set('SUGERIR')"
          >
            <span class="autonomy-icon">💡</span>
            <strong class="autonomy-name">Sugerir</strong>
            <p class="autonomy-desc">Lumi notifica y te sugiere una acción. Confirmas con un clic.</p>
          </div>

          <div
            class="autonomy-card"
            [class.active]="nivelAutonomia() === 'GUARDIAN_TOTAL'"
            (click)="nivelAutonomia.set('GUARDIAN_TOTAL')"
          >
            <span class="autonomy-icon">🛡️</span>
            <strong class="autonomy-name">Guardián Total</strong>
            <p class="autonomy-desc">Lumi actúa automáticamente ante amenazas y te notifica después.</p>
          </div>
        </div>
      </section>

      <!-- Umbrales de alerta -->
      <section class="config-section">
        <h2>Umbrales de alerta</h2>

        <div class="sliders-row">
          <div class="slider-group">
            <div class="slider-header">
              <span class="slider-label">CPU</span>
              <span class="slider-value" [style.color]="'var(--color-accent)'">{{ umbralCpu() }}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              [ngModel]="umbralCpu()"
              (ngModelChange)="umbralCpu.set($event)"
              class="slider"
            />
            <div class="slider-range"><span>10%</span><span>100%</span></div>
          </div>

          <div class="slider-group">
            <div class="slider-header">
              <span class="slider-label">RAM</span>
              <span class="slider-value" [style.color]="'var(--color-accent)'">{{ umbralRam() }}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              [ngModel]="umbralRam()"
              (ngModelChange)="umbralRam.set($event)"
              class="slider"
            />
            <div class="slider-range"><span>10%</span><span>100%</span></div>
          </div>
        </div>
      </section>

      <!-- Notificaciones -->
      <section class="config-section">
        <h2>Notificaciones</h2>

        <div class="toggle-row">
          <div class="toggle-info">
            <strong>Notificarme por email</strong>
            <p>Recibirás un correo con cada alerta importante</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [ngModel]="notifEmail()" (ngModelChange)="notifEmail.set($event)" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        @if (notifEmail()) {
          <div class="severidades-row">
            <div class="severidades-info">
              <strong>¿Para qué severidades?</strong>
              <p>Solo recibirás correo de las severidades seleccionadas</p>
            </div>
            <div class="chips">
              @for (sev of severidadesDisponibles; track sev.value) {
                <button
                  type="button"
                  class="chip"
                  [class.active]="severidadesNotif().includes(sev.value)"
                  [style.--chip-color]="sev.color"
                  (click)="toggleSeveridad(sev.value)"
                >
                  {{ sev.label }}
                </button>
              }
            </div>
          </div>
        }

        <div class="toggle-row">
          <div class="toggle-info">
            <strong>Notificarme en el dashboard</strong>
            <p>Las alertas aparecerán en tu panel de inicio</p>
          </div>
          <label class="toggle">
            <input type="checkbox" [ngModel]="notifDashboard()" (ngModelChange)="notifDashboard.set($event)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>

      <!-- Zona de riesgo -->
      <section class="config-section danger-zone">
        <h2 class="danger-title">Zona de riesgo</h2>
        <p class="section-desc">Las acciones aquí son irreversibles o afectan la conexión del agente.</p>

        <div class="danger-actions">
          <button class="btn-danger-outline" (click)="regenerarToken()">
            🔄 Regenerar token del agente
          </button>
          <button class="btn-danger-outline btn-delete" (click)="eliminarServidor()">
            🗑️ Eliminar servidor
          </button>
        </div>
      </section>

      <!-- Feedback -->
      <p *ngIf="errorMsg()" class="error-msg">{{ errorMsg() }}</p>
    </div>

    <!-- Confirm modals -->
    <app-confirm-modal
      *ngIf="showRegenerateConfirm()"
      title="Regenerar token del agente"
      message="El token actual dejará de funcionar inmediatamente. El agente perderá la conexión hasta que se configure con el nuevo token."
      confirmText="Regenerar"
      variant="danger"
      (confirmed)="doRegenerarToken()"
      (cancelled)="showRegenerateConfirm.set(false)"
    ></app-confirm-modal>

    <app-confirm-modal
      *ngIf="showDeleteConfirm()"
      title="Eliminar servidor"
      message="Esta acción eliminará el VPS y toda su configuración. No se puede deshacer."
      confirmText="Eliminar"
      variant="danger"
      (confirmed)="doEliminarServidor()"
      (cancelled)="showDeleteConfirm.set(false)"
    ></app-confirm-modal>

    <!-- Modal de token regenerado -->
    <div class="modal-backdrop" *ngIf="showTokenModal()" (click)="closeTokenModal()">
      <div class="token-modal" (click)="$event.stopPropagation()">
        <h3 class="token-modal-title">Nuevo token generado</h3>
        <p class="token-modal-desc">Este es tu nuevo token de agente. El anterior ha sido invalidado.</p>

        <div class="token-block">
          <code>{{ regeneratedToken() }}</code>
        </div>

        <button class="btn-copy-token" (click)="copyRegeneratedToken()">
          {{ tokenCopied() ? '✓ Copiado al portapapeles' : 'Copiar token' }}
        </button>

        <div class="token-warning">
          ⚠️ Guarda este token ahora — no podrás volver a verlo después de cerrar este diálogo.
        </div>

        <button class="btn-primary btn-close-modal" (click)="closeTokenModal()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }
    .breadcrumb-link { color: var(--color-text-muted); }
    .breadcrumb-sep { color: var(--color-text-muted); }
    .breadcrumb-current { color: var(--color-text-primary); }

    .loading { color: var(--color-text-secondary); padding: 20px 0; }

    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .vps-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 240, 255, 0.08);
      border-radius: 12px;
      color: var(--color-accent);
    }

    .detail-title {
      font-size: 1.4rem;
      color: var(--color-text-primary);
    }

    .detail-meta {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .btn-save {
      width: auto;
      padding: 10px 22px;
      font-size: 0.85rem;
    }

    .config-section {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .config-section h2 {
      font-size: 1.1rem;
      color: var(--color-text-primary);
      margin-bottom: 6px;
    }

    .section-desc {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
    }

    /* Autonomía */
    .autonomy-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .autonomy-card {
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }

    .autonomy-card:hover {
      border-color: var(--color-accent);
    }

    .autonomy-card.active {
      border-color: var(--color-accent);
      background: rgba(0, 240, 255, 0.05);
    }

    .autonomy-icon { font-size: 1.3rem; display: block; margin-bottom: 8px; }

    .autonomy-name {
      font-size: 0.9rem;
      color: var(--color-text-primary);
      display: block;
      margin-bottom: 4px;
    }

    .autonomy-card.active .autonomy-name {
      color: var(--color-accent);
    }

    .autonomy-desc {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    /* Sliders */
    .sliders-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    .slider-group { display: flex; flex-direction: column; gap: 8px; }

    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slider-label {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--color-text-primary);
    }

    .slider-value {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .slider {
      width: 100%;
      height: 6px;
      appearance: none;
      background: var(--color-input-border);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-accent);
      cursor: pointer;
    }

    .slider-range {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }

    /* Toggles */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-input-border);
    }

    .toggle-row:last-child { border-bottom: none; }

    .toggle-info strong {
      font-size: 0.9rem;
      color: var(--color-text-primary);
      display: block;
    }

    .toggle-info p {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    /* Chips de severidad */
    .severidades-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0 12px 20px;
      border-bottom: 1px solid var(--color-input-border);
    }

    .severidades-info strong {
      font-size: 0.85rem;
      color: var(--color-text-primary);
      display: block;
    }

    .severidades-info p {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .chip {
      padding: 5px 14px;
      border-radius: 999px;
      border: 1px solid var(--color-input-border);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip:hover {
      border-color: var(--chip-color);
      color: var(--color-text-primary);
    }

    .chip.active {
      border-color: var(--chip-color);
      background: color-mix(in srgb, var(--chip-color) 18%, transparent);
      color: var(--chip-color);
    }

    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      cursor: pointer;
    }

    .toggle input { opacity: 0; width: 0; height: 0; }

    .toggle-slider {
      position: absolute;
      inset: 0;
      background: var(--color-input-border);
      border-radius: 24px;
      transition: background 0.2s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      top: 3px;
      left: 3px;
      transition: transform 0.2s;
    }

    .toggle input:checked + .toggle-slider {
      background: var(--color-accent);
    }

    .toggle input:checked + .toggle-slider::before {
      transform: translateX(20px);
    }

    /* Zona de riesgo */
    .danger-zone {
      border-color: rgba(239, 68, 68, 0.3);
    }

    .danger-title { color: var(--color-error) !important; }

    .danger-actions {
      display: flex;
      gap: 12px;
    }

    .btn-danger-outline {
      padding: 8px 16px;
      font-size: 0.8rem;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--color-severidad-alta);
      color: var(--color-severidad-alta);
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-danger-outline:hover {
      background: rgba(249, 115, 22, 0.1);
    }

    .btn-delete {
      border-color: var(--color-error);
      color: var(--color-error);
    }

    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .success-msg {
      color: var(--color-success);
      font-size: 0.85rem;
      margin-top: 12px;
    }

    .error-msg {
      color: var(--color-error);
      font-size: 0.85rem;
      margin-top: 12px;
    }

    /* Token modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .token-modal {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      width: 100%;
    }

    .token-modal-title {
      font-size: 1.2rem;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .token-modal-desc {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      margin-bottom: 16px;
    }

    .token-block {
      background: var(--color-bg);
      border: 1px solid var(--color-input-border);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 12px;
    }

    .token-block code {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-accent);
      word-break: break-all;
    }

    .btn-copy-token {
      width: 100%;
      padding: 10px;
      font-size: 0.8rem;
      border-radius: 8px;
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--color-accent);
      color: var(--color-accent);
      cursor: pointer;
      margin-bottom: 12px;
      transition: background 0.2s;
    }

    .btn-copy-token:hover {
      background: rgba(0, 240, 255, 0.2);
    }

    .token-warning {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 0.8rem;
      color: var(--color-severidad-media);
      margin-bottom: 16px;
    }

    .btn-close-modal {
      width: 100%;
      padding: 10px;
      font-size: 0.85rem;
    }

    @media (max-width: 768px) {
      .autonomy-cards { grid-template-columns: 1fr; }
      .sliders-row { grid-template-columns: 1fr; }
      .detail-header { flex-direction: column; gap: 16px; align-items: flex-start; }
    }
  `],
})
export class VpsDetailComponent implements OnInit {
  vps = signal<VpsData | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  errorMsg = signal('');
  showRegenerateConfirm = signal(false);
  showDeleteConfirm = signal(false);

  // Estado para el modal de token regenerado
  showTokenModal = signal(false);
  regeneratedToken = signal('');
  tokenCopied = signal(false);

  // Config editable (signals)
  nivelAutonomia = signal('SOLO_ALERTAR');
  umbralCpu = signal(85);
  umbralRam = signal(90);
  notifEmail = signal(true);
  notifDashboard = signal(true);
  severidadesNotif = signal<string[]>([]);

  readonly severidadesDisponibles: { value: string; label: string; color: string }[] = [
    { value: 'BAJA', label: 'Baja', color: 'var(--color-severidad-baja, #64748b)' },
    { value: 'MEDIA', label: 'Media', color: 'var(--color-severidad-media, #f59e0b)' },
    { value: 'ALTA', label: 'Alta', color: 'var(--color-severidad-alta, #f97316)' },
    { value: 'CRITICA', label: 'Crítica', color: 'var(--color-error, #ef4444)' },
  ];

  private vpsId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly vpsService: VpsService,
    private readonly toast: ToastService,
  ) { }

  ngOnInit(): void {
    this.vpsId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadData();
  }

  toggleSeveridad(sev: string): void {
    this.severidadesNotif.update((actuales) =>
      actuales.includes(sev)
        ? actuales.filter((s) => s !== sev)
        : [...actuales, sev],
    );
  }

  async guardarCambios(): Promise<void> {
    this.isSaving.set(true);
    this.errorMsg.set('');

    try {
      await this.vpsService.updateConfiguracion(this.vpsId, {
        nivelAutonomia: this.nivelAutonomia(),
        umbralCpuAlerta: this.umbralCpu(),
        umbralRamAlerta: this.umbralRam(),
        notifEmail: this.notifEmail(),
        notifDashboard: this.notifDashboard(),
        severidadesNotif: this.severidadesNotif(),
      });
      this.toast.show('Cambios guardados correctamente', 'success');
    } catch {
      this.toast.show('Error al guardar los cambios', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  regenerarToken(): void {
    this.showRegenerateConfirm.set(true);
  }

  async doRegenerarToken(): Promise<void> {
    this.showRegenerateConfirm.set(false);
    try {
      const result = await this.vpsService.regenerateToken(this.vpsId);
      this.regeneratedToken.set(result.agentToken);
      this.tokenCopied.set(false);
      this.showTokenModal.set(true);
    } catch {
      this.toast.show('Error al regenerar el token', 'error');
    }
  }

  async copyRegeneratedToken(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.regeneratedToken());
      this.tokenCopied.set(true);
    } catch {
      // fallback
    }
  }

  closeTokenModal(): void {
    this.showTokenModal.set(false);
    this.regeneratedToken.set('');
  }

  eliminarServidor(): void {
    this.showDeleteConfirm.set(true);
  }

  async doEliminarServidor(): Promise<void> {
    this.showDeleteConfirm.set(false);
    try {
      await this.vpsService.delete(this.vpsId);
      this.toast.show('Servidor eliminado', 'success');
      this.router.navigate(['/dashboard/vps']);
    } catch {
      this.toast.show('Error al eliminar el servidor', 'error');
    }
  }

  private async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [vpsData, config] = await Promise.all([
        this.vpsService.getOne(this.vpsId),
        this.vpsService.getConfiguracion(this.vpsId),
      ]);

      this.vps.set(vpsData);
      this.nivelAutonomia.set(config.nivelAutonomia);
      this.umbralCpu.set(config.umbralCpuAlerta);
      this.umbralRam.set(config.umbralRamAlerta);
      this.notifEmail.set(config.notifEmail);
      this.notifDashboard.set(config.notifDashboard);
      this.severidadesNotif.set(config.severidadesNotif ?? []);
    } catch {
      this.errorMsg.set('Error al cargar la configuración');
    } finally {
      this.isLoading.set(false);
    }
  }
}
