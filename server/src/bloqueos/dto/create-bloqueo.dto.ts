import { IsUUID, IsIP, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBloqueoDto {
  @ApiProperty({ description: 'UUID del VPS donde aplicar el bloqueo' })
  @IsUUID()
  vpsId!: string;

  @ApiProperty({ example: '203.0.113.50', description: 'IP a bloquear (IPv4 o IPv6)' })
  @IsIP()
  ip!: string;

  @ApiProperty({ example: 'BRUTE_FORCE detectado — bloqueo manual', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  motivo!: string;

  @ApiPropertyOptional({ description: 'UUID de la alerta que originó este bloqueo' })
  @IsUUID()
  @IsOptional()
  alertaId?: string;
}
