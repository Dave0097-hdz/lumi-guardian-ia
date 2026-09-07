# LUMI Guardián AI

Sistema de monitoreo y respuesta autónoma para servidores VPS que alojan tiendas en línea (e-commerce). LUMI observa la telemetría técnica del servidor (accesos SSH, estado HTTP/HTTPS, uso de recursos) y actúa según el nivel de autonomía que el usuario configure para cada VPS, desde solo alertar hasta bloquear automáticamente una IP maliciosa.

> **Nota de alcance (MVP):** en esta fase LUMI está optimizado para proteger VPS que alojan tiendas en línea sobre WordPress/WooCommerce. No accede, procesa ni almacena código fuente, bases de datos de clientes, correos ni transacciones del negocio — solo telemetría de infraestructura.

## Tabla de contenido

- [¿Por qué LUMI?](#por-qué-lumi)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Ataques que detecta](#ataques-que-detecta)
- [Metodología de pruebas](#metodología-de-pruebas)
- [Evidencia de detección](#evidencia-de-detección)
- [Panel de control (dashboard)](#panel-de-control-dashboard)
- [Instalación y ejecución](#instalación-y-ejecución)
- [API](#api)
- [Seguridad y estado del cifrado](#seguridad-y-estado-del-cifrado)
- [Pendientes conocidos](#pendientes-conocidos)
- [Licencia y autores](#licencia-y-autores)

## ¿Por qué LUMI?

El nombre **LUMI** viene de la idea de ser una guía que "alumbra" lo que pasa dentro de un servidor que, para la mayoría de sus dueños, es una caja negra.

El proyecto nace de un problema muy concreto: quien monta una tienda en línea normalmente es un emprendedor, no un experto en ciberseguridad. Levanta su tienda sobre un VPS, la deja corriendo y confía en que "va a estar bien" — hasta que un ataque de fuerza bruta, un endpoint mal expuesto o un pico de tráfico malicioso le tira el sitio o le compromete la cuenta de administrador, y no tiene ni el conocimiento ni el tiempo para darse cuenta a tiempo, mucho menos para reaccionar.

LUMI Guardián AI busca cerrar esa brecha: una capa de protección que un emprendedor sin conocimientos técnicos de seguridad pueda instalar en su VPS, entender en lenguaje simple y configurar según cuánta autonomía le quiere dar al sistema (solo avisar, sugerir una acción, o bloquear automáticamente). No es una herramienta de seguridad genérica para cualquier servidor: **nuestra especialidad es el e-commerce** — por eso el MVP se enfoca en los vectores de ataque más comunes contra tiendas WordPress/WooCommerce (exposición de usuarios vía API REST, reconocimiento de rutas del admin, fuerza bruta SSH) en lugar de intentar cubrir todo el universo de amenazas posibles.

## Arquitectura

```
 Usuario / navegador
        |
        v
 Frontend Angular (dashboard web)
        | REST + WebSocket
        v
 Nginx (reverse proxy, punto de entrada público)
     /api/          /socket.io/
        |
        v
 Backend NestJS (API y tiempo real)
        |                     |
        v                     +--> Correo SMTP
 PostgreSQL + Prisma

 VPS monitoreado
        |
        v
 Agente Python (systemd)
        +--> logs y métricas del sistema
        +--> API REST / WebSocket del backend
        +--> acciones locales de firewall (UFW)
```

| Componente | Responsabilidad | Ejecución |
|---|---|---|
| `client/` | Dashboard, autenticación, gestión de VPS, alertas, bloqueos y configuración | Navegador; build estático de Angular |
| `server/` | API REST, autenticación, reglas de autonomía, persistencia, correo y WebSocket | Node.js; local o en Docker |
| `agent/` | Monitoreo del VPS, envío de telemetría/alertas y ejecución de bloqueos locales | Python en cada VPS, normalmente como `systemd` |
| PostgreSQL | Persistencia de usuarios, VPS, alertas, bloqueos, métricas, configuración y auditoría | Contenedor Docker o servicio administrado |
| Nginx | Sirve el frontend y enruta API, instalador del agente y Socket.IO | Contenedor en despliegue |

**Flujo principal:** el usuario inicia sesión en el dashboard (JWT + refresh token en cookie `HttpOnly`). El agente se identifica ante el backend con un token propio por VPS, analiza eventos del sistema y envía alertas/métricas por HTTP o Socket.IO. El backend persiste todo en PostgreSQL vía Prisma y aplica el nivel de autonomía configurado; cuando corresponde, pide al agente bloquear o desbloquear una IP. Las alertas nuevas se publican en tiempo real al dashboard por el namespace `/dashboard`.

## Stack tecnológico

| Proyecto | Lenguaje | Framework / runtime | Persistencia / comunicación | Calidad y tooling |
|---|---|---|---|---|
| Backend (`server/`) | TypeScript | Node.js 20+ · NestJS 10 · Express | PostgreSQL 16 · Prisma 5.22 · REST · Socket.IO 4 · SMTP (Nodemailer) | Jest, Supertest, ESLint, Prettier, Swagger |
| Frontend (`client/`) | TypeScript | Angular 21 (standalone + signals) | Cliente REST autogenerado desde OpenAPI · Socket.IO Client 4.8 · RxJS 7.8 | Angular CLI, Vitest, JSDOM, SCSS |
| Agente (`agent/`) | Python | Python 3.11+ | `psutil` (métricas), `requests` (HTTP), `python-socketio`, SQLite local (buffer WAL) | pytest, pyproject.toml |
| Despliegue | YAML / Nginx | Docker Compose + Nginx | Red interna Docker, volumen PostgreSQL, reverse proxy | Healthchecks, migraciones Prisma, variables `.env` |

Autenticación con JWT + Passport + bcryptjs; validación de datos con `class-validator`/`class-transformer`; protecciones HTTP con Helmet y `@nestjs/throttler`.

## Estructura del repositorio

```
lumi-guardian-ia/
├── agent/       # Agente Python instalado en cada VPS monitoreado
├── client/      # Dashboard Angular
├── server/      # API NestJS, lógica de negocio, WebSocket, Prisma
├── deploy/      # Docker Compose y Nginx para el despliegue central
├── docs/        # Documentación funcional/técnica, contrato OpenAPI, pruebas
├── nginx/       # Reservado a nivel de raíz (el Nginx productivo vive en deploy/nginx/)
├── test-ws/     # Utilidades para probar los canales WebSocket manualmente
├── docker-compose.yml            # Orquestación local de PostgreSQL + backend
└── docker-compose.override.yml   # Override de desarrollo (modo debug del backend)
```

## Ataques que detecta

Durante la fase de planeación se seleccionaron 3 tipos de ataque como foco del MVP, por recomendación del tutor del proyecto. Son los que el agente identifica y sobre los que se diseñó la remediación:

### 1. Exposición del endpoint de usuarios de WordPress (`wp-json/wp/v2/users`)

Una respuesta HTTP `200` en `/wp-json/wp/v2/users` significa que la API REST de WordPress está abierta al público: cualquiera puede consultar la lista de usuarios del sitio en un JSON, información útil para un atacante que luego intente fuerza bruta de credenciales.

- **Remediación 1 (aplicación):** mu-plugin de WordPress que bloquea el endpoint para usuarios no autenticados.
- **Remediación 2 (red):** cuando el agente detecta en `access.log` una IP consultando esa ruta, LUMI puede bloquear la IP a nivel de firewall del servidor, o aplicar una regla global que devuelva `403 Forbidden` a esa ruta para todos los sitios del VPS.

```php
<?php
/**
 * Plugin Name: Bloquear Rest API Users Endpoint
 * Description: Protege los endpoints de usuarios de la API REST para usuarios no autenticados.
 */
add_filter('rest_authentication_errors', function ($result) {
    if (!empty($result)) {
        return $result;
    }
    if (!is_user_logged_in()) {
        if (strpos($_SERVER['REQUEST_URI'], '/wp-json/wp/v2/users') !== false) {
            return new WP_Error(
                'rest_forbidden_users',
                'El acceso a la lista de usuarios está restringido.',
                array('status' => 401)
            );
        }
    }
    return $result;
});
```

### 2. Reconocimiento vía redirecciones HTTP 301

Respuestas `301` en rutas como `/wp-admin`, `/wp-content` o `/wp-includes` indican que un atacante (o una herramienta de reconocimiento) está mapeando la estructura del sitio WordPress antes de intentar un ataque dirigido.

### 3. IPs maliciosas por fuerza bruta (SSH)

Basado en el enfoque de Fail2ban: se monitorean los intentos de autenticación fallidos y se genera un top de IPs con mayor cantidad de intentos de conexión. El proceso de remediación documentado es:

1. Validar si la IP corresponde a una zona geográfica relevante para el negocio.
2. Consultar la IP en VirusTotal (score, país de origen, proveedor de detección).
3. Bloquear con `sudo ufw deny from <IP>`.
4. Validar el bloqueo con `sudo ufw status`.

En el agente real, este comportamiento está implementado como tres niveles de severidad según el patrón detectado en `auth.log` (`ssh_failed_login`, `ssh_brute_force_burst`, `ssh_brute_force_persistent`) — ver [Evidencia de detección](#evidencia-de-detección).

> El agente también registra un cuarto tipo de evento, `ip_flood`, observado en las pruebas de carga/tráfico. No forma parte de los 3 ataques definidos como foco del MVP, pero queda documentado como parte de la telemetría real capturada.

## Metodología de pruebas

Para estudiar y validar estos 3 tipos de ataque se trabajó durante varios meses en un entorno simulado con **CALDERA** (framework de emulación de adversarios), donde se ejecutaron operaciones de ataque controladas contra un VPS de prueba y se verificó que el agente los detectara y registrara correctamente.

- Instancia CALDERA v5.3.0 con 5 agentes, 7 operaciones, 1916 habilidades y 36 adversarios configurados.
- Ejemplo de operación ejecutada: **`Op_Ecommerce_Validation_Test`** (2026‑09‑07), habilidad *HTTP Scan lumi*, táctica *reconnaissance*, sobre el host `srv-client-fase-01` — resultado `success`.

## Evidencia de detección

Evidencia real capturada durante las pruebas sobre el VPS de prueba (`161.35.3.187`), confirmando que el agente contiene y registra los 3 tipos de ataque a nivel de terminal y base de datos.

**Petición real detectada en el log de Apache:**

```
root@srv-client-fase-01:/var/log/apache2# grep -E "wp-json/wp/v2/users|\?author=" /var/log/apache2/access.log
161.35.3.187 - - [07/Sep/2026:00:12:59 +0000] "GET /wp-json/wp/v2/users HTTP/1.1" 200 3530 "-" "curl/8.5.0"
```

**Consulta directa a la base de datos local del agente (SQLite, `/opt/lumi-agent/data/lumi.db`):**

```
sqlite> SELECT event_type, COUNT(*), COUNT(DISTINCT source_ip) AS ips_distintas
        FROM events GROUP BY event_type ORDER BY COUNT(*) DESC;

system_sample              38948   1
ssh_failed_login           10014   531
ssh_brute_force_burst        572    88
ssh_brute_force_persistent    43    19
wp_sensitive_route            20    13
ip_flood                       3     1
```

Este resultado muestra, con datos reales del agente en ejecución, que los tres ataques del MVP (exposición de `wp-json/users`, reconocimiento por redirecciones y fuerza bruta SSH) quedan capturados como eventos `wp_sensitive_route` y `ssh_failed_login` / `ssh_brute_force_burst` / `ssh_brute_force_persistent`, junto con el evento adicional `ip_flood`.

## Panel de control (dashboard)

El dashboard Angular permite:

- **Mis Servidores:** listado de VPS registrados (proveedor, sistema operativo, IP, estado).
- **Configuración por VPS:**
  - *Nivel de autonomía*: Solo Alertar / Sugerir / Guardián Total (bloqueo automático).
  - *Umbrales de alerta*: límites configurables de CPU/RAM y otros indicadores por servidor.
  - *Notificaciones*: preferencias de aviso al usuario.

## Instalación y ejecución

### Backend + base de datos (local, con Docker)

```bash
# En la raíz del monorepo
docker compose up -d
# docker-compose.override.yml activa el modo debug (pnpm start:debug) en desarrollo
```

### Frontend

```bash
cd client
npm install
ng serve
# http://localhost:4200
```

El cliente REST del frontend se regenera desde el contrato OpenAPI con `npm run api:generate`; el canal WebSocket se configura aparte porque no forma parte del cliente generado.

### Agente (en el VPS a monitorear)

Requiere Linux (Debian/Ubuntu recomendado, por las rutas estándar de `/var/log/auth.log` y `/var/log/nginx/access.log`) y Python 3.11+.

```bash
git clone <repo-del-agente>
cd lumi-agent
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .

# Variables de autenticación con el backend (no van en el código ni en agent.toml)
export AGENT_TOKEN="tu_token_bearer"
export INTERNAL_SECRET_KEY="tu_llave_interna"

python3 main.py
```

Si faltan las variables de entorno, el agente arranca en **modo local**: guarda eventos en SQLite pero no los envía al backend (útil para desarrollo). El usuario que ejecuta el agente necesita pertenecer al grupo `adm` (o correr como root) para leer los logs del sistema; sin ese permiso, los monitores de SSH y HTTP fallan silenciosamente.

Consumo esperado del agente en v1: **menos de 1% de CPU y 25–30 MB de RAM.**

## API

El backend expone su documentación interactiva en `/api/docs` (Swagger). Endpoints principales confirmados:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Health check — valida conexión a PostgreSQL |
| POST | `/api/v1/auth/register` | Registrar nuevo usuario |
| POST | `/api/v1/auth/login` | Iniciar sesión |
| POST | `/api/v1/auth/refresh` | Renovar tokens (lee refreshToken de la cookie) |
| POST | `/api/v1/auth/logout` | Cerrar sesión (revoca refresh token) |
| POST | `/api/v1/vps` | Registrar nuevo VPS — devuelve `agentToken` una sola vez |
| GET | `/api/v1/vps` | Listar VPS del usuario autenticado |
| GET | `/api/v1/vps/{id}` | Detalle de un VPS |
| DELETE | `/api/v1/vps/{id}` | Eliminar VPS (soft delete) |
| POST | `/api/v1/vps/{id}/regenerate-token` | Regenerar `agentToken` (invalida el anterior) |
| GET | `/api/v1/vps/{id}/metricas` | Métricas históricas del VPS |

## Seguridad y estado del cifrado

- Las contraseñas se almacenan siempre con hash, nunca en texto plano.
- **El cifrado en tránsito (HTTPS/TLS) está en proceso de configuración**, no completado aún en toda la infraestructura: la configuración base de Nginx incluida es HTTP y debe completarse antes de exponer el sistema en producción. Hasta entonces, parte de la comunicación entre el agente, la API y el dashboard puede viajar sin cifrar.
- No hay todavía cifrado en reposo ni anonimización de la telemetría en base de datos.
- Registros de seguridad con retención limitada (política de 30 días).

## Pendientes conocidos

Según las notas de arquitectura del propio equipo:

- Definir si las IPs legítimas (whitelist) deben almacenarse con hash.
- Ampliar la lista de escáneres conocidos detectados por el monitor HTTP (por ejemplo, agregar `wpscan`).
- Evaluar intervalos de monitoreo independientes por tipo de monitor (configurable vía `agent.toml`).
- Definir comportamiento del agente ante una pérdida de conexión prolongada con el backend.

## Licencia y autores

Proyecto desarrollado por:

- **Cristian Chávez** — [ia.cr1s7x@gmail.com](mailto:ia.cr1s7x@gmail.com)
- **Raúl Gonzalez Magaña** — [raulgonzalesmagana@gmail.com](mailto:raulgonzalesmagana@gmail.com)
- **David de Jesús Chavarría Hernández** — [david087hdz@gmail.com](mailto:david087hdz@gmail.com)
- **Jessica Calderón Castañeda** — [jessicopem@gmail.com](mailto:jessicopem@gmail.com)
