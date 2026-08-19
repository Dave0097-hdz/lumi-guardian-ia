import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface RegistrarAuditLogParams {
  vpsId?: string;
  userId?: string;
  entidad: string;
  entidadId?: string;
  accion: string;
  datosAntes?: Record<string, unknown>;
  datosDespues?: Record<string, unknown>;
  ipRequest?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: RegistrarAuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        vpsId: params.vpsId,
        userId: params.userId,
        entidad: params.entidad,
        entidadId: params.entidadId,
        accion: params.accion,
        datosAntes: params.datosAntes as Prisma.InputJsonValue ?? undefined,
        datosDespues: params.datosDespues as Prisma.InputJsonValue ?? undefined,
        ipRequest: params.ipRequest,
      },
    });
  }
}
