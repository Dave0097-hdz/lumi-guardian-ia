import {
  Controller,
  Get,
  Put,
  Param,
  Body,
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
import { AlertasService } from './alertas.service';
import { QueryAlertasDto } from './dto/query-alertas.dto';
import { UpdateEstadoAlertaDto } from './dto/update-estado-alerta.dto';

@ApiTags('alertas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  @ApiOperation({
    summary: 'Historial paginado de alertas con filtros opcionales',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de alertas' })
  async findAll(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryAlertasDto,
  ) {
    return this.alertasService.findAll(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle completo de una alerta' })
  @ApiResponse({ status: 200, description: 'Alerta encontrada' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  async findOne(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.alertasService.findOne(id, user.userId);
  }

  @Put(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado de una alerta (revisada/falso positivo/resuelta)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  async updateEstado(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoAlertaDto,
  ) {
    return this.alertasService.updateEstado(id, user.userId, dto);
  }
}
