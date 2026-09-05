# LUMI Guardián AI — Frontend

Dashboard web de LUMI Guardián AI. Permite registrar VPS, ver alertas de seguridad en tiempo real, gestionar bloqueos de IPs, configurar el nivel de autonomía y el control de red, todo en una interfaz pensada para usuarios no técnicos.

## Stack

- **Angular 21** (standalone components y signals).
- **TypeScript 5.9** (tipado estricto, sin `any` sin justificar).
- **SCSS** para estilos globales y de componentes.
- **RxJS 7.8** para flujos asíncronos puntuales.
- **Socket.IO client 4.8** para el canal en tiempo real con el backend.
- Fuentes vía `@fontsource` (Montserrat, Roboto, JetBrains Mono).
- Cliente de API **autogenerado** con `@hey-api/openapi-ts` y `@hey-api/client-fetch` (no se escribe a mano).
- Gestor de paquetes **npm 10**.

## Estructura

```
src/app/
├── core/
│   ├── api-client/     cliente HTTP autogenerado desde el OpenAPI del backend
│   ├── guards/         protección de rutas
│   └── services/       servicios singleton que envuelven el cliente generado
├── shared/             componentes reutilizables (toast, alert-card, modales)
├── features/           un feature por dominio de negocio
│   ├── auth/           login, registro, recuperar/restablecer contraseña
│   ├── dashboard/      panel principal con alertas en tiempo real
│   ├── vps/            listado, alta y detalle/configuración de VPS
│   ├── alertas/        historial de alertas
│   ├── bloqueos/       historial de bloqueos
│   ├── whitelist/      control de red (IPs en lista blanca)
│   ├── configuracion/  configuración de la cuenta
│   ├── nosotros/       misión, visión y equipo
│   └── shell/          layout principal (topbar + sidebar)
└── environments/       apiUrl por entorno
```

El cliente REST vive en `src/app/core/api-client/` y se regenera desde el contrato OpenAPI expuesto por el backend. Los componentes consumen los servicios de `core/services/` y no llaman directamente al cliente generado.

## Puesta en marcha

Requisitos: Node 20+, npm 10, y el backend corriendo (para las llamadas a la API y el WebSocket).

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la URL del backend en src/environments/environment.ts
#    (por defecto http://localhost:3000)

# 3. Arrancar el servidor de desarrollo
ng serve
```

La app queda en `http://localhost:4200`.

## Cliente de API autogenerado

Para evitar desalineaciones de contrato entre backend y frontend, los servicios que hablan con la API **no se escriben a mano**: se generan desde el Swagger real del backend con `@hey-api/openapi-ts`.

- El cliente vive en `src/app/core/api-client/` (`types.gen.ts`, `sdk.gen.ts`, `client.gen.ts`) y **nunca se edita a mano** — cualquier cambio se hace regenerando.
- Los componentes nunca llaman al cliente generado directamente; lo hacen a través de los servicios de `core/services/`.

**Regenerar** (con el backend corriendo):

```bash
# Regenerar el cliente desde el contrato OpenAPI configurado
npm run api:generate
```

## Autenticación

Gestionada por un único `AuthService`; los componentes nunca acceden a `localStorage` directamente.

- El `accessToken` se guarda en `localStorage` y se adjunta a cada request mediante el interceptor del cliente `fetch` (configurado una sola vez en el arranque, en `app.config.ts`).
- El `refreshToken` viaja como cookie `HttpOnly` gestionada por el backend; el frontend no lo lee ni lo almacena.
- Un `AuthGuard` nativo del router protege las rutas del dashboard.

## Tiempo real (WebSocket)

`RealtimeService` mantiene la conexión al namespace `/dashboard` del backend:

- Se conecta tras login/registro y al arrancar la app si ya hay sesión; se desconecta en logout.
- Autentica enviando el `accessToken` en el handshake, y usa el token más reciente al reconectar.
- Expone la última alerta recibida como signal; el dashboard la consume con `effect()`, la deduplica por id y la muestra al instante con un destello sutil.

Este canal se maneja aparte del cliente REST autogenerado (que no cubre WebSocket).

## Theming

Identidad de marca en **modo oscuro exclusivo**. Todos los colores se definen como variables CSS (`--color-bg`, `--color-accent`, etc.), nunca hardcodeados, para dejar la puerta abierta a un modo claro futuro sin reescribir componentes.

Los iconos son SVG inline (estilo feather), sin dependencias de librerías de iconos.

## Scripts

| Script | Acción |
|---|---|
| `ng serve` | Servidor de desarrollo en `:4200` |
| `ng build` | Build de producción en `dist/` |
| `npm run api:generate` | Regenerar el cliente de API desde el spec |
