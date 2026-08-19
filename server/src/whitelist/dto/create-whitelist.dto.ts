import { IsIP, IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWhitelistDto {
  @ApiProperty({ example: '203.0.113.10', description: 'IP a proteger (IPv4 o IPv6, sin CIDR)' })
  @IsIP()
  ip!: string;

  @ApiPropertyOptional({ description: 'UUID del VPS. Si es null, aplica a todos los VPS del usuario.' })
  @IsUUID()
  @IsOptional()
  vpsId?: string;

  @ApiPropertyOptional({ example: 'IP de la oficina', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  motivo?: string;
}
