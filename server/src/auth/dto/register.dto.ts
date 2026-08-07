import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  nombre!: string;

  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  // Mínimo 8 chars, al menos: 1 mayúscula, 1 número, 1 símbolo
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt trunca a 72 bytes — no tiene sentido aceptar más
  @Matches(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
    {
      message:
        'La contraseña debe incluir al menos una mayúscula, un número y un símbolo',
    },
  )
  password!: string;
}
