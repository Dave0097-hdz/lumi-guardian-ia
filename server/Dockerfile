# ============================
# Dependencias
# ============================
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================
# Build
# ============================
FROM deps AS build

WORKDIR /app

COPY . .

RUN pnpm run prisma:generate
RUN pnpm build

# ============================
# Producción
# ============================
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["node", "dist/src/main.js"]