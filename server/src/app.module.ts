import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from 'config/configuration';
import { envValidationSchema } from 'config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Variables de entorno accesibles globalmente vía ConfigService
    ConfigModule.forRoot({ 
      isGlobal: true,
      load: [ configuration ],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      }, 
    }),

    // Rate limiting global: 60 requests por minuto por defecto
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.THROTTLE_TTL ??  '60000', 10),
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10)
          }
        ]
      })
    }),

    // Módulos del dominio
    PrismaModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule { }
