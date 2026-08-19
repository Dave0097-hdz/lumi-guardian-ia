import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) { }

  async registrar(params: RegistrarAuditLogParams): Promise<void> {
    try {
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
    } catch (error) {
      this.logger.error(
        `Fallo al registrar audit log (accion: ${params.accion}, entidad: ${params.entidad}): ${error}`,
      );
      // No propaga — un fallo de auditoría no debe tumbar la operación que sí funcionó
    }
  }
}
