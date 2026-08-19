import {
  Controller,
  Post,
  Get,
  Delete,
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
import { WhitelistService } from './whitelist.service';
import { CreateWhitelistDto } from './dto/create-whitelist.dto';
import { QueryWhitelistDto } from './dto/query-whitelist.dto';

@ApiTags('whitelist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Post()
  @ApiOperation({ summary: 'Agregar IP a la whitelist (nunca se bloquea)' })
  @ApiResponse({ status: 201, description: 'IP agregada' })
  @ApiResponse({ status: 409, description: 'IP ya está en la whitelist' })
  @ApiResponse({ status: 404, description: 'VPS no encontrado' })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateWhitelistDto,
  ) {
    return this.whitelistService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar IPs en whitelist del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de IPs protegidas' })
  async findAll(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryWhitelistDto,
  ) {
    return this.whitelistService.findAll(user.userId, query.vpsId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar IP de la whitelist (por UUID)' })
  @ApiResponse({ status: 200, description: 'IP removida' })
  @ApiResponse({ status: 404, description: 'Entrada no encontrada' })
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.whitelistService.remove(id, user.userId);
  }
}
