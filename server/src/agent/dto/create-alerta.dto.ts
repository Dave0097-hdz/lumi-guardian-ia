import {
  IsEnum,
  IsString,
  IsOptional,
  IsIP,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAlerta, SeveridadAlerta } from '@prisma/client';

export class CreateAlertaDto {
  @ApiProperty({ enum: TipoAlerta, example: 'BRUTE_FORCE' })
  @IsEnum(TipoAlerta)
  tipo!: TipoAlerta;

  @ApiProperty({ enum: SeveridadAlerta, example: 'CRITICA' })
  @IsEnum(SeveridadAlerta)
  severidad!: SeveridadAlerta;

  @ApiPropertyOptional({ example: '192.168.1.50' })
  @IsIP()
  @IsOptional()
  ipOrigen?: string;

  @ApiPropertyOptional({ example: 'T1110.001', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  tecnicaMitre?: string;

  @ApiPropertyOptional({ example: 'RU', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paisOrigen?: string;

  @ApiProperty({ example: 'Se detectaron 5 intentos de acceso SSH en menos de 5 minutos.' })
  @IsString()
  descripcionSimple!: string;

  @ApiProperty({ example: 'ssh_brute_force_burst detectado por el monitor ssh' })
  @IsString()
  descripcionTecnica!: string;

  @ApiProperty({ example: { attacker_ip: '192.168.1.50', intentos: 5 } })
  @IsObject()
  evidencia!: Record<string, unknown>;
}
