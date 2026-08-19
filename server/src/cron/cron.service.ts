import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Cada 60 segundos: detecta VPS con estado ACTIVO cuyo último heartbeat
   * tiene más de 2 minutos de antigüedad y los marca como DESCONECTADO.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async detectarVpsDesconectados(): Promise<void> {
    try {
      const limite = new Date(Date.now() - 2 * 60 * 1000);

      const vpsDesconectados = await this.prisma.vPS.findMany({
        where: {
          estado: 'ACTIVO',
          ultimoHeartbeat: { lt: limite },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (vpsDesconectados.length === 0) return;

      await this.prisma.vPS.updateMany({
        where: { id: { in: vpsDesconectados.map((v) => v.id) } },
        data: { estado: 'DESCONECTADO' },
      });

      for (const vps of vpsDesconectados) {
        await this.auditLog.registrar({
          vpsId: vps.id,
          entidad: 'VPS',
          entidadId: vps.id,
          accion: 'vps_desconectado_automatico',
        });
      }

      this.logger.log(
        `${vpsDesconectados.length} VPS marcados como DESCONECTADO`,
      );
    } catch (e) {
      this.logger.error('Error en detección de VPS desconectados', e);
    }
  }

  /**
   * Diario a medianoche: elimina tokens expirados de RefreshToken y RevokedToken.
   * Evita acumulación indefinida en la BD.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async limpiarTokensExpirados(): Promise<void> {
    try {
      const ahora = new Date();

      const [refresh, revoked] = await Promise.all([
        this.prisma.refreshToken.deleteMany({
          where: { expiresAt: { lt: ahora } },
        }),
        this.prisma.revokedToken.deleteMany({
          where: { expiresAt: { lt: ahora } },
        }),
      ]);

      this.logger.log(
        `Limpieza de tokens: ${refresh.count} refresh, ${revoked.count} revoked eliminados`,
      );
    } catch (e) {
      this.logger.error('Error en limpieza de tokens', e);
    }
  }

  /**
   * Diario a la 1:00 AM: elimina métricas con más de 30 días de antigüedad.
   * Estrategia v1 de retención (ver database.md sección de retención).
   */
  @Cron('0 1 * * *')
  async aplicarRetencionMetricas(): Promise<void> {
    try {
      const RETENCION_DIAS = 30;
      const limite = new Date(
        Date.now() - RETENCION_DIAS * 24 * 60 * 60 * 1000,
      );

      const resultado = await this.prisma.metrica.deleteMany({
        where: { registradoEn: { lt: limite } },
      });

      this.logger.log(
        `Retención de métricas: ${resultado.count} registros eliminados (> ${RETENCION_DIAS} días)`,
      );
    } catch (e) {
      this.logger.error('Error en retención de métricas', e);
    }
  }
}
