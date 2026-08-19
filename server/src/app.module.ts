import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from 'config/configuration';
import { envValidationSchema } from 'config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { VpsModule } from './vps/vps.module';
import { AgentModule } from './agent/agent.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { AlertasModule } from './alertas/alertas.module';
import { CommonModule } from './common/common.module';
import { BloqueosModule } from './bloqueos/bloqueos.module';
import { WhitelistModule } from './whitelist/whitelist.module';

@Module({
  imports: [
    // Variables de entorno accesibles globalmente vía ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
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
            ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10)
          }
        ]
      })
    }),

    // Módulos del dominio
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    VpsModule,
    AgentModule,
    ConfiguracionModule,
    AlertasModule,
    BloqueosModule,
    WhitelistModule,
  ],
})
export class AppModule { }
