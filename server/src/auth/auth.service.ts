import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly jwtService: JwtService,
        private readonly auditLog: AuditLogService,
        private readonly mailService: MailService,
    ) { }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('El email ya está registrado');
        }

        const saltRounds = this.config.get<number>('bcrypt.saltRounds') ?? 12;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.prisma.user.create({
            data: {
                nombre: dto.nombre,
                email: dto.email,
                passwordHash,
            },
        });

        const tokens = await this.generateTokens(user.id, user.email);

        // Enviar correo de bienvenida (fire-and-forget, no bloquea la respuesta)
        this.mailService.enviarBienvenida(user.email, user.nombre);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
            },
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user || !user.activo) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const tokens = await this.generateTokens(user.id, user.email);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
            },
        };
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Token de refresh no proporcionado');
        }

        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
        });

        if (!storedToken) {
            throw new UnauthorizedException('Token de refresh inválido');
        }

        // Detección de reuso: si el token ya fue revocado, revocar TODOS del usuario
        if (storedToken.revokedAt) {
            this.logger.warn(
                `Reuso de refresh token detectado para userId: ${storedToken.userId}. Revocando todos los tokens.`,
            );

            await this.prisma.refreshToken.updateMany({
                where: { userId: storedToken.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });

            // Registrar evento de seguridad en AuditLog (sobrevive a reinicios del contenedor)
            await this.auditLog.registrar({
                userId: storedToken.userId,
                entidad: 'RefreshToken',
                entidadId: storedToken.id,
                accion: 'refresh_token_reuso_detectado',
                datosDespues: {
                    mensaje: 'Todas las sesiones del usuario revocadas por detección de reuso',
                    tokenReutilizadoId: storedToken.id,
                },
            });

            throw new UnauthorizedException(
                'Token reutilizado — todas las sesiones han sido revocadas por seguridad',
            );
        }

        // Verificar expiración
        if (new Date() > storedToken.expiresAt) {
            throw new UnauthorizedException('Token de refresh expirado');
        }

        // Generar nuevos tokens
        const user = await this.prisma.user.findUnique({
            where: { id: storedToken.userId },
        });

        if (!user || !user.activo) {
            throw new UnauthorizedException('Usuario no encontrado o inactivo');
        }

        const tokens = await this.generateTokens(user.id, user.email);

        // Revocar el token anterior y registrar cuál lo reemplazó
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: {
                revokedAt: new Date(),
                replacedBy: tokens.refreshTokenId,
            },
        });

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    async logout(refreshToken: string) {
        if (!refreshToken) {
            return { message: 'Sesión cerrada correctamente' };
        }

        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
        });

        if (storedToken && !storedToken.revokedAt) {
            await this.prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revokedAt: new Date() },
            });
        }

        return { message: 'Sesión cerrada correctamente' };
    }

    // ─── RECUPERAR CONTRASEÑA ────────────────────

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        // Siempre responde OK (no revelar si el email existe o no)
        if (!user || !user.activo) {
            return { message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' };
        }

        // Generar token aleatorio
        const tokenPlain = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(tokenPlain);

        // Expira en 30 minutos
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });

        // Armar URL de reset
        const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:4200';
        const resetUrl = `${frontendUrl}/reset-password?token=${tokenPlain}`;

        // Enviar email (fire-and-forget)
        this.mailService.enviarRecuperarPassword(user.email, user.nombre, resetUrl);

        return { message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const tokenHash = this.hashToken(token);

        const storedToken = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
        });

        if (!storedToken) {
            throw new BadRequestException('Token inválido o expirado');
        }

        if (storedToken.usedAt) {
            throw new BadRequestException('Este token ya fue utilizado');
        }

        if (new Date() > storedToken.expiresAt) {
            throw new BadRequestException('Token expirado — solicita uno nuevo');
        }

        // Actualizar contraseña
        const saltRounds = this.config.get<number>('bcrypt.saltRounds') ?? 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        await this.prisma.user.update({
            where: { id: storedToken.userId },
            data: { passwordHash },
        });

        // Marcar token como usado
        await this.prisma.passwordResetToken.update({
            where: { id: storedToken.id },
            data: { usedAt: new Date() },
        });

        return { message: 'Contraseña actualizada correctamente' };
    }

    // ─── PRIVADOS ────────────────────────────────

    private async generateTokens(userId: string, email: string) {
        const jti = crypto.randomUUID();

        const accessToken = this.jwtService.sign(
            { sub: userId, email, jti },
            {
                secret: this.config.get<string>('jwt.secret'),
                expiresIn: this.config.get<string>('jwt.expiresIn') ?? '15m',
            },
        );

        const refreshTokenPlain = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(refreshTokenPlain);

        const refreshExpiresIn =
            this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
        const expiresAt = this.calculateExpiry(refreshExpiresIn);

        const refreshTokenRecord = await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken: refreshTokenPlain,
            refreshTokenId: refreshTokenRecord.id,
        };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private calculateExpiry(duration: string): Date {
        const now = new Date();
        const match = duration.match(/^(\d+)([dhms])$/);

        if (!match) {
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 'd':
                return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
            case 'h':
                return new Date(now.getTime() + value * 60 * 60 * 1000);
            case 'm':
                return new Date(now.getTime() + value * 60 * 1000);
            case 's':
                return new Date(now.getTime() + value * 1000);
            default:
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
    }
}
