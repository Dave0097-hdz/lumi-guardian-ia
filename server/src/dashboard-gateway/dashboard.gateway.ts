import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
}

/**
 * Gateway backend↔dashboard, autenticado con el JWT del usuario (accessToken).
 *
 * Separado por completo del AgentGateway (namespace /agents, auth con agentToken):
 * distinto namespace, distinta lógica de autenticación y de registro.
 *
 * Único propósito de esta fase: empujar la notificación de una alerta nueva al
 * instante, sin que el frontend haga polling. El historial vía GET /alertas sigue
 * siendo la fuente de verdad si el usuario no estaba conectado.
 *
 * Nota de seguridad: se valida el JWT manualmente en handleConnection() con
 * JwtService.verifyAsync(), no con un guard — los guards de Nest no cubren el ciclo
 * de vida de conexión de un WebSocketGateway igual que a un controller REST. Es el
 * mismo patrón ya usado en AgentGateway (bcrypt.compare en handleConnection).
 */
@WebSocketGateway({
  namespace: '/dashboard',
  cors: { origin: true, credentials: true },
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DashboardGateway.name);

  /** userId -> Set<Socket>: un usuario puede tener varias pestañas/dispositivos. */
  private readonly conexiones = new Map<string, Set<Socket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.warn('Conexión dashboard rechazada: token faltante');
      socket.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const userId = payload.sub;

      if (!this.conexiones.has(userId)) {
        this.conexiones.set(userId, new Set());
      }
      this.conexiones.get(userId)!.add(socket);

      // Guardamos el userId en el socket para poder limpiarlo al desconectar.
      socket.data.userId = userId;

      this.logger.log(`Dashboard conectado — usuario: ${userId}`);
    } catch {
      this.logger.warn('Conexión dashboard rechazada: token inválido o expirado');
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;

    const sockets = this.conexiones.get(userId);
    if (!sockets) return;

    sockets.delete(socket);
    if (sockets.size === 0) {
      this.conexiones.delete(userId);
    }

    this.logger.log(`Dashboard desconectado — usuario: ${userId}`);
  }

  /**
   * Emite un evento a todos los sockets activos de un usuario.
   * Si el usuario no tiene ninguna conexión (dashboard cerrado), no hace nada:
   * no se encola ni se reintenta (DNF2).
   */
  emitirAUsuario(userId: string, evento: string, payload: unknown): void {
    const sockets = this.conexiones.get(userId);
    if (!sockets) return;

    for (const socket of sockets) {
      socket.emit(evento, payload);
    }
  }
}
