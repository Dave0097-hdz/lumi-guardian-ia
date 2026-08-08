import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgentTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Extraer X-Lumi-Vps-Id
    const vpsId = request.headers['x-lumi-vps-id'] as string | undefined;
    if (!vpsId) {
      throw new UnauthorizedException('Header X-Lumi-Vps-Id requerido');
    }

    // 2. Extraer Authorization: Bearer <token>
    const authHeader = request.headers['authorization'] as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Header Authorization con formato Bearer <token> requerido',
      );
    }
    const token = authHeader.slice(7);
    if (!token) {
      throw new UnauthorizedException('Token de agente vacío');
    }

    // 3. Buscar VPS por ID (no soft-deleted)
    const vps = await this.prisma.vPS.findFirst({
      where: { id: vpsId, deletedAt: null },
    });
    if (!vps) {
      throw new UnauthorizedException('VPS no encontrado o eliminado');
    }

    // 4. Comparar token contra hash almacenado
    const tokenValid = await bcrypt.compare(token, vps.agentTokenHash);
    if (!tokenValid) {
      throw new UnauthorizedException('Token de agente inválido');
    }

    // 5. Adjuntar VPS al request para uso en controllers
    (request as any).vps = vps;

    return true;
  }
}
