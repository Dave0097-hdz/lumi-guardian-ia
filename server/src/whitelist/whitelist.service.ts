import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { CreateWhitelistDto } from './dto/create-whitelist.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WhitelistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) { }

  async create(userId: string, dto: CreateWhitelistDto) {
    if (dto.vpsId) {
      const vps = await this.prisma.vPS.findFirst({
        where: { id: dto.vpsId, userId, deletedAt: null },
      });
      if (!vps) {
        throw new NotFoundException('VPS no encontrado');
      }
    }

    try {
      const entrada = await this.prisma.whitelistIP.create({
        data: {
          userId,
          vpsId: dto.vpsId ?? null,
          ip: dto.ip,
          motivo: dto.motivo ?? null,
        },
      });

      await this.auditLog.registrar({
        userId,
        vpsId: dto.vpsId,
        entidad: 'WhitelistIP',
        entidadId: entrada.id,
        accion: 'whitelist_ip_agregada',
        datosDespues: { ip: dto.ip, motivo: dto.motivo, vpsId: dto.vpsId ?? 'global' },
      });

      return entrada;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esta IP ya está en la whitelist para este alcance',
        );
      }
      throw e;
    }
  }

  async findAll(userId: string, vpsId?: string) {
    return this.prisma.whitelistIP.findMany({
      where: { userId, ...(vpsId ? { vpsId } : {}) },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const entrada = await this.prisma.whitelistIP.findFirst({
      where: { id, userId },
    });

    if (!entrada) {
      throw new NotFoundException('Entrada de whitelist no encontrada');
    }

    await this.prisma.whitelistIP.delete({ where: { id } });

    await this.auditLog.registrar({
      userId,
      vpsId: entrada.vpsId ?? undefined,
      entidad: 'WhitelistIP',
      entidadId: id,
      accion: 'whitelist_ip_removida',
      datosAntes: { ip: entrada.ip, motivo: entrada.motivo },
    });

    return { message: 'IP removida de la whitelist' };
  }
}
