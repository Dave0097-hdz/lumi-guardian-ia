import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AgentTokenGuard } from './guards/agent-token.guard';
import { CurrentVps } from '../common/decorators/current-vps.decorator';
import { AgentService } from './agent.service';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { CreateMetricaDto } from './dto/create-metrica.dto';
import { CreateAlertaDto } from './dto/create-alerta.dto';
import { VPS } from '@prisma/client';

@ApiTags('agent')
@ApiHeader({ name: 'X-Lumi-Vps-Id', required: true, description: 'UUID del VPS' })
@ApiHeader({ name: 'Authorization', required: true, description: 'Bearer <agentToken>' })
@UseGuards(AgentTokenGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Heartbeat del agente — actualiza ultimoHeartbeat y agenteVersion' })
  @ApiResponse({ status: 200, description: 'Heartbeat registrado' })
  @ApiResponse({ status: 401, description: 'Token de agente inválido' })
  async heartbeat(
    @CurrentVps() vps: VPS,
    @Body() dto: HeartbeatDto,
  ) {
    return this.agentService.heartbeat(vps, dto);
  }

  @Post('metricas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Persiste una métrica del sistema enviada por el agente' })
  @ApiResponse({ status: 201, description: 'Métrica registrada' })
  @ApiResponse({ status: 401, description: 'Token de agente inválido' })
  async createMetrica(
    @CurrentVps() vps: VPS,
    @Body() dto: CreateMetricaDto,
  ) {
    return this.agentService.createMetrica(vps, dto);
  }

  @Post('alertas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Persiste una alerta de seguridad detectada por el agente' })
  @ApiResponse({ status: 201, description: 'Alerta creada con accionTomada según configuración de autonomía' })
  @ApiResponse({ status: 401, description: 'Token de agente inválido' })
  async createAlerta(
    @CurrentVps() vps: VPS,
    @Body() dto: CreateAlertaDto,
  ) {
    return this.agentService.createAlerta(vps, dto);
  }
}
