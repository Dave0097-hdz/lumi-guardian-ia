import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) { }

  async findByVps(vpsId: string, userId: string) {
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
      include: { configuracion: true },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
    }

    if (!vps.configuracion) {
      throw new NotFoundException('Configuración no encontrada para este VPS');
    }

    return vps.configuracion;
  }

  async update(vpsId: string, userId: string, dto: UpdateConfiguracionDto) {
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
    }

    const existing = await this.prisma.configuracion.findUnique({
      where: { vpsId },
    });

    if (!existing) {
      throw new NotFoundException(
        'Configuración no encontrada para este VPS. Si el VPS fue creado antes de esta funcionalidad, contacte soporte.',
      );
    }

    const configuracion = await this.prisma.configuracion.update({
      where: { vpsId },
      data: {
        ...(dto.nivelAutonomia !== undefined && { nivelAutonomia: dto.nivelAutonomia }),
        ...(dto.notifEmail !== undefined && { notifEmail: dto.notifEmail }),
        ...(dto.notifDashboard !== undefined && { notifDashboard: dto.notifDashboard }),
        ...(dto.severidadesNotif !== undefined && { severidadesNotif: dto.severidadesNotif }),
        ...(dto.umbralCpuAlerta !== undefined && { umbralCpuAlerta: dto.umbralCpuAlerta }),
        ...(dto.umbralRamAlerta !== undefined && { umbralRamAlerta: dto.umbralRamAlerta }),
      },
    });

    // Auditar cambio de configuración (especialmente nivelAutonomia)
    await this.auditLog.registrar({
      vpsId,
      userId,
      entidad: 'Configuracion',
      entidadId: configuracion.id,
      accion: 'configuracion_actualizada',
      datosAntes: {
        nivelAutonomia: existing.nivelAutonomia,
        umbralCpuAlerta: existing.umbralCpuAlerta,
        umbralRamAlerta: existing.umbralRamAlerta,
        notifEmail: existing.notifEmail,
        notifDashboard: existing.notifDashboard,
      },
      datosDespues: {
        nivelAutonomia: configuracion.nivelAutonomia,
        umbralCpuAlerta: configuracion.umbralCpuAlerta,
        umbralRamAlerta: configuracion.umbralRamAlerta,
        notifEmail: configuracion.notifEmail,
        notifDashboard: configuracion.notifDashboard,
      },
    });

    return configuracion;
  }
}
