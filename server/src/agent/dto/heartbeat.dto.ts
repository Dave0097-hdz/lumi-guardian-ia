import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class HeartbeatDto {
  @ApiPropertyOptional({ example: '1.0.0', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  agenteVersion?: string;
}
