import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAlertasDto } from './dto/query-alertas.dto';
import { UpdateEstadoAlertaDto } from './dto/update-estado-alerta.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AlertasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryAlertasDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Construir filtro dinámico — solo alertas de VPS del usuario
    const where: Prisma.AlertaWhereInput = {
      vps: { userId, deletedAt: null },
      ...(query.vpsId && { vpsId: query.vpsId }),
      ...(query.tipo && { tipo: query.tipo }),
      ...(query.severidad && { severidad: query.severidad }),
      ...(query.estado && { estado: query.estado }),
      ...(query.desde || query.hasta
        ? {
            detectadoEn: {
              ...(query.desde && { gte: new Date(query.desde) }),
              ...(query.hasta && { lte: new Date(query.hasta) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.alerta.findMany({
        where,
        orderBy: { detectadoEn: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          vpsId: true,
          tipo: true,
          severidad: true,
          ipOrigen: true,
          tecnicaMitre: true,
          paisOrigen: true,
          descripcionSimple: true,
          accionTomada: true,
          estado: true,
          detectadoEn: true,
          revisadoEn: true,
        },
      }),
      this.prisma.alerta.count({ where }),
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

  async findOne(alertaId: string, userId: string) {
    const alerta = await this.prisma.alerta.findFirst({
      where: {
        id: alertaId,
        vps: { userId, deletedAt: null },
      },
    });

    if (!alerta) {
      throw new NotFoundException('Alerta no encontrada');
    }

    return alerta;
  }

  async updateEstado(alertaId: string, userId: string, dto: UpdateEstadoAlertaDto) {
    // Validar ownership
    const alerta = await this.prisma.alerta.findFirst({
      where: {
        id: alertaId,
        vps: { userId, deletedAt: null },
      },
    });

    if (!alerta) {
      throw new NotFoundException('Alerta no encontrada');
    }

    const updated = await this.prisma.alerta.update({
      where: { id: alertaId },
      data: {
        estado: dto.estado,
        revisadoEn: dto.estado !== 'DETECTADA' ? new Date() : null,
      },
    });

    return updated;
  }
}
