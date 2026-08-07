import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Variables de entorno accesibles globalmente vía ConfigService
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting global: 60 requests por minuto por defecto
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),

    // Módulos del dominio
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule { }
