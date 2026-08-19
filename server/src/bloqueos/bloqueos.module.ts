import { Module, forwardRef } from '@nestjs/common';
import { BloqueosController } from './bloqueos.controller';
import { BloqueosService } from './bloqueos.service';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [forwardRef(() => AgentModule)],
  controllers: [BloqueosController],
  providers: [BloqueosService],
  exports: [BloqueosService],
})
export class BloqueosModule { }
