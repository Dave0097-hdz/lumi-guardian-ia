import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type EstadoAgente = 'bloqueada' | 'ya_bloqueada' | 'desbloqueada' | 'no_existia' | 'error';

export interface RespuestaAgente {
  bloqueoId: string;
  estado: EstadoAgente;
  mensaje: string;
}

interface PendienteEntry {
  resolve: (r: RespuestaAgente | null) => void;
  timeout: NodeJS.Timeout;
}

@WebSocketGateway({ namespace: '/agents' })
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AgentGateway.name);
  private conexiones = new Map<string, Socket>();
  private pendientes = new Map<string, PendienteEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(socket: Socket): Promise<void> {
    const vpsId = socket.handshake.headers['x-lumi-vps-id'] as string | undefined;
    const authHeader = socket.handshake.headers['authorization'] as string | undefined;

    if (!vpsId || !authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Conexión WS rechazada: headers faltantes');
      socket.disconnect(true);
      return;
    }

    const token = authHeader.slice(7);
    if (!token) {
      socket.disconnect(true);
      return;
    }

    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, deletedAt: null },
    });

    if (!vps) {
      this.logger.warn(`Conexión WS rechazada: VPS ${vpsId} no encontrado`);
      socket.disconnect(true);
      return;
    }

    const tokenValid = await bcrypt.compare(token, vps.agentTokenHash);
    if (!tokenValid) {
      this.logger.warn(`Conexión WS rechazada: token inválido para VPS ${vpsId}`);
      socket.disconnect(true);
      return;
    }

    this.conexiones.set(vpsId, socket);
    this.logger.log(`Agente conectado por WS — VPS: ${vpsId}`);
  }

  handleDisconnect(socket: Socket): void {
    for (const [vpsId, s] of this.conexiones.entries()) {
      if (s.id === socket.id) {
        this.conexiones.delete(vpsId);
        this.logger.log(`Agente desconectado — VPS: ${vpsId}`);
        break;
      }
    }
  }

  @SubscribeMessage('bloqueo-resultado')
  handleBloqueoResultado(
    @MessageBody() data: RespuestaAgente,
    @ConnectedSocket() _socket: Socket,
  ): void {
    this.resolverPendiente(data);
  }

  @SubscribeMessage('desbloqueo-resultado')
  handleDesbloqueoResultado(
    @MessageBody() data: RespuestaAgente,
    @ConnectedSocket() _socket: Socket,
  ): void {
    this.resolverPendiente(data);
  }

  /**
   * Emite una orden al agente y espera su respuesta.
   * Retorna null si no hay conexión activa o si el agente no responde en 5s.
   */
  async enviarOrden(
    vpsId: string,
    evento: 'bloquear-ip' | 'desbloquear-ip',
    payload: { bloqueoId: string; ip: string; motivo?: string },
  ): Promise<RespuestaAgente | null> {
    const socket = this.conexiones.get(vpsId);
    if (!socket) {
      return null;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendientes.delete(payload.bloqueoId);
        resolve(null);
      }, 5000);

      this.pendientes.set(payload.bloqueoId, { resolve, timeout });
      socket.emit(evento, payload);
    });
  }

  /** Verifica si hay una conexión activa para un VPS */
  isConnected(vpsId: string): boolean {
    return this.conexiones.has(vpsId);
  }

  private resolverPendiente(data: RespuestaAgente): void {
    const p = this.pendientes.get(data.bloqueoId);
    if (p) {
      clearTimeout(p.timeout);
      p.resolve(data);
      this.pendientes.delete(data.bloqueoId);
    }
  }
}
