import { Module, forwardRef } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentTokenGuard } from './guards/agent-token.guard';
import { AgentGateway } from './agent.gateway';
import { BloqueosModule } from '../bloqueos/bloqueos.module';

@Module({
  imports: [forwardRef(() => BloqueosModule)],
  controllers: [AgentController],
  providers: [AgentService, AgentTokenGuard, AgentGateway],
  exports: [AgentGateway],
})
export class AgentModule { }
