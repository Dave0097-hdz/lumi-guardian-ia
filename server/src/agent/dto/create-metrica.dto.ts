import { IsNumber, IsInt, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoGeneral } from '@prisma/client';

export class CreateMetricaDto {
  @ApiProperty({ example: 45.2 })
  @IsNumber()
  @Min(0)
  cpuPorcentaje!: number;

  @ApiProperty({ example: 1024.5 })
  @IsNumber()
  @Min(0)
  ramUsadaMB!: number;

  @ApiProperty({ example: 4096.0 })
  @IsNumber()
  @Min(0)
  ramTotalMB!: number;

  @ApiProperty({ example: 25.3 })
  @IsNumber()
  @Min(0)
  discoUsadaGB!: number;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  @Min(0)
  discoTotalGB!: number;

  @ApiProperty({ example: 50.6 })
  @IsNumber()
  @Min(0)
  discoPorcentaje!: number;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  requestsPorMinuto!: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  procesosActivos!: number;

  @ApiProperty({ example: 85 })
  @IsInt()
  @Min(0)
  conexionesActivas!: number;

  @ApiProperty({ enum: EstadoGeneral, example: 'SEGURO' })
  @IsEnum(EstadoGeneral)
  estadoGeneral!: EstadoGeneral;
}
