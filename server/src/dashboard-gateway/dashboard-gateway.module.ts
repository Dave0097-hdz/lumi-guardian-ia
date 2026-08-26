import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DashboardGateway } from './dashboard.gateway';

/**
 * Módulo standalone del DashboardGateway.
 *
 * Vive aparte de AgentModule para que AgentModule pueda importarlo sin crear un
 * ciclo: el gateway no depende de AgentService (solo al revés — AgentService emite
 * a través del gateway).
 *
 * Registra su propio JwtModule con el mismo secreto que AuthModule para poder
 * verificar el accessToken en el handshake.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [DashboardGateway],
  exports: [DashboardGateway],
})
export class DashboardGatewayModule {}
