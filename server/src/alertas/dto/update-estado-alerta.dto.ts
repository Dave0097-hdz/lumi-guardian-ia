import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEstadoAlertaDto {
  @ApiProperty({
    enum: ['REVISADA', 'FALSO_POSITIVO', 'RESUELTA'],
    description: 'Nuevo estado de la alerta (no se puede volver a DETECTADA manualmente)',
    example: 'REVISADA',
  })
  @IsIn(['REVISADA', 'FALSO_POSITIVO', 'RESUELTA'])
  estado!: 'REVISADA' | 'FALSO_POSITIVO' | 'RESUELTA';
}
