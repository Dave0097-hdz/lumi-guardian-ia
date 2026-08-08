import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoVPS, ProveedorVPS } from '@prisma/client';

export class VpsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  sistemaOperativo!: string;

  @ApiProperty({ enum: ProveedorVPS })
  proveedor!: ProveedorVPS;

  @ApiProperty({ enum: EstadoVPS })
  estado!: EstadoVPS;

  @ApiPropertyOptional()
  agenteVersion?: string | null;

  @ApiPropertyOptional()
  ultimoHeartbeat?: Date | null;

  @ApiPropertyOptional()
  descripcion?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
