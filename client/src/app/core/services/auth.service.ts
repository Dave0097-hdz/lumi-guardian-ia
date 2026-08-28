import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  authControllerLogin,
  authControllerRegister,
  authControllerRefresh,
  authControllerLogout,
} from '../api-client/sdk.gen';
import type { LoginDto, RegisterDto } from '../api-client/types.gen';
import { RealtimeService } from './realtime.service';

interface UserData {
  id: string;
  nombre: string;
  email: string;
}

const ACCESS_TOKEN_KEY = 'lumi_access_token';
const USER_KEY = 'lumi_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // RealtimeService se resuelve de forma perezosa para evitar el ciclo de
  // dependencias (RealtimeService inyecta AuthService para leer el token).
  private readonly injector = inject(Injector);

  constructor(private readonly router: Router) { }

  private get realtime(): RealtimeService {
    return this.injector.get(RealtimeService);
  }

  /**
   * Conecta el canal WebSocket si hay sesión activa. Se llama tras login/register
   * y en el arranque de la app cuando ya hay un accessToken guardado.
   */
  conectarRealtime(): void {
    if (this.isAuthenticated()) {
      this.realtime.conectar();
    }
  }

  async login(email: string, password: string): Promise<void> {
    const response = await authControllerLogin({
      body: { email, password } as LoginDto,
    });

    if (response.error) {
      throw response.error;
    }

    const data = response.data as { accessToken: string; user: UserData };
    this.saveSession(data);
    this.realtime.conectar();
  }

  async register(nombre: string, email: string, password: string): Promise<void> {
    const response = await authControllerRegister({
      body: { nombre, email, password } as RegisterDto,
    });

    if (response.error) {
      throw response.error;
    }

    const data = response.data as { accessToken: string; user: UserData };
    this.saveSession(data);
    this.realtime.conectar();
  }

  /**
   * Refresh silencioso — el refreshToken viaja automáticamente como cookie HttpOnly.
   * El frontend no lo lee ni lo almacena; el navegador lo envía por su cuenta
   * en cada request a /api/v1/auth/* gracias al path configurado en la cookie.
   */
  async refresh(): Promise<boolean> {
    try {
      const response = await authControllerRefresh({
        body: {},
      });

      if (response.error) {
        this.clearSession();
        return false;
      }

      const data = response.data as { accessToken: string };
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await authControllerLogout({ body: {} });
    } catch {
      // Si falla el logout remoto, limpiamos localmente de todas formas
    }
    this.realtime.desconectar();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getUser(): UserData | null {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as UserData;
    } catch {
      return null;
    }
  }

  private saveSession(data: { accessToken: string; user: UserData }): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
