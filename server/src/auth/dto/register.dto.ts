import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'David Hernández', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  nombre!: string;

  @ApiProperty({ example: 'david@lumi.dev', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({
    example: 'MiPassword123!',
    minLength: 8,
    maxLength: 72,
    description: 'Mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 símbolo',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
    {
      message:
        'La contraseña debe incluir al menos una mayúscula, un número y un símbolo',
    },
  )
  password!: string;
}
