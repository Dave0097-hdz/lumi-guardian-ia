import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import type { AlertaData } from './dashboard.service';

/**
 * Canal WebSocket backend↔dashboard (namespace /dashboard).
 *
 * Separado del cliente REST autogenerado (que no cubre WebSocket). Se conecta
 * cuando hay sesión activa y se desconecta en logout — nunca debe quedar una
 * conexión viva tras cerrar sesión.
 *
 * Expone la última alerta recibida como signal; DashboardComponent la consume
 * vía effect(). Fase A: solo el evento 'nueva-alerta'.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;

  /** Última alerta recibida en vivo. null hasta que llegue la primera. */
  readonly nuevaAlerta = signal<AlertaData | null>(null);

  /**
   * Abre la conexión al namespace /dashboard con el accessToken en el handshake.
   * Idempotente: si ya hay un socket conectado, no hace nada.
   */
  conectar(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    this.socket = io(`${environment.apiUrl}/dashboard`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('nueva-alerta', (alerta: AlertaData) => {
      this.nuevaAlerta.set(alerta);
    });

    // Al reconectar tras un corte, usar siempre el accessToken más reciente de
    // AuthService (pudo renovarse por refresh), no el cacheado al conectar (R5).
    this.socket.io.on('reconnect_attempt', () => {
      if (this.socket) {
        this.socket.auth = { token: this.authService.getAccessToken() ?? '' };
      }
    });
  }

  /** Cierra la conexión y libera el socket. Se llama desde logout. */
  desconectar(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
