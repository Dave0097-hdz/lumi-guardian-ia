# ============================
# Build de Angular
# ============================
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Compila en modo producción. environment.prod.ts usa apiUrl: '' (rutas
# relativas), por lo que el frontend llama a /api/... sobre su propio origen
# y Nginx (el público) reenvía esas rutas al backend.
RUN npm run build

# ============================
# Runtime estático con Nginx
# ============================
FROM nginx:1.27-alpine AS runtime

# Config de Nginx interna del contenedor de frontend: sirve los estáticos y
# hace el fallback a index.html para que las rutas del router de Angular
# (ej. /dashboard) funcionen al recargar directamente.
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/client/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
