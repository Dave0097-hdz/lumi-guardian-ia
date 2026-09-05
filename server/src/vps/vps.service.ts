import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateVpsDto } from './dto/create-vps.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class VpsService {
  private readonly logger = new Logger(VpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
  ) { }

  async create(userId: string, dto: CreateVpsDto) {
    // Verificar duplicado solo entre VPS activos (no soft-deleted)
    const existing = await this.prisma.vPS.findFirst({
      where: { userId, ip: dto.ip, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(
        `Ya tienes un VPS activo registrado con la IP ${dto.ip}`,
      );
    }

    // Generar agentToken
    const agentTokenPlain = crypto.randomBytes(32).toString('hex');
    const saltRounds = this.config.get<number>('bcrypt.saltRounds') ?? 12;
    const agentTokenHash = await bcrypt.hash(agentTokenPlain, saltRounds);

    const vps = await this.prisma.$transaction(async (tx) => {
      const newVps = await tx.vPS.create({
        data: {
          userId,
          nombre: dto.nombre,
          ip: dto.ip,
          sistemaOperativo: dto.sistemaOperativo,
          proveedor: dto.proveedor,
          descripcion: dto.descripcion,
          agentTokenHash,
        },
      });

      // Crear Configuracion default (1:1 con VPS) en la misma transacción.
      // severidadesNotif arranca con ALTA + CRITICA para que el toggle notifEmail
      // (activo por defecto) envíe correos desde el alta sin requerir configuración
      // manual — sin llenar la bandeja con alertas triviales (BAJA/MEDIA).
      await tx.configuracion.create({
        data: {
          vpsId: newVps.id,
          severidadesNotif: ['ALTA', 'CRITICA'],
        },
      });

      return newVps;
    });

    const installScript = this.generateInstallScript(
      vps.id,
      agentTokenPlain,
    );

    return {
      vps: this.toResponse(vps),
      agentToken: agentTokenPlain,
      installScript,
    };
  }

  async findAllByUser(userId: string) {
    const vpsList = await this.prisma.vPS.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return vpsList.map((vps) => this.toResponse(vps));
  }

  async findOneByUser(vpsId: string, userId: string) {
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
    }

    return this.toResponse(vps);
  }

  async softDelete(vpsId: string, userId: string) {
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
    }

    await this.prisma.vPS.update({
      where: { id: vpsId },
      data: {
        deletedAt: new Date(),
        estado: 'ELIMINADO',
      },
    });

    await this.auditLog.registrar({
      vpsId,
      userId,
      entidad: 'VPS',
      entidadId: vpsId,
      accion: 'vps_eliminado',
      datosAntes: { nombre: vps.nombre, ip: vps.ip, estado: vps.estado },
      datosDespues: { estado: 'ELIMINADO' },
    });

    return { message: 'VPS eliminado correctamente' };
  }

  async regenerateToken(vpsId: string, userId: string) {
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
    }

    const agentTokenPlain = crypto.randomBytes(32).toString('hex');
    const saltRounds = this.config.get<number>('bcrypt.saltRounds') ?? 12;
    const agentTokenHash = await bcrypt.hash(agentTokenPlain, saltRounds);

    await this.prisma.vPS.update({
      where: { id: vpsId },
      data: { agentTokenHash },
    });

    const installScript = this.generateInstallScript(vpsId, agentTokenPlain);

    await this.auditLog.registrar({
      vpsId,
      userId,
      entidad: 'VPS',
      entidadId: vpsId,
      accion: 'agent_token_regenerado',
    });

    this.logger.log(`Token regenerado para VPS ${vpsId}`);

    return {
      agentToken: agentTokenPlain,
      installScript,
    };
  }

  async getMetricas(vpsId: string, userId: string, periodo: '1h' | '24h' | '7d' | '30d' = '24h') {
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
    }

    const desde = this.calcularDesde(periodo);

    // Obtener métricas (máx 1000, más recientes primero para aplicar el límite)
    const datos = await this.prisma.metrica.findMany({
      where: { vpsId, registradoEn: { gte: desde } },
      orderBy: { registradoEn: 'desc' },
      take: 1000,
    });
    datos.reverse(); // Entregar ascendente (más antiguo primero, para graficar)

    // Resumen en paralelo
    const [totalAlertas, ipsBloqueadas, agregadosCpu] = await Promise.all([
      this.prisma.alerta.count({
        where: { vpsId, detectadoEn: { gte: desde } },
      }),
      this.prisma.bloqueo.count({
        where: { vpsId, estado: 'BLOQUEADO' },
      }),
      this.prisma.metrica.aggregate({
        where: { vpsId, registradoEn: { gte: desde } },
        _avg: { cpuPorcentaje: true },
      }),
    ]);

    const ramPromedio = datos.length
      ? datos.reduce((acc, m) => acc + (m.ramUsadaMB / m.ramTotalMB) * 100, 0) / datos.length
      : 0;

    return {
      vpsId,
      periodo,
      datos,
      resumen: {
        totalAlertas,
        ipsBloqueadas,
        cpuPromedio: agregadosCpu._avg.cpuPorcentaje ?? 0,
        ramPromedio: Math.round(ramPromedio * 10) / 10,
      },
    };
  }

  // ─── PRIVADOS ────────────────────────────────

  private calcularDesde(periodo: '1h' | '24h' | '7d' | '30d'): Date {
    const ahora = new Date();
    const horas: Record<string, number> = { '1h': 1, '24h': 24, '7d': 24 * 7, '30d': 24 * 30 };
    return new Date(ahora.getTime() - horas[periodo] * 60 * 60 * 1000);
  }

  private generateInstallScript(vpsId: string, agentToken: string): string {
    const publicUrl = this.config.get<string>('app.publicUrl');

    if (!publicUrl) {
      throw new InternalServerErrorException(
        'LUMI_PUBLIC_URL no está configurada en el backend. No se puede generar el script de instalación.',
      );
    }

    return [
      '#!/bin/bash',
      '# LUMI Guardian Agent - Install Script',
      `# Generated: ${new Date().toISOString()}`,
      '',
      `export LUMI_VPS_ID="${vpsId}"`,
      `export LUMI_AGENT_TOKEN="${agentToken}"`,
      `export LUMI_BACKEND_URL="${publicUrl}"`,
      '',
      '# TODO: instrucciones de descarga e instalación del agente',
      'curl -fsSL "${LUMI_BACKEND_URL}/agent/install" | sudo -E bash',
    ].join('\n');
  }

  private toResponse(vps: {
    id: string;
    nombre: string;
    ip: string;
    sistemaOperativo: string;
    proveedor: string;
    estado: string;
    agenteVersion: string | null;
    ultimoHeartbeat: Date | null;
    descripcion: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: vps.id,
      nombre: vps.nombre,
      ip: vps.ip,
      sistemaOperativo: vps.sistemaOperativo,
      proveedor: vps.proveedor,
      estado: vps.estado,
      agenteVersion: vps.agenteVersion,
      ultimoHeartbeat: vps.ultimoHeartbeat,
      descripcion: vps.descripcion,
      createdAt: vps.createdAt,
      updatedAt: vps.updatedAt,
    };
  }
}
