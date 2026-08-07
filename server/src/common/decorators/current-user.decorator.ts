import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador que extrae el usuario del request (inyectado por JwtStrategy).
 * Uso: @CurrentUser() user: { userId: string; email: string }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
