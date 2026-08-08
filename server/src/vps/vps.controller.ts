import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
import { VpsService } from './vps.service';
import { CreateVpsDto } from './dto/create-vps.dto';

@ApiTags('vps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vps')
export class VpsController {
  constructor(private readonly vpsService: VpsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar nuevo VPS — devuelve agentToken una sola vez',
  })
  @ApiResponse({ status: 201, description: 'VPS creado con token y script' })
  @ApiResponse({ status: 409, description: 'IP ya registrada para este usuario' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateVpsDto,
  ) {
    return this.vpsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar VPS del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de VPS' })
  async findAll(@CurrentUser() user: { userId: string }) {
    return this.vpsService.findAllByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un VPS' })
  @ApiResponse({ status: 200, description: 'VPS encontrado' })
  @ApiResponse({ status: 404, description: 'VPS no encontrado' })
  async findOne(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vpsService.findOneByUser(id, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar VPS (soft delete)' })
  @ApiResponse({ status: 200, description: 'VPS eliminado' })
  @ApiResponse({ status: 404, description: 'VPS no encontrado' })
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vpsService.softDelete(id, user.userId);
  }

  @Post(':id/regenerate-token')
  @ApiOperation({
    summary: 'Regenerar agentToken — invalida el anterior, devuelve nuevo token + script',
  })
  @ApiResponse({ status: 201, description: 'Token regenerado' })
  @ApiResponse({ status: 404, description: 'VPS no encontrado' })
  async regenerateToken(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vpsService.regenerateToken(id, user.userId);
  }
}
