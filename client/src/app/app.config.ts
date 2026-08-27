import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { client } from './core/api-client/client.gen';
import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';

// Configurar URL base del cliente API + credentials para cookies cross-origin
client.setConfig({
  baseUrl: environment.apiUrl,
  credentials: 'include',  // Envía cookies HttpOnly automáticamente en cada request
  cache: 'no-store',       // Evita que el navegador cachee respuestas de la API
});

// Interceptor: adjunta Bearer token a cada request
client.interceptors.request.use((request) => {
  const token = localStorage.getItem('lumi_access_token');
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
  return request;
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Al arrancar la app, si ya hay una sesión válida guardada, abre el canal
    // WebSocket del dashboard (ej. el usuario recarga la página estando logueado).
    provideAppInitializer(() => {
      inject(AuthService).conectarRealtime();
    }),
  ],
};
