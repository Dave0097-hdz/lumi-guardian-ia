import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-auth-layout',
  imports: [CommonModule],
  template: `
    <div class="auth-layout">
      <!-- Columna izquierda: formulario -->
      <div class="auth-left">
        <div class="auth-left-content">
          <!-- Logo -->
          <div class="auth-logo">
            <div class="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span class="logo-text">Lumi Guardian</span>
          </div>

          <!-- Contenido del formulario (proyectado) -->
          <ng-content></ng-content>
        </div>
      </div>

      <!-- Columna derecha: decorativa -->
      <div class="auth-right">
        <div class="auth-right-content">
          <ng-content select="[rightContent]"></ng-content>
        </div>
        <div class="grid-overlay"></div>
      </div>
    </div>
  `,
  styles: [`
    .auth-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    .auth-left {
      width: 40%;
      display: flex;
      align-items: center;
      padding: 48px 64px;
      background-color: var(--color-bg);
    }

    .auth-left-content {
      width: 100%;
      max-width: 400px;
    }

    .auth-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--color-accent);
      border-radius: 10px;
      color: var(--color-accent);
    }

    .logo-text {
      font-family: var(--font-heading);
      font-weight: 800;
      font-size: 1.1rem;
      color: var(--color-text-primary);
    }

    .auth-right {
      width: 60%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-bg);
      overflow: hidden;
    }

    .auth-right-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px;
    }

    .grid-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      background-image:
        linear-gradient(rgba(30, 41, 59, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30, 41, 59, 0.3) 1px, transparent 1px);
      background-size: 60px 60px;
      opacity: 0.4;
    }

    @media (max-width: 768px) {
      .auth-right {
        display: none;
      }
      .auth-left {
        width: 100%;
        padding: 32px 24px;
        justify-content: center;
      }
    }
  `],
})
export class AuthLayoutComponent {}
