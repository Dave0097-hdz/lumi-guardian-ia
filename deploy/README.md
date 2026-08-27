# Despliegue — LUMI Guardián AI (sistema central)

Guía para desplegar **frontend + backend + PostgreSQL + Nginx** como sistema central. El **agente Python queda fuera**: se instala aparte, como servicio `systemd`, en cada VPS monitoreado.

Arquitectura: un solo origen público servido por Nginx, que reparte el tráfico.

```
Internet
   │
   ▼
Nginx público (:80 / :443)
   ├── /            → frontend Angular (estático)
   ├── /api/        → backend NestJS (:3000, interno)
   └── /socket.io/  → backend Socket.IO (:3000, interno)
                          │
                          └── PostgreSQL (:5432, interno)
```

Solo Nginx expone puertos públicos. Backend y PostgreSQL viven en la red interna de Docker.

---

## Artefactos incluidos

| Archivo | Qué es |
|---|---|
| `docker-compose.prod.yml` | Orquesta los 4 servicios + un paso de migraciones |
| `nginx/Dockerfile` + `nginx/nginx.conf` | Reverse proxy público |
| `.env.production.example` | Plantilla de variables (copiar a `.env.production`) |
| `../client/Dockerfile` + `../client/nginx.conf` | Imagen estática del frontend |
| `../server/Dockerfile` | Imagen de producción del backend |

---

## Opción A — Levantar en un solo servidor (Docker Compose)

Sirve para una VPS/EC2 única, un demo o staging. Es el camino más corto a un entorno productivo funcional.

### 1. Requisitos en el servidor

- Docker y Docker Compose instalados.
- Un dominio apuntando a la IP del servidor (para HTTPS).
- Puertos 80 y 443 abiertos.

### 2. Configurar variables

```bash
cd deploy
cp .env.production.example .env.production
# Edita .env.production con valores reales:
#  - LUMI_PUBLIC_URL y FRONTEND_URL = tu dominio (ej. https://lumi.tudominio.com)
#  - POSTGRES_PASSWORD fuerte
#  - JWT_SECRET y JWT_REFRESH_SECRET (openssl rand -base64 48)
#  - credenciales SMTP reales
```

### 3. Construir y levantar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Esto, en orden:
1. Levanta PostgreSQL y espera a que esté sano (healthcheck).
2. Corre las migraciones Prisma (`prisma migrate deploy`) y termina.
3. Arranca el backend (solo tras migraciones OK).
4. Arranca el frontend y el Nginx público.

### 4. Verificar

```bash
docker compose -f docker-compose.prod.yml ps        # todos "running"/"healthy"
curl http://localhost/api/v1                         # responde el backend
curl http://localhost/                               # responde el index de Angular
```

La app queda en `http://<IP-o-dominio>/`.

### 5. HTTPS (recomendado antes de exponer)

La forma más simple: un contenedor extra con [Caddy](https://caddyserver.com/) o `nginx-proxy` + `acme-companion` que gestione los certificados Let's Encrypt automáticamente. Alternativa manual con Certbot:

1. Habilita el puerto `443` en el servicio `nginx` de `docker-compose.prod.yml`.
2. Monta los certificados en el contenedor de Nginx.
3. Añade el bloque TLS en `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name lumi.tudominio.com;
    return 301 https://$host$request_uri;   # fuerza HTTPS
}
server {
    listen 443 ssl http2;
    server_name lumi.tudominio.com;
    ssl_certificate     /etc/letsencrypt/live/lumi.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lumi.tudominio.com/privkey.pem;
    # ... los mismos bloques location / , /api/ y /socket.io/ de la config HTTP
}
```

### 6. Actualizar tras un cambio de código

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Opción B — AWS (pasos manuales de 0)

Como no puedo ejecutar en tu cuenta AWS, aquí van los pasos exactos para hacerlo tú. Hay dos rutas; elige según cuánto quieras gestionar.

### Ruta B1 — Una EC2 con Docker Compose (la más simple)

Reutiliza todo lo de la Opción A dentro de una EC2. Bueno para el concurso/demo.

1. **RDS PostgreSQL** (recomendado sobre correr Postgres en la EC2):
   - Crea una instancia RDS PostgreSQL 16, clase `db.t4g.micro` (capa gratuita si aplica).
   - Anota endpoint, usuario, password, nombre de BD.
   - En `.env.production`, apunta `DATABASE_URL` al endpoint de RDS y **quita** el servicio `postgres` del compose (o déjalo sin usar).
   - Security Group de RDS: permite el puerto 5432 solo desde el Security Group de la EC2.

2. **EC2**:
   - Lanza una instancia (ej. `t3.small`, Amazon Linux 2023 o Ubuntu 22.04).
   - Security Group: abre 80 y 443 al mundo, 22 solo a tu IP.
   - Asocia una Elastic IP para que la IP no cambie.
   - Conéctate por SSH e instala Docker + Docker Compose.

3. **Dominio**: en Route 53 (o tu proveedor DNS), crea un registro A del dominio → Elastic IP.

4. **Desplegar**: clona el repo en la EC2 y sigue los pasos 2–5 de la Opción A. Para HTTPS, Certbot o Caddy sobre la misma EC2.

5. **Actualizaciones**: `git pull` + `docker compose up -d --build` (paso 6 de Opción A).

### Ruta B2 — Servicios administrados (más robusto, más piezas)

Para algo más cercano a producción "de verdad":

- **Frontend** → **S3 + CloudFront**. El frontend es estático (`dist/client/browser`). Súbelo a un bucket S3, sírvelo con CloudFront (HTTPS y CDN gratis). Configura el "error document" a `index.html` para el fallback SPA.
- **Backend** → **ECS Fargate** (o App Runner). Publica la imagen del backend en **ECR** y córrela como servicio. App Runner es el más simple: le das la imagen y él gestiona HTTPS y escalado.
- **Base de datos** → **RDS PostgreSQL**.
- **Ruteo `/api` y `/socket.io`**: con CloudFront puedes añadir un segundo *origin* (el backend en App Runner/ALB) y enrutar por path pattern `/api/*` y `/socket.io/*` hacia el backend, y el resto a S3. Así mantienes el **mismo origen público** (clave para cookies y CORS).
- **Secretos**: usa **AWS Secrets Manager** o parámetros de SSM para `JWT_SECRET`, credenciales de RDS y SMTP, en vez de un `.env` en disco.

> Nota sobre WebSocket en B2: App Runner y ALB soportan WebSocket. Si usas API Gateway delante, verifica que el path `/socket.io/` permita upgrade a WebSocket.

### Publicar la imagen del backend en ECR (referencia)

```bash
aws ecr create-repository --repository-name lumi-backend
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t lumi-backend ./server
docker tag lumi-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/lumi-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/lumi-backend:latest
```

---

## Checklist antes de exponer a Internet

- [ ] `.env.production` con secretos reales y fuertes (nunca los del `.example`).
- [ ] `LUMI_PUBLIC_URL` y `FRONTEND_URL` = el dominio real, con `https://`.
- [ ] PostgreSQL **no** accesible públicamente (solo red interna / Security Group).
- [ ] Puerto 3000 del backend **no** publicado al exterior (solo `expose`, no `ports`).
- [ ] HTTPS activo y redirección de HTTP → HTTPS.
- [ ] Migraciones aplicadas (`prisma migrate deploy`, ya lo hace el servicio `migrate`).
- [ ] Prueba E2E: registro → login → alta de VPS → alerta en vivo por WebSocket → correo.

## Notas

- **Angular incorpora la URL en build-time.** Usamos `apiUrl: ''` (rutas relativas) + `fileReplacements` en `angular.json`, así el frontend siempre llama a su propio origen y Nginx reparte. No hay que reconstruir la imagen por cambiar de dominio.
- **El agente Python no se despliega aquí.** Se instala en cada VPS cliente vía su `install.sh` + `systemd`. El proxy de `/socket.io/` ya queda listo para cuando el agente implemente su cliente Socket.IO.
- **Swagger** queda en `/api/docs` (el prefijo global `/api/v1` no afecta a la ruta de Swagger porque se registra por separado). Conviene restringir su acceso en producción.
