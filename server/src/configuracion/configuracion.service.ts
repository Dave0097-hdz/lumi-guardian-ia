import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async findByVps(vpsId: string, userId: string) {
    // Validar ownership: el VPS debe pertenecer al usuario
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
    // Validar ownership
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, userId, deletedAt: null },
    });

    if (!vps) {
      throw new NotFoundException('VPS no encontrado');
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

    return configuracion;
  }
}
