import { IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryWhitelistDto {
  @ApiPropertyOptional({ description: 'Filtrar por VPS específico' })
  @IsUUID()
  @IsOptional()
  vpsId?: string;
}
