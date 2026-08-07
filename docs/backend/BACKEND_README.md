# LUMI Backend — README de referencia

## Qué hace

El backend de LUMI es la capa central de gestión y control del sistema. Recibe, procesa y almacena la información enviada por los agentes instalados en los VPS.

Su propósito es:

- registrar y administrar VPS,
- autenticar usuarios,
- recibir métricas y heartbeats del agente,
- exponer información de estado del sistema al frontend,
- y servir como base para futuras alertas y acciones de respuesta.

## Cómo lo hace

El backend está construido con NestJS y Prisma.

El flujo principal es:

1. Un usuario crea o gestiona un VPS desde la aplicación.
2. El backend genera un token de agente para ese VPS.
3. El agente instala ese token en el host remoto.
4. El agente envía métricas y heartbeats al backend.
5. El backend persiste esa información en PostgreSQL mediante Prisma.

## Dónde se ejecuta

El backend se ejecuta en un servidor central o en un entorno de despliegue dedicado. No es un componente local del VPS; es la capa de control y observabilidad central.

## Arquitectura general

### Módulos principales

- Auth
  - registro,
  - login,
  - refresh token,
  - autenticación JWT.
- VPS
  - creación y gestión de VPS,
  - recepción de métricas,
  - recepción de heartbeats,
  - estado de conexión del agente.
- Prisma
  - acceso a la base de datos PostgreSQL.
- Config
  - carga y validación de variables de entorno.

## Requisitos

### Software

- Node.js
- pnpm
- PostgreSQL
- Docker (opcional, para levantar la base de datos localmente)

### Variables de entorno

El backend requiere variables como:

- DATABASE_URL
- DIRECT_URL
- JWT_SECRET
- INTERNAL_SECRET_KEY
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USER
- EMAIL_PASSWORD
- SMTP_FROM_NAME
- SMTP_FROM_EMAIL

## Primeros pasos de instalación

1. Instalar dependencias

```bash
cd lumi-backend
pnpm install
```

2. Levantar PostgreSQL

Puede usarse Docker Compose:

```bash
docker compose up -d postgres
```

3. Configurar variables de entorno

Crear un archivo de entorno con las variables requeridas por el backend.

4. Ejecutar migraciones de Prisma

```bash
pnpm prisma migrate dev
```

5. Iniciar el backend en modo desarrollo

```bash
pnpm start:dev
```

## Cómo se ejecuta

Modo desarrollo:

```bash
pnpm start:dev
```

Modo producción:

```bash
pnpm build
pnpm start:prod
```

## Base de datos

El backend usa PostgreSQL como base de datos principal.

### Modelo de datos central

Modelos principales:

- User
  - representa un usuario de la plataforma.
- VPS
  - representa un servidor monitoreado.
- Metrica
  - almacena métricas de CPU, RAM, disco, red y estado general.
- Alerta
  - registra eventos de seguridad o anomalías detectadas.
- Bloqueo
  - representa acciones de bloqueo aplicadas a una IP o un recurso.
- Aislamiento
  - modela acciones de aislamiento de un VPS o host.
- AuditLog
  - guarda eventos de auditoría del sistema.

## Relaciones principales

Algunas relaciones importantes del esquema son:

- User tiene muchos VPS.
- VPS pertenece a un User.
- VPS tiene muchas métricas.
- VPS tiene muchas alertas.
- Alerta puede tener muchos bloqueos y aislamientos.
- Bloqueo pertenece a un VPS y a un User.

## Tecnologías usadas

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT + Passport
- class-validator / class-transformer
- Helmet y validación global de entradas

## Endpoints clave

El backend expone rutas REST bajo el prefijo global:

- /api/v1/auth
- /api/v1/vps
- /api/v1/agent

### Endpoints del agente

- POST /api/v1/agent/metricas
- POST /api/v1/agent/heartbeat

## Buenas prácticas de desarrollo

- mantener los DTOs validados,
- evitar lógica de negocio en los controladores,
- usar Prisma para toda la persistencia,
- separar autenticación, servicios y módulos por dominio.

## Cómo debe integrarse con el agente

El backend debe actuar como:

- receptor de métricas,
- fuente de verdad del estado del VPS,
- punto de entrada para futuras acciones de respuesta.

La integración recomendada es:

1. El agente envía métricas y heartbeats al backend.
2. El backend persiste la información.
3. El frontend consulta el estado del VPS.
4. En una siguiente etapa, el backend puede disparar acciones de bloqueo, aislamiento o notificación.
