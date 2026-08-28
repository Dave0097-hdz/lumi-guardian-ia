# LUMI Guardián AI — Backend

API REST + WebSocket del backend de LUMI Guardián AI. Autentica usuarios y agentes, aplica la lógica de autonomía (Solo Alertar / Sugerir / Guardián Total), orquesta bloqueos en los VPS y notifica en tiempo real y por correo.

## Stack

- **NestJS 10** + **TypeScript** (tipado estricto).
- **PostgreSQL 16** + **Prisma 5.22** como única vía de acceso a datos.
- **JWT + Passport** para usuarios (refresh tokens con rotación y detección de reuso, hashing con bcrypt).
- **Token dinámico por VPS** para agentes (hasheado en BD, guard separado del de usuarios).
- **Socket.IO** (`@nestjs/websockets`) para el canal en tiempo real con el dashboard.
- **Swagger** (`@nestjs/swagger`) como fuente de verdad de la API.
- **Helmet** + rate limiting (`@nestjs/throttler`) en endpoints públicos.
- **Nodemailer** + **Handlebars** para correos (bienvenida, recuperar contraseña, alertas de VPS).

## Estructura

Un módulo por dominio de negocio. Cada módulo trae su controller, service, DTOs y (si aplica) guards.

```
src/
├── auth/               JWT, refresh tokens, registro, login, recuperar contraseña
├── vps/                CRUD de VPS, generación de agentToken, install.sh
├── alertas/            historial de alertas y cambio de estado
├── bloqueos/           bloqueo/desbloqueo de IPs vía el agente
├── configuracion/      configuración por VPS (autonomía, umbrales, notificaciones)
├── whitelist/          IPs en lista blanca
├── metricas/           métricas de sistema reportadas por el agente
├── agent/              endpoints que consume el agente + AgentGateway (WebSocket)
├── dashboard-gateway/  WebSocket con el dashboard (alertas en vivo)
├── mail/               servicio de correo + plantillas Handlebars
├── prisma/             PrismaService
├── common/             guards, interceptors, filters, decorators compartidos
└── main.ts
```

## Modelo de datos (Prisma)

Entidades principales: `User`, `VPS`, `Alerta`, `Bloqueo`, `Aislamiento`, `Metrica`, `Configuracion`, `WhitelistIP`, `AuditLog`, y las de auth (`RefreshToken`, `RevokedToken`, `PasswordResetToken`).

El esquema completo vive en [`prisma/schema.prisma`](./prisma/schema.prisma).

## Puesta en marcha

Requisitos: Node 20+, pnpm, y PostgreSQL 16 (local o vía Docker Compose desde la raíz del monorepo).

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno (en la raíz del monorepo)
#    Necesitas DATABASE_URL, JWT_SECRET, y la config SMTP (ver más abajo)

# 3. Generar el cliente Prisma y aplicar migraciones
pnpm prisma:generate
pnpm prisma:migrate

# 4. Arrancar en modo desarrollo (hot-reload)
pnpm start:dev
```

El backend queda en `http://localhost:3000/api/v1`.

## Documentación de la API

Todos los endpoints están documentados con Swagger, generado desde los controllers reales:

- **UI interactiva**: `http://localhost:3000/api/docs`
- **Spec JSON**: `http://localhost:3000/api/docs-json`

El spec es la fuente de verdad del contrato: el frontend regenera su cliente tipado a partir de él.

## Autenticación

**Usuarios** — JWT con dos tokens:
- `accessToken` (15 min) en el header `Authorization: Bearer`.
- `refreshToken` (7 días) en cookie `HttpOnly`, con rotación y detección de reuso.

**Agentes** — cada VPS recibe un `agentToken` único al registrarse. Se genera una sola vez, se almacena **hasheado** y viaja en cada request del agente. El guard de agente valida además que el `LUMI_VPS_ID` corresponda al token, para que un agente nunca reporte datos de un VPS ajeno.

## WebSocket

Dos namespaces separados, cada uno con su propia autenticación:

- **`/agents`** — canal backend ↔ agente (auth con `agentToken`).
- **`/dashboard`** — canal backend ↔ frontend (auth con el `accessToken` JWT en el handshake). Emite `nueva-alerta` al dueño del VPS cuando se detecta una amenaza, para que el dashboard se actualice sin recargar.

## Correo

`MailService` centraliza el envío. Configuración SMTP vía variables de entorno; plantillas Handlebars separadas por acción (bienvenida, recuperar contraseña, alerta de VPS), cada una con versión HTML y texto plano. El envío de alertas por correo respeta la configuración del usuario: solo se envía si `notifEmail` está activo y la severidad está entre las seleccionadas (`severidadesNotif`).

## Variables de entorno

Se cargan desde el `.env` de la raíz del monorepo. Las principales:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto para firmar los JWT |
| `JWT_EXPIRES_IN` | Duración del accessToken (por defecto 15m) |
| `PORT` | Puerto del backend (por defecto 3000) |
| `LUMI_PUBLIC_URL` | URL pública del sistema (se inyecta en el `install.sh` del agente) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_SECURE` | Configuración del servidor de correo |
| `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL` | Remitente de los correos |

Nunca se versionan secretos reales: el `.env.example` documenta las claves sin valores sensibles.

## Scripts

| Script | Acción |
|---|---|
| `pnpm start:dev` | Desarrollo con hot-reload |
| `pnpm build` | Compilar a `dist/` |
| `pnpm start:prod` | Ejecutar el build de producción |
| `pnpm test` | Tests unitarios (Jest) |
| `pnpm test:cov` | Tests con cobertura |
| `pnpm lint` | ESLint con autofix |
| `pnpm prisma:migrate` | Crear/aplicar migraciones en desarrollo |
| `pnpm prisma:studio` | Explorador visual de la base de datos |

## Docker

- `Dockerfile` — build multi-stage para producción (imagen final sin devDependencies).
- `Dockerfile.dev` — con hot-reload para desarrollo (usado por `docker-compose.yml` en la raíz).
