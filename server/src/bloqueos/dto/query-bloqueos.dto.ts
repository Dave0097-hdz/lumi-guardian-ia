import { IsOptional, IsUUID, IsIP, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoBloqueo } from '@prisma/client';

export class QueryBloqueosDto {
  @ApiPropertyOptional({ description: 'Filtrar por VPS' })
  @IsUUID()
  @IsOptional()
  vpsId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por IP' })
  @IsIP()
  @IsOptional()
  ip?: string;

  @ApiPropertyOptional({ enum: EstadoBloqueo })
  @IsEnum(EstadoBloqueo)
  @IsOptional()
  estado?: EstadoBloqueo;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
