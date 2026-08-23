import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-placeholder">
      <h1>Dashboard</h1>
      <p>Bienvenido a LUMI Guardián AI. Esta pantalla se construirá en la siguiente fase.</p>
    </div>
  `,
  styles: [`
    .dashboard-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
    }
    p { color: var(--color-text-secondary); }
  `],
})
export class DashboardComponent {}
