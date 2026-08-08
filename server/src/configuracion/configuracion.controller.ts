import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
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
import { ConfiguracionService } from './configuracion.service';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@ApiTags('configuracion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vps/:id/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración de autonomía de un VPS' })
  @ApiResponse({ status: 200, description: 'Configuración del VPS' })
  @ApiResponse({ status: 404, description: 'VPS o configuración no encontrada' })
  async findByVps(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) vpsId: string,
  ) {
    return this.configuracionService.findByVps(vpsId, user.userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar configuración de autonomía de un VPS' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'VPS no encontrado' })
  async update(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) vpsId: string,
    @Body() dto: UpdateConfiguracionDto,
  ) {
    return this.configuracionService.update(vpsId, user.userId, dto);
  }
}
