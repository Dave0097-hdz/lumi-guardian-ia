import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoAlerta } from '@prisma/client';

export class UpdateEstadoAlertaDto {
  @ApiProperty({
    enum: ['REVISADA', 'FALSO_POSITIVO', 'RESUELTA'],
    description: 'Nuevo estado de la alerta',
    example: 'REVISADA',
  })
  @IsEnum(EstadoAlerta)
  estado!: EstadoAlerta;
}
