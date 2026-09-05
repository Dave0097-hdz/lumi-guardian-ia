# LUMI Guardián AI

**Ciberseguridad autónoma para servidores VPS, explicada en lenguaje humano.**

LUMI Guardián AI es una plataforma SaaS que protege servidores VPS de emprendedores y usuarios no técnicos que no tienen un equipo de seguridad propio. Traduce eventos técnicos de red y logs a un lenguaje que cualquiera entiende, y mitiga ataques automáticamente (o los recomienda en un clic) según el nivel de autonomía que el usuario elija.

> Proyecto construido desde cero por un equipo de la comunidad **WomenCISO & MenCISO**.

---

## El problema

Un emprendedor levanta su tienda o su API en un VPS y, sin saberlo, queda expuesto: bots que prueban contraseñas por SSH, escaneos de puertos, inyecciones en sus formularios. Las herramientas de seguridad existentes están pensadas para analistas: dashboards llenos de jerga, logs crudos, reglas que nadie sin experiencia sabe configurar. El resultado es que la mayoría de estos servidores quedan desprotegidos hasta que ya es tarde.

## La solución

Un agente ligero se instala en el VPS del cliente y vigila los logs de acceso (SSH, Nginx) y las métricas del sistema. Cuando detecta un patrón de ataque, genera una alerta y la envía al backend. Según la autonomía configurada, LUMI:

- **Solo Alertar** — te avisa y tú decides.
- **Sugerir** — te propone la acción y la aplicas con un clic.
- **Guardián Total** — bloquea la IP atacante automáticamente, en segundos.

Todo se comunica en el dashboard en tiempo real y por correo, siempre en lenguaje llano: "Se detectaron 5 intentos de acceso SSH en 2 minutos desde Rusia" en lugar de una línea de `auth.log`.

## Propuesta de valor

Lo que hace única a LUMI no es detectar amenazas — es **hacer que la respuesta sea accesible para quien no es técnico**. La detección se apoya en reglas heurísticas transparentes y auditables, no en una caja negra de IA. El usuario entiende qué pasó, por qué se actuó, y mantiene el control del nivel de intervención.

## Conocimiento del mercado

El espacio de seguridad para servidores está dominado por soluciones para expertos (SIEM, WAF gestionados, fail2ban configurado a mano) o por servicios caros orientados a empresas con equipo dedicado. El segmento de **emprendedores con uno o pocos VPS y sin perfil técnico** está desatendido: necesitan protección real sin tener que aprender ciberseguridad. Ahí apunta LUMI.

## Arquitectura (3 componentes)

```
┌─────────────────────────────┐
│  Agente Python (en el VPS)   │  detecta por reglas, envía métricas/heartbeat/alertas
│                              │  expone una API local de control (recibe órdenes de bloqueo)
└──────────────┬──────────────┘
               │ HTTP / HTTPS  (token dinámico por VPS)
┌──────────────┴──────────────┐
│  Backend NestJS + Postgres   │  autentica, aplica lógica de autonomía,
│                              │  ordena bloqueos, notifica en vivo y por correo
└──────────────┬──────────────┘
               │ REST + WebSocket
┌──────────────┴──────────────┐
│  Frontend Angular            │  dashboard, gestión de VPS, historial, configuración
└─────────────────────────────┘
```

La detección es **por reglas heurísticas**, no por modelos de Machine Learning — una decisión de alcance deliberada que mantiene el sistema transparente y explicable.

## Framework de ciberseguridad

La seguridad se aplica al propio producto, no solo a lo que protege:

- **Autenticación de usuarios**: JWT con refresh tokens (rotación + detección de reuso), contraseñas con bcrypt.
- **Autenticación de agentes**: token dinámico único por VPS, almacenado **hasheado**, nunca en texto plano. Guard separado del de usuarios.
- **Validación estricta** de toda entrada (DTOs con `class-validator`, IPs validadas con librerías reales, nunca regex artesanal).
- **Ejecución segura de comandos** en el agente: siempre `subprocess.run([...])` con lista de argumentos, nunca concatenación de strings (previene inyección).
- **Anti-lockout**: el agente protege su propio puerto de control, el SSH y la IP del backend para no dejar el servidor inaccesible por un falso positivo.
- **Trazabilidad**: toda acción crítica (bloqueo, cambio de autonomía) queda en un `AuditLog` de solo escritura, con estado anterior y posterior.
- **Transporte**: HTTP plano solo entre contenedores en local; HTTPS/TLS obligatorio antes de cualquier despliegue.

## Estado del proyecto

| Componente | Estado |
|---|---|
| Backend (NestJS) | Funcional — Auth, VPS, Alertas, Bloqueos, Configuración, Whitelist, Agent, WebSocket, correo y persistencia con Prisma/PostgreSQL |
| Frontend (Angular) | Funcional — Auth, Dashboard en tiempo real, gestión de VPS, historial de alertas y bloqueos, control de red y configuración |
| Agente (Python) | Funcional — monitoreo de sistema, detección SSH/HTTP, almacenamiento local SQLite, envío de alertas y métricas, heartbeat y control de bloqueos mediante UFW |

## Equipo y roles

Proyecto de un equipo de la comunidad WomenCISO & MenCISO:

- **David** — Backend (NestJS + PostgreSQL) y frontend (Angular).
- **Raúl** — Agente Python que corre en cada VPS monitoreado.
- **Cristian** — Simulación de ataques con Caldera (testing).
- **Jess** — Equipo.

## Estructura del monorepo

```
lumi-guardian/
├── client/     Frontend Angular          → ver client/README.md
├── server/     Backend NestJS + Prisma    → ver server/README.md
├── agent/      Agente Python             → ver agent/README.md
├── nginx/      Directorio reservado de Nginx
├── deploy/     Despliegue Docker + Nginx  → ver deploy/README.md
└── docker-compose.yml
```

## Puesta en marcha (local)

Requisitos: Docker + Docker Compose, o bien Node 20+ y PostgreSQL 16 locales.

**Con Docker Compose (recomendado):**

```bash
cp .env.example .env   # completa las variables
docker compose up
```

Esto levanta PostgreSQL y el backend. El backend queda en `http://localhost:3000`, con la documentación Swagger en `http://localhost:3000/api/docs`.

Para el frontend y el backend por separado, consulta sus README respectivos:

- [`server/README.md`](./server/README.md) — backend, base de datos, endpoints.
- [`client/README.md`](./client/README.md) — frontend, cliente de API, WebSocket.
- [`agent/README.md`](./agent/README.md) — instalación, configuración y ejecución del agente en un VPS.
- [`deploy/README.md`](./deploy/README.md) — despliegue productivo del sistema central.

## Licencia

Proyecto privado desarrollado para el concurso de innovación en IA y Ciberseguridad de WomenCISO & MenCISO.
