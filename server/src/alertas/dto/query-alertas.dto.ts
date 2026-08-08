import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipoAlerta, SeveridadAlerta, EstadoAlerta } from '@prisma/client';

export class QueryAlertasDto {
  @ApiPropertyOptional({ description: 'Filtrar por VPS' })
  @IsUUID()
  @IsOptional()
  vpsId?: string;

  @ApiPropertyOptional({ enum: TipoAlerta })
  @IsEnum(TipoAlerta)
  @IsOptional()
  tipo?: TipoAlerta;

  @ApiPropertyOptional({ enum: SeveridadAlerta })
  @IsEnum(SeveridadAlerta)
  @IsOptional()
  severidad?: SeveridadAlerta;

  @ApiPropertyOptional({ enum: EstadoAlerta })
  @IsEnum(EstadoAlerta)
  @IsOptional()
  estado?: EstadoAlerta;

  @ApiPropertyOptional({ description: 'Fecha inicio (ISO 8601)', example: '2026-08-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  desde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO 8601)', example: '2026-08-08T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  hasta?: string;

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
