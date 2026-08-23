import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { client } from './core/api-client/client.gen';
import { environment } from '../environments/environment';

// Configurar URL base del cliente API + credentials para cookies cross-origin
client.setConfig({
  baseUrl: environment.apiUrl,
  credentials: 'include',  // Envía cookies HttpOnly automáticamente en cada request
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
  ],
};
