import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BloqueosService } from './bloqueos.service';
import { CreateBloqueoDto } from './dto/create-bloqueo.dto';
import { QueryBloqueosDto } from './dto/query-bloqueos.dto';

@ApiTags('bloqueos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bloqueos')
export class BloqueosController {
  constructor(private readonly bloqueosService: BloqueosService) { }

  @Post()
  @ApiOperation({ summary: 'Bloquear IP manualmente desde el dashboard' })
  @ApiResponse({ status: 201, description: 'Bloqueo ejecutado o retornado si ya existía' })
  @ApiResponse({ status: 404, description: 'VPS no encontrado' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateBloqueoDto,
  ) {
    return this.bloqueosService.ejecutarBloqueo(
      dto.vpsId,
      dto.ip,
      dto.motivo,
      { userId: user.userId, alertaId: dto.alertaId },
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desbloquear IP (por UUID del bloqueo, nunca por IP en la ruta)' })
  @ApiResponse({ status: 200, description: 'IP desbloqueada' })
  @ApiResponse({ status: 404, description: 'Bloqueo no encontrado o agente no respondió' })
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bloqueosService.ejecutarDesbloqueo(id, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Historial paginado de bloqueos' })
  @ApiResponse({ status: 200, description: 'Lista paginada de bloqueos' })
  async findAll(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryBloqueosDto,
  ) {
    return this.bloqueosService.findAll(user.userId, query);
  }
}
