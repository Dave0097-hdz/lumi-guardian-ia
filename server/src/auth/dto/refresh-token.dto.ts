import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token (opcional si se envía como cookie HttpOnly). La cookie tiene prioridad.',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
