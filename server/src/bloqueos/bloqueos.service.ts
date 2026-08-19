import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentGateway, RespuestaAgente } from '../agent/agent.gateway';
import { AuditLogService } from '../common/services/audit-log.service';
import { QueryBloqueosDto } from './dto/query-bloqueos.dto';
import { EstadoBloqueo, Prisma } from '@prisma/client';
import * as crypto from 'crypto';

type EstadoAgente = 'bloqueada' | 'ya_bloqueada' | 'desbloqueada' | 'no_existia' | 'error';

const MAPA_ESTADO_BLOQUEO: Record<EstadoAgente, EstadoBloqueo> = {
  bloqueada: 'BLOQUEADO' as EstadoBloqueo,
  ya_bloqueada: 'BLOQUEADO' as EstadoBloqueo,
  desbloqueada: 'DESBLOQUEADO' as EstadoBloqueo,
  no_existia: 'DESBLOQUEADO' as EstadoBloqueo,
  error: 'FALLIDO' as EstadoBloqueo,
};

@Injectable()
export class BloqueosService {
  private readonly logger = new Logger(BloqueosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentGateway: AgentGateway,
    private readonly auditLog: AuditLogService,
  ) { }

  async ejecutarBloqueo(
    vpsId: string,
    ip: string,
    motivo: string,
    opciones: { userId?: string; alertaId?: string },
  ) {
    // 0. Validar ownership si es bloqueo manual (con userId)
    if (opciones.userId) {
      const vps = await this.prisma.vPS.findFirst({
        where: { id: vpsId, userId: opciones.userId, deletedAt: null },
      });
      if (!vps) {
        throw new NotFoundException('VPS no encontrado');
      }
    }

    // 1. Whitelist — global (vpsId null) o específica de este VPS
    const enWhitelist = await this.prisma.whitelistIP.findFirst({
      where: {
        ip,
        OR: [
          { vpsId },
          { vpsId: null, userId: opciones.userId ?? undefined },
        ],
      },
    });

    if (enWhitelist) {
      await this.auditLog.registrar({
        vpsId,
        userId: opciones.userId,
        entidad: 'Bloqueo',
        accion: 'bloqueo_omitido_whitelist',
        datosDespues: { ip, motivoWhitelist: enWhitelist.motivo } as Record<string, unknown>,
      });
      this.logger.log(`Bloqueo omitido — IP ${ip} está en whitelist para VPS ${vpsId}`);
      return null;
    }

    // 2. Idempotencia — ¿ya hay un bloqueo activo para esta IP en este VPS?
    const existente = await this.prisma.bloqueo.findFirst({
      where: { vpsId, ip, estado: 'BLOQUEADO' },
    });
    if (existente) {
      this.logger.log(`Bloqueo ya existente para IP ${ip} en VPS ${vpsId}`);
      return existente;
    }

    // 3. Verificar conexión WebSocket activa
    const bloqueoId = crypto.randomUUID();

    // 4. Emitir orden y esperar resultado (5s timeout)
    const respuesta = await this.agentGateway.enviarOrden(vpsId, 'bloquear-ip', {
      bloqueoId,
      ip,
      motivo,
    });

    // 5-6. Mapear y persistir
    const estadoFinal: EstadoBloqueo = respuesta
      ? MAPA_ESTADO_BLOQUEO[respuesta.estado as EstadoAgente]
      : 'FALLIDO' as EstadoBloqueo;

    const motivoFinal = respuesta
      ? respuesta.estado === 'error'
        ? `${motivo} — ${respuesta.mensaje}`
        : motivo
      : `${motivo} — sin respuesta del agente (desconectado o timeout)`;

    const bloqueo = await this.prisma.bloqueo.create({
      data: {
        id: bloqueoId,
        vpsId,
        userId: opciones.userId ?? null,
        alertaId: opciones.alertaId ?? null,
        ip,
        tipo: 'PERMANENTE',
        estado: estadoFinal,
        motivo: motivoFinal,
        bloqueadoEn: estadoFinal === 'BLOQUEADO' ? new Date() : undefined,
      },
    });

    await this.auditLog.registrar({
      vpsId,
      userId: opciones.userId,
      entidad: 'Bloqueo',
      entidadId: bloqueo.id,
      accion: estadoFinal === 'BLOQUEADO' ? 'bloqueo_aplicado' : 'bloqueo_fallido',
      datosDespues: bloqueo as unknown as Record<string, unknown>,
    });

    this.logger.log(
      `Bloqueo ${bloqueoId} — IP: ${ip}, VPS: ${vpsId}, estado: ${estadoFinal}`,
    );

    return bloqueo;
  }

  async ejecutarDesbloqueo(bloqueoId: string, userId: string) {
    const bloqueo = await this.prisma.bloqueo.findFirst({
      where: {
        id: bloqueoId,
        estado: 'BLOQUEADO',
        vps: { userId, deletedAt: null },
      },
    });

    if (!bloqueo) {
      throw new NotFoundException('Bloqueo activo no encontrado');
    }

    const respuesta = await this.agentGateway.enviarOrden(
      bloqueo.vpsId,
      'desbloquear-ip',
      { bloqueoId: bloqueo.id, ip: bloqueo.ip },
    );

    if (respuesta && (respuesta.estado === 'desbloqueada' || respuesta.estado === 'no_existia')) {
      const updated = await this.prisma.bloqueo.update({
        where: { id: bloqueo.id },
        data: {
          estado: 'DESBLOQUEADO',
          desbloqueadoEn: new Date(),
        },
      });

      await this.auditLog.registrar({
        vpsId: bloqueo.vpsId,
        userId,
        entidad: 'Bloqueo',
        entidadId: bloqueo.id,
        accion: 'desbloqueo_aplicado',
        datosAntes: { estado: 'BLOQUEADO' },
        datosDespues: { estado: 'DESBLOQUEADO' },
      });

      return updated;
    }

    // Fallo en desbloqueo — no cambiamos el estado a DESBLOQUEADO
    const motivoFallo = respuesta
      ? `Desbloqueo fallido: ${respuesta.mensaje}`
      : 'Desbloqueo fallido — sin respuesta del agente (desconectado o timeout)';

    await this.auditLog.registrar({
      vpsId: bloqueo.vpsId,
      userId,
      entidad: 'Bloqueo',
      entidadId: bloqueo.id,
      accion: 'desbloqueo_fallido',
      datosDespues: { motivo: motivoFallo },
    });

    throw new NotFoundException(motivoFallo);
  }

  async findAll(userId: string, query: QueryBloqueosDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BloqueoWhereInput = {
      vps: { userId, deletedAt: null },
      ...(query.vpsId && { vpsId: query.vpsId }),
      ...(query.ip && { ip: query.ip }),
      ...(query.estado && { estado: query.estado }),
    };

    const [data, total] = await Promise.all([
      this.prisma.bloqueo.findMany({
        where,
        orderBy: { bloqueadoEn: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bloqueo.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
