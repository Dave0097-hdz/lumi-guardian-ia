import {
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NivelAutonomia, SeveridadAlerta } from '@prisma/client';

export class UpdateConfiguracionDto {
  @ApiPropertyOptional({ enum: NivelAutonomia, example: 'SOLO_ALERTAR' })
  @IsEnum(NivelAutonomia)
  @IsOptional()
  nivelAutonomia?: NivelAutonomia;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  notifEmail?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  notifDashboard?: boolean;

  @ApiPropertyOptional({
    enum: SeveridadAlerta,
    isArray: true,
    example: ['ALTA', 'CRITICA'],
  })
  @IsArray()
  @IsEnum(SeveridadAlerta, { each: true })
  @IsOptional()
  severidadesNotif?: SeveridadAlerta[];

  @ApiPropertyOptional({ example: 85, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  umbralCpuAlerta?: number;

  @ApiPropertyOptional({ example: 90, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  umbralRamAlerta?: number;
}
