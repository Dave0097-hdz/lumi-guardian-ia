import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check — valida conexión a PostgreSQL' })
  @ApiResponse({
    status: 200,
    description: 'Backend y base de datos operativos',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        db: { type: 'string', example: 'connected' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Base de datos no disponible',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        db: { type: 'string', example: 'disconnected' },
      },
    },
  })
  async check(): Promise<{ status: string; db: string }> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      throw new HttpException(
        { status: 'error', db: 'disconnected' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
