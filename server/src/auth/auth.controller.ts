import {
    Controller,
    Post,
    Body,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    private readonly cookieName = 'refreshToken';

    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) { }

    @Post('register')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Registrar nuevo usuario' })
    @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
    @ApiResponse({ status: 409, description: 'Email ya registrado' })
    @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.register(dto);
        this.setRefreshCookie(res, result.refreshToken);

        return {
            accessToken: result.accessToken,
            user: result.user,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Iniciar sesión' })
    @ApiResponse({ status: 200, description: 'Login exitoso' })
    @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto);
        this.setRefreshCookie(res, result.refreshToken);

        return {
            accessToken: result.accessToken,
            user: result.user,
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Renovar tokens (lee refreshToken de la cookie)' })
    @ApiResponse({ status: 200, description: 'Tokens renovados' })
    @ApiResponse({
        status: 401,
        description: 'Token inválido, expirado o reutilizado',
    })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() dto: RefreshTokenDto,
    ) {
        // Prioridad: cookie > body (la cookie es más segura, body como fallback para APIs)
        const refreshToken =
            req.cookies?.[this.cookieName] ?? dto?.refreshToken ?? null;

        const result = await this.authService.refresh(refreshToken);
        this.setRefreshCookie(res, result.refreshToken);

        return {
            accessToken: result.accessToken,
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cerrar sesión (revoca refresh token y limpia cookie)' })
    @ApiResponse({ status: 200, description: 'Sesión cerrada' })
    @ApiResponse({ status: 401, description: 'No autenticado' })
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() dto: RefreshTokenDto,
    ) {
        const refreshToken =
            req.cookies?.[this.cookieName] ?? dto?.refreshToken ?? null;

        const result = await this.authService.logout(refreshToken);
        this.clearRefreshCookie(res);

        return result;
    }

    // ─── COOKIE HELPERS ────────────────────────────

    private setRefreshCookie(res: Response, token: string): void {
        const isProduction =
            this.config.get<string>('app.nodeEnv') === 'production';

        res.cookie(this.cookieName, token, {
            httpOnly: true, // No accesible desde JavaScript (previene XSS)
            secure: isProduction, // Solo HTTPS en producción
            sameSite: isProduction ? 'strict' : 'lax', // Previene CSRF
            path: '/api/v1/auth', // Solo se envía en rutas de auth
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
        });
    }

    private clearRefreshCookie(res: Response): void {
        const isProduction =
            this.config.get<string>('app.nodeEnv') === 'production';

        res.clearCookie(this.cookieName, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            path: '/api/v1/auth',
        });
    }
}
