import {
  IsString,
  IsIP,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProveedorVPS } from '@prisma/client';

export class CreateVpsDto {
  @ApiProperty({ example: 'Servidor Producción MX' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  nombre!: string;

  @ApiProperty({ example: '192.168.1.100', description: 'IPv4 o IPv6 del servidor' })
  @IsIP()
  ip!: string;

  @ApiProperty({ example: 'Ubuntu 22.04 LTS' })
  @IsString()
  @MaxLength(100)
  sistemaOperativo!: string;

  @ApiProperty({ enum: ProveedorVPS, example: 'DIGITAL_OCEAN' })
  @IsEnum(ProveedorVPS)
  proveedor!: ProveedorVPS;

  @ApiPropertyOptional({ example: 'Servidor principal de la tienda online' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
