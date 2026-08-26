import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type Tab = 'mision' | 'vision' | 'equipo';

interface TeamMember {
  initials: string;
  nombre: string;
  rol: string;
  color: string;
  skills: string[];
}

@Component({
  standalone: true,
  selector: 'app-nosotros',
  imports: [CommonModule],
  template: `
    <!-- Hero -->
    <div class="hero">
      <span class="hero-badge">NUESTRA MISIÓN</span>
      <h1 class="hero-title">Tu tienda, nuestra misión.</h1>
      <p class="hero-desc">
        Creamos Lumi Guardian porque miles de emprendedores construyeron sus tiendas
        digitales con esfuerzo, y no deberían perderlas por un ataque técnico que no
        supieron detectar a tiempo. Queremos ser la capa de protección silenciosa que todo
        dueño de e-commerce merece — sin necesitar ser un experto en servidores.
      </p>
    </div>

    <!-- Pilares -->
    <div class="pilares">
      <div class="pilar-card">
        <span class="pilar-icon">🛡️</span>
        <strong>Protección accesible</strong>
        <p>Seguridad de nivel empresarial para cualquier emprendedor con un VPS.</p>
      </div>
      <div class="pilar-card">
        <span class="pilar-icon">💬</span>
        <strong>Sin jerga técnica</strong>
        <p>Comunicamos cada amenaza en lenguaje humano. Siempre.</p>
      </div>
      <div class="pilar-card">
        <span class="pilar-icon">⚡</span>
        <strong>Respuesta en segundos</strong>
        <p>Detectamos y actuamos antes de que el daño se materialice.</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab"
        [class.active]="activeTab() === 'mision'"
        (click)="activeTab.set('mision')"
      >
        ✦ Misión
      </button>
      <button
        class="tab"
        [class.active]="activeTab() === 'vision'"
        (click)="activeTab.set('vision')"
      >
        ◉ Visión
      </button>
      <button
        class="tab"
        [class.active]="activeTab() === 'equipo'"
        (click)="activeTab.set('equipo')"
      >
        👥 Equipo
      </button>
    </div>

    <!-- Tab content: Misión -->
    <div class="tab-content" *ngIf="activeTab() === 'mision'">
      <div class="content-grid">
        <div class="content-text">
          <h2>Nuestra Misión</h2>
          <p>
            Proteger las tiendas digitales de emprendedores que no tienen equipo de
            seguridad propio, traduciendo eventos técnicos de red y logs en lenguaje
            accesible, y ofreciendo mitigación automática de ataques según el nivel de
            autonomía que el usuario configure.
          </p>
          <p class="quote">
            "Porque en el futuro, la seguridad no dependerá de reaccionar al ataque…
            sino de detectarlo en el momento en que comienza."
          </p>
        </div>
        <div class="content-card accent-card">
          <strong>Lo que entregamos</strong>
          <ul>
            <li>Detección de amenazas en tiempo real por reglas heurísticas</li>
            <li>Bloqueo automático de IPs maliciosas vía UFW</li>
            <li>Notificaciones en lenguaje natural, sin jerga</li>
            <li>Dashboard que cualquier emprendedor puede entender</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tab content: Visión -->
    <div class="tab-content" *ngIf="activeTab() === 'vision'">
      <div class="content-grid">
        <div class="content-card accent-card">
          <strong>Pilares Tecnológicos</strong>
          <ul>
            <li>Detección por reglas y umbrales configurables</li>
            <li>Monitoreo continuo de logs SSH, HTTP y métricas</li>
            <li>Bloqueo autónomo sin intervención humana</li>
            <li>Comunicación en lenguaje natural</li>
          </ul>
        </div>
        <div class="content-text">
          <h2>Nuestra Visión</h2>
          <p>
            Crear un ecosistema de seguridad inteligente, autónomo y fácil de operar.
            LUMI actúa como un experto de seguridad personal 24/7 que no se basa en
            firmas de virus antiguas, sino en entender la línea base del servidor y
            bloquear anomalías antes de que afecten las ventas del usuario.
          </p>
          <div class="aspiration-badge">
            Aspiración central: Protección invisible para e-commerce
          </div>
        </div>
      </div>
    </div>

    <!-- Tab content: Equipo -->
    <div class="tab-content" *ngIf="activeTab() === 'equipo'">
      <div class="equipo-header">
        <h2>El equipo</h2>
        <p class="equipo-desc">Personas que trabajan cada día para que tu negocio esté protegido.</p>
      </div>

      <div class="team-grid">
        <div class="team-card" *ngFor="let member of team">
          <div class="team-avatar" [style.background]="member.color">
            {{ member.initials }}
          </div>
          <strong class="team-name">{{ member.nombre }}</strong>
          <span class="team-rol">{{ member.rol }}</span>
          <div class="team-skills">
            <span class="skill-badge" *ngFor="let skill of member.skills">{{ skill }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Hero */
    .hero {
      text-align: center;
      margin-bottom: 32px;
      padding: 20px 0;
    }

    .hero-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-accent);
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 20px;
      padding: 4px 14px;
      margin-bottom: 16px;
      letter-spacing: 0.05em;
    }

    .hero-title {
      font-size: 2rem;
      color: var(--color-text-primary);
      margin-bottom: 16px;
    }

    .hero-desc {
      color: var(--color-text-secondary);
      font-size: 0.92rem;
      max-width: 650px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* Pilares */
    .pilares {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .pilar-card {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }

    .pilar-icon { font-size: 1.5rem; display: block; margin-bottom: 10px; }

    .pilar-card strong {
      display: block;
      font-size: 0.9rem;
      color: var(--color-text-primary);
      margin-bottom: 6px;
    }

    .pilar-card p {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 28px;
      border-bottom: 1px solid var(--color-input-border);
      padding-bottom: 12px;
    }

    .tab {
      padding: 8px 18px;
      font-size: 0.82rem;
      border-radius: 20px;
      background: transparent;
      border: 1px solid var(--color-input-border);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      border-color: var(--color-accent);
      color: var(--color-text-primary);
    }

    .tab.active {
      background: var(--color-accent);
      color: var(--color-bg);
      border-color: var(--color-accent);
      font-weight: 600;
    }

    /* Tab content */
    .tab-content { animation: fadeIn 0.2s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }

    .content-text h2 {
      font-size: 1.3rem;
      color: var(--color-text-primary);
      margin-bottom: 14px;
    }

    .content-text p {
      font-size: 0.88rem;
      color: var(--color-text-secondary);
      line-height: 1.7;
      margin-bottom: 12px;
    }

    .quote {
      font-style: italic;
      color: var(--color-accent) !important;
      border-left: 3px solid var(--color-accent);
      padding-left: 14px;
      margin-top: 16px;
    }

    .accent-card {
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 12px;
      padding: 24px;
    }

    .accent-card strong {
      display: block;
      font-size: 1rem;
      color: var(--color-text-primary);
      margin-bottom: 12px;
    }

    .accent-card ul {
      list-style: none;
      padding: 0;
    }

    .accent-card li {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
    }

    .accent-card li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--color-accent);
    }

    .aspiration-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--color-accent);
      background: rgba(0, 240, 255, 0.08);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 8px;
      padding: 8px 14px;
      margin-top: 16px;
    }

    /* Equipo */
    .equipo-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .equipo-header h2 {
      font-size: 1.3rem;
      color: var(--color-text-primary);
      margin-bottom: 6px;
    }

    .equipo-desc {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .team-card {
      background: var(--color-surface);
      border: 1px solid var(--color-input-border);
      border-radius: 12px;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .team-card:hover {
      border-color: var(--color-accent);
      box-shadow: 0 0 12px -2px rgba(0, 240, 255, 0.15);
    }

    .team-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      color: white;
      margin-bottom: 4px;
    }

    .team-name {
      font-size: 0.9rem;
      color: var(--color-text-primary);
    }

    .team-rol {
      font-size: 0.75rem;
      color: var(--color-accent);
      font-family: var(--font-mono);
    }

    .team-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      margin-top: 6px;
    }

    .skill-badge {
      font-size: 0.65rem;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(0, 240, 255, 0.08);
      border: 1px solid var(--color-input-border);
      color: var(--color-text-muted);
    }

    @media (max-width: 768px) {
      .pilares { grid-template-columns: 1fr; }
      .content-grid { grid-template-columns: 1fr; }
      .team-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class NosotrosComponent {
  activeTab = signal<Tab>('mision');

  team: TeamMember[] = [
    {
      initials: 'CL',
      nombre: 'Cristian',
      rol: 'Lead Cloud Security',
      color: '#6366f1',
      skills: ['Hardening', 'Caldera', 'UFW', 'Cloud'],
    },
    {
      initials: 'RA',
      nombre: 'Raúl',
      rol: 'Telemetría & Agent',
      color: '#22c55e',
      skills: ['Python', 'Monitores', 'SQLite', 'Logs'],
    },
    {
      initials: 'DH',
      nombre: 'David',
      rol: 'Backend & Frontend',
      color: '#00f0ff',
      skills: ['NestJS', 'Angular', 'Prisma', 'Docker'],
    },
    {
      initials: 'JS',
      nombre: 'Jess',
      rol: 'UI/UX & Producto',
      color: '#f59e0b',
      skills: ['Figma', 'UX Research', 'Prototipos'],
    },
  ];
}
