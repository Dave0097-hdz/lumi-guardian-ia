import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { CreateMetricaDto } from './dto/create-metrica.dto';
import { CreateAlertaDto } from './dto/create-alerta.dto';
import { VPS, AccionTomada, Prisma } from '@prisma/client';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly prisma: PrismaService) { }

  async heartbeat(vps: VPS, dto: HeartbeatDto) {
    const updateData: Record<string, unknown> = {
      ultimoHeartbeat: new Date(),
    };

    // Actualizar agenteVersion si viene en el body
    if (dto.agenteVersion) {
      updateData.agenteVersion = dto.agenteVersion;
    }

    // Cambiar estado a ACTIVO si estaba pendiente o desconectado
    if (vps.estado === 'PENDIENTE_INSTALACION' || vps.estado === 'DESCONECTADO') {
      updateData.estado = 'ACTIVO';
    }

    await this.prisma.vPS.update({
      where: { id: vps.id },
      data: updateData,
    });

    return { ok: true, timestamp: new Date().toISOString() };
  }

  async createMetrica(vps: VPS, dto: CreateMetricaDto) {
    const metrica = await this.prisma.metrica.create({
      data: {
        vpsId: vps.id,
        cpuPorcentaje: dto.cpuPorcentaje,
        ramUsadaMB: dto.ramUsadaMB,
        ramTotalMB: dto.ramTotalMB,
        discoUsadaGB: dto.discoUsadaGB,
        discoTotalGB: dto.discoTotalGB,
        discoPorcentaje: dto.discoPorcentaje,
        requestsPorMinuto: dto.requestsPorMinuto,
        procesosActivos: dto.procesosActivos,
        conexionesActivas: dto.conexionesActivas,
        estadoGeneral: dto.estadoGeneral,
      },
    });

    return { id: metrica.id, registradoEn: metrica.registradoEn };
  }

  async createAlerta(vps: VPS, dto: CreateAlertaDto) {
    // Consultar configuración de autonomía del VPS
    const configuracion = await this.prisma.configuracion.findUnique({
      where: { vpsId: vps.id },
    });

    // Determinar accionTomada según nivelAutonomia
    let accionTomada: AccionTomada;
    switch (configuracion?.nivelAutonomia) {
      case 'GUARDIAN_TOTAL':
        accionTomada = 'BLOQUEADO_AUTOMATICAMENTE';
        // Fase futura: aquí se orquesta el bloqueo real vía UFW
        break;
      case 'SUGERIR':
        accionTomada = 'SUGERENCIA_ENVIADA';
        break;
      case 'SOLO_ALERTAR':
      default:
        accionTomada = 'NOTIFICADO';
        break;
    }

    const alerta = await this.prisma.alerta.create({
      data: {
        vpsId: vps.id,
        tipo: dto.tipo,
        severidad: dto.severidad,
        ipOrigen: dto.ipOrigen,
        tecnicaMitre: dto.tecnicaMitre,
        paisOrigen: dto.paisOrigen,
        descripcionSimple: dto.descripcionSimple,
        descripcionTecnica: dto.descripcionTecnica,
        evidencia: dto.evidencia as Prisma.InputJsonValue,
        accionTomada,
      },
    });

    this.logger.log(
      `Alerta ${alerta.id} creada para VPS ${vps.id} — tipo: ${dto.tipo}, accion: ${accionTomada}`,
    );

    return {
      id: alerta.id,
      detectadoEn: alerta.detectadoEn,
      accionTomada: alerta.accionTomada,
    };
  }
}
