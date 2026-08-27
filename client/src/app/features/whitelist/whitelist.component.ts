import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { whitelistControllerCreate, whitelistControllerFindAll, whitelistControllerRemove } from '../../core/api-client/sdk.gen';
import { VpsService } from '../../core/services/vps.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

interface WhitelistEntry {
  id: string;
  userId: string;
  vpsId: string | null;
  ip: string;
  motivo: string | null;
  creadoEn: string;
}

interface VpsOption { id: string; nombre: string; }

@Component({
  standalone: true,
  selector: 'app-whitelist',
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent],
  template: `
    <div class="page-header">
      <h1>Gestión de Lista Blanca</h1>
      <p class="subtitle">Añade tus IPs de confianza para que Lumi nunca las bloquee.</p>
    </div>

    <!-- Formulario de añadir -->
    <div class="add-form-card">
      <h3 class="form-title">Añadir IP de confianza</h3>

      <form [formGroup]="form" (ngSubmit)="onAdd()" class="add-form">
        <div class="field">
          <label class="field-label">DIRECCIÓN IP *</label>
          <input formControlName="ip" class="input-field" placeholder="192.168.1.1" />
        </div>

        <div class="field field-nota">
          <label class="field-label">NOTA (OPCIONAL)</label>
          <input formControlName="motivo" class="input-field" placeholder="Ej. Oficina principal" />
        </div>

        <div class="field">
          <label class="field-label">APLICAR A</label>
          <select formControlName="vpsId" class="input-field select">
            <option value="">Todos mis VPS</option>
            <option *ngFor="let v of vpsList()" [value]="v.id">{{ v.nombre }}</option>
          </select>
        </div>

        <button type="submit" class="btn-primary btn-add" [disabled]="form.invalid || isAdding()">
          {{ isAdding() ? 'Añadiendo...' : '+ Añadir' }}
        </button>
      </form>

      <p *ngIf="addError()" class="error-inline">{{ addError() }}</p>
    </div>

    <!-- Tabla -->
    <div class="table-container" *ngIf="!isLoading()">
      <table class="whitelist-table" *ngIf="entries().length > 0">
        <thead>
          <tr>
            <th>IP</th>
            <th>NOTA</th>
            <th>ALCANCE</th>
            <th>ACCIÓN</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let entry of entries()">
            <td class="col-ip">{{ entry.ip }}</td>
            <td class="col-nota">{{ entry.motivo ?? '—' }}</td>
            <td>
              <span class="badge" [class.badge-global]="!entry.vpsId" [class.badge-vps]="!!entry.vpsId">
                {{ entry.vpsId ? getVpsNombre(entry.vpsId) : 'Global' }}
              </span>
            </td>
            <td>
              <button class="btn-eliminar" (click)="confirmarEliminar(entry)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="entries().length === 0" class="empty-state">
        Aún no tienes IPs en tu lista blanca.
      </div>
    </div>

    <div *ngIf="isLoading()" class="loading">Cargando lista blanca...</div>

    <!-- Confirm modal -->
    <app-confirm-modal
      *ngIf="showConfirm()"
      title="Eliminar de la lista blanca"
      [message]="'¿Eliminar la IP ' + deleteTarget()?.ip + ' de la lista blanca?'"
      confirmText="Eliminar"
      variant="danger"
      (confirmed)="doEliminar()"
      (cancelled)="showConfirm.set(false)"
    ></app-confirm-modal>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 1.6rem; color: var(--color-text-primary); }
    .subtitle { color: var(--color-text-secondary); font-size: 0.85rem; margin-top: 4px; }

    .add-form-card {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }

    .form-title {
      font-size: 0.95rem;
      color: var(--color-text-primary);
      margin-bottom: 16px;
    }

    .add-form {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .field-nota { flex: 1.5; }

    .field-label {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .select { appearance: none; cursor: pointer; }

    .btn-add {
      width: auto;
      padding: 12px 20px;
      font-size: 0.8rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .error-inline {
      color: var(--color-error);
      font-size: 0.8rem;
      margin-top: 10px;
    }

    .table-container {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .whitelist-table { width: 100%; border-collapse: collapse; }

    .whitelist-table thead tr { border-bottom: 1px solid var(--color-input-border); }

    .whitelist-table th {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      text-align: left;
    }

    .whitelist-table td {
      padding: 14px 16px;
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-input-border);
    }

    .col-ip {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: var(--color-accent);
    }

    .col-nota { color: var(--color-text-secondary); }

    .badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 3px 10px;
      border-radius: 20px;
      font-weight: 500;
    }

    .badge-global {
      background: rgba(0, 240, 255, 0.12);
      color: var(--color-accent);
    }

    .badge-vps {
      background: rgba(34, 197, 94, 0.12);
      color: var(--color-success);
    }

    .btn-eliminar {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      font-size: 0.75rem;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: color 0.2s;
    }

    .btn-eliminar:hover {
      color: var(--color-error);
    }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }

    .loading { color: var(--color-text-secondary); padding: 20px 0; }

    @media (max-width: 768px) {
      .add-form { flex-direction: column; align-items: stretch; }
    }
  `],
})
export class WhitelistComponent implements OnInit {
  entries = signal<WhitelistEntry[]>([]);
  vpsList = signal<VpsOption[]>([]);
  isLoading = signal(true);
  isAdding = signal(false);
  addError = signal('');
  showConfirm = signal(false);
  deleteTarget = signal<WhitelistEntry | null>(null);

  form: FormGroup;
  private vpsMap = new Map<string, string>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly vpsService: VpsService,
    private readonly toast: ToastService,
  ) {
    this.form = this.fb.group({
      ip: ['', [Validators.required, Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      motivo: [''],
      vpsId: [''],
    });
  }

  ngOnInit(): void {
    this.loadVps();
    this.loadEntries();
  }

  getVpsNombre(vpsId: string): string {
    return this.vpsMap.get(vpsId) ?? vpsId;
  }

  async onAdd(): Promise<void> {
    if (this.form.invalid) return;

    this.isAdding.set(true);
    this.addError.set('');

    try {
      const response = await whitelistControllerCreate({
        body: {
          ip: this.form.value.ip,
          motivo: this.form.value.motivo || undefined,
          vpsId: this.form.value.vpsId || undefined,
        },
      });

      if (response.error) throw response.error;

      const newEntry = response.data as WhitelistEntry;
      this.entries.update((list) => [newEntry, ...list]);
      this.form.reset({ ip: '', motivo: '', vpsId: '' });
      this.toast.show('IP añadida a la lista blanca', 'success');
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err?.status === 409) {
        this.addError.set('Esta IP ya está en la lista blanca para ese alcance');
      } else {
        this.addError.set('Error al añadir la IP. Verifica el formato.');
      }
    } finally {
      this.isAdding.set(false);
    }
  }

  confirmarEliminar(entry: WhitelistEntry): void {
    this.deleteTarget.set(entry);
    this.showConfirm.set(true);
  }

  async doEliminar(): Promise<void> {
    const target = this.deleteTarget();
    this.showConfirm.set(false);
    if (!target) return;

    try {
      const response = await whitelistControllerRemove({ path: { id: target.id } });
      if (response.error) throw response.error;

      this.entries.update((list) => list.filter((e) => e.id !== target.id));
      this.toast.show('IP removida de la lista blanca', 'success');
    } catch {
      this.toast.show('Error al eliminar la entrada', 'error');
    }
  }

  private async loadEntries(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await whitelistControllerFindAll();
      if (!response.error) {
        this.entries.set(response.data as WhitelistEntry[]);
      }
    } catch {
      this.entries.set([]);
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
