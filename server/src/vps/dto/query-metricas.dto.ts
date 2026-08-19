import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type Periodo = '1h' | '24h' | '7d' | '30d';

export class QueryMetricasDto {
  @ApiPropertyOptional({
    enum: ['1h', '24h', '7d', '30d'],
    default: '24h',
    description: 'Período de tiempo para la consulta',
  })
  @IsIn(['1h', '24h', '7d', '30d'])
  @IsOptional()
  periodo?: Periodo = '24h';
}
