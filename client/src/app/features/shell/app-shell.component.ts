import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  template: `
    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="logo">
          <div class="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span class="logo-text">Lumi Guardian</span>
        </div>
      </div>
      <div class="topbar-right">
        <span class="topbar-link">Nosotros</span>
        <div class="user-info">
          <div class="user-avatar">{{ userInitial }}</div>
          <span class="user-name">{{ userName }}</span>
        </div>
      </div>
    </header>

    <!-- Body: sidebar + content -->
    <div class="shell-body">
      <!-- Sidebar -->
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            <span>Inicio</span>
          </a>
          <a routerLink="/dashboard/vps" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>Mis VPS</span>
          </a>
          <a routerLink="/dashboard/alertas" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>Historial de Alertas</span>
          </a>
          <a routerLink="/dashboard/bloqueos" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Bloqueos</span>
          </a>
          <a routerLink="/dashboard/whitelist" routerLinkActive="active" class="nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <span>Control de Red</span>
          </a>
          <a class="nav-item disabled">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Configuración</span>
          </a>
        </nav>

        <button class="logout-btn" (click)="onLogout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <!-- Contenido principal -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>

    <!-- Notificaciones flotantes -->
    <app-toast></app-toast>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 24px;
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-input-border);
      flex-shrink: 0;
    }

    .topbar-left { display: flex; align-items: center; }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--color-accent);
      border-radius: 8px;
      color: var(--color-accent);
    }

    .logo-text {
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1rem;
      color: var(--color-text-primary);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .topbar-link {
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      cursor: pointer;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-accent);
      color: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .user-name {
      color: var(--color-text-primary);
      font-size: 0.9rem;
    }

    .shell-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 200px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px 12px;
      background: var(--color-bg);
      border-right: 1px solid var(--color-input-border);
      flex-shrink: 0;
      overflow-y: auto;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;
      cursor: pointer;
    }

    .nav-item:hover:not(.disabled) {
      background: rgba(0, 240, 255, 0.05);
      color: var(--color-text-primary);
    }

    .nav-item.active {
      background: rgba(0, 240, 255, 0.1);
      color: var(--color-accent);
    }

    .nav-item.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: none;
      border: none;
      color: var(--color-text-secondary);
      font-size: 0.85rem;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: var(--color-error);
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 32px 40px;
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main-content { padding: 20px 16px; }
    }
  `],
})
export class AppShellComponent {
  userName = '';
  userInitial = '';

  constructor(private readonly authService: AuthService) {
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.nombre;
      this.userInitial = user.nombre.charAt(0).toUpperCase();
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
