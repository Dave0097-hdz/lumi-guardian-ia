import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador que extrae el VPS del request (inyectado por AgentTokenGuard).
 * Uso: @CurrentVps() vps: VPS
 */
export const CurrentVps = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.vps;
  },
);
