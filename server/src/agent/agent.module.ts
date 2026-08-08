import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentTokenGuard } from './guards/agent-token.guard';

@Module({
  controllers: [AgentController],
  providers: [AgentService, AgentTokenGuard],
})
export class AgentModule {}
