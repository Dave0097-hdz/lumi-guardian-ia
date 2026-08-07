-- CreateEnum
CREATE TYPE "ProveedorVPS" AS ENUM ('DIGITAL_OCEAN', 'AWS', 'LINODE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoVPS" AS ENUM ('PENDIENTE_INSTALACION', 'ACTIVO', 'DESCONECTADO', 'MANTENIMIENTO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "EstadoGeneral" AS ENUM ('SEGURO', 'ADVERTENCIA', 'BAJO_ATAQUE');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('BRUTE_FORCE', 'SQL_INJECTION', 'HTTP_FLOOD', 'IP_MALICIOSA', 'ANOMALIA_PROCESO', 'ESCANEO_PUERTOS', 'ESCALACION_DATOS');

-- CreateEnum
CREATE TYPE "SeveridadAlerta" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('DETECTADA', 'REVISADA', 'FALSO_POSITIVO', 'RESUELTA');

-- CreateEnum
CREATE TYPE "AccionTomada" AS ENUM ('NOTIFICADO', 'SUGERENCIA_ENVIADA', 'BLOQUEADO_AUTOMATICAMENTE', 'AISLADO_AUTOMATICAMENTE', 'SIN_ACCION');

-- CreateEnum
CREATE TYPE "NivelAutonomia" AS ENUM ('SOLO_ALERTAR', 'SUGERIR', 'GUARDIAN_TOTAL');

-- CreateEnum
CREATE TYPE "TipoBloqueo" AS ENUM ('TEMPORAL', 'PERMANENTE');

-- CreateEnum
CREATE TYPE "EstadoBloqueo" AS ENUM ('BLOQUEADO', 'DESBLOQUEADO', 'FALSO_POSITIVO');

-- CreateEnum
CREATE TYPE "EstadoAislamiento" AS ENUM ('AISLADO', 'LIBERADO', 'TERMINADO', 'FALSO_POSITIVO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "replacedBy" TEXT,
    "deviceInfo" VARCHAR(255),
    "ipOrigen" VARCHAR(45),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "sistemaOperativo" VARCHAR(100) NOT NULL,
    "proveedor" "ProveedorVPS" NOT NULL,
    "estado" "EstadoVPS" NOT NULL DEFAULT 'PENDIENTE_INSTALACION',
    "agentTokenHash" TEXT NOT NULL,
    "agenteVersion" VARCHAR(20),
    "ultimoHeartbeat" TIMESTAMP(3),
    "descripcion" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "severidad" "SeveridadAlerta" NOT NULL,
    "ipOrigen" TEXT,
    "tecnicaMitre" VARCHAR(20),
    "paisOrigen" VARCHAR(100),
    "descripcionSimple" TEXT NOT NULL,
    "descripcionTecnica" TEXT NOT NULL,
    "accionTomada" "AccionTomada" NOT NULL,
    "evidencia" JSONB NOT NULL,
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'DETECTADA',
    "detectadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoEn" TIMESTAMP(3),

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueos" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT,
    "alertaId" TEXT,
    "ip" VARCHAR(50) NOT NULL,
    "tipo" "TipoBloqueo" NOT NULL,
    "estado" "EstadoBloqueo" NOT NULL DEFAULT 'BLOQUEADO',
    "motivo" VARCHAR(500) NOT NULL,
    "esFalsoPositivo" BOOLEAN NOT NULL DEFAULT false,
    "bloqueadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desbloqueadoEn" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "bloqueos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aislamientos" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "userId" TEXT,
    "alertaId" TEXT,
    "pid" INTEGER NOT NULL,
    "nombreProceso" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoAislamiento" NOT NULL,
    "aisladoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liberadoEn" TIMESTAMP(3),

    CONSTRAINT "aislamientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "cpuPorcentaje" DOUBLE PRECISION NOT NULL,
    "ramUsadaMB" DOUBLE PRECISION NOT NULL,
    "ramTotalMB" DOUBLE PRECISION NOT NULL,
    "discoUsadaGB" DOUBLE PRECISION NOT NULL,
    "discoTotalGB" DOUBLE PRECISION NOT NULL,
    "discoPorcentaje" DOUBLE PRECISION NOT NULL,
    "requestsPorMinuto" DOUBLE PRECISION NOT NULL,
    "procesosActivos" INTEGER NOT NULL,
    "conexionesActivas" INTEGER NOT NULL,
    "estadoGeneral" "EstadoGeneral" NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones" (
    "id" TEXT NOT NULL,
    "vpsId" TEXT NOT NULL,
    "nivelAutonomia" "NivelAutonomia" NOT NULL DEFAULT 'SOLO_ALERTAR',
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifDashboard" BOOLEAN NOT NULL DEFAULT true,
    "severidadesNotif" "SeveridadAlerta"[],
    "umbralCpuAlerta" DOUBLE PRECISION NOT NULL DEFAULT 85,
    "umbralRamAlerta" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whitelist_ips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vpsId" TEXT,
    "ip" VARCHAR(45) NOT NULL,
    "motivo" VARCHAR(255),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whitelist_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "vpsId" TEXT,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "accion" TEXT NOT NULL,
    "datosAntes" JSONB,
    "datosDespues" JSONB,
    "ipRequest" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_tokens_jti_key" ON "revoked_tokens"("jti");

-- CreateIndex
CREATE INDEX "revoked_tokens_jti_idx" ON "revoked_tokens"("jti");

-- CreateIndex
CREATE INDEX "revoked_tokens_expiresAt_idx" ON "revoked_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "vps_agentTokenHash_key" ON "vps"("agentTokenHash");

-- CreateIndex
CREATE INDEX "vps_userId_idx" ON "vps"("userId");

-- CreateIndex
CREATE INDEX "vps_ip_idx" ON "vps"("ip");

-- CreateIndex
CREATE INDEX "vps_estado_idx" ON "vps"("estado");

-- CreateIndex
CREATE INDEX "vps_ultimoHeartbeat_idx" ON "vps"("ultimoHeartbeat");

-- CreateIndex
CREATE UNIQUE INDEX "vps_userId_ip_key" ON "vps"("userId", "ip");

-- CreateIndex
CREATE INDEX "alertas_vpsId_idx" ON "alertas"("vpsId");

-- CreateIndex
CREATE INDEX "alertas_estado_idx" ON "alertas"("estado");

-- CreateIndex
CREATE INDEX "alertas_severidad_idx" ON "alertas"("severidad");

-- CreateIndex
CREATE INDEX "alertas_vpsId_detectadoEn_idx" ON "alertas"("vpsId", "detectadoEn" DESC);

-- CreateIndex
CREATE INDEX "bloqueos_vpsId_idx" ON "bloqueos"("vpsId");

-- CreateIndex
CREATE INDEX "bloqueos_ip_idx" ON "bloqueos"("ip");

-- CreateIndex
CREATE INDEX "bloqueos_estado_idx" ON "bloqueos"("estado");

-- CreateIndex
CREATE INDEX "bloqueos_expiresAt_idx" ON "bloqueos"("expiresAt");

-- CreateIndex
CREATE INDEX "bloqueos_vpsId_ip_estado_idx" ON "bloqueos"("vpsId", "ip", "estado");

-- CreateIndex
CREATE INDEX "aislamientos_vpsId_idx" ON "aislamientos"("vpsId");

-- CreateIndex
CREATE INDEX "metricas_vpsId_registradoEn_idx" ON "metricas"("vpsId", "registradoEn" DESC);

-- CreateIndex
CREATE INDEX "metricas_registradoEn_idx" ON "metricas"("registradoEn");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_vpsId_key" ON "configuraciones"("vpsId");

-- CreateIndex
CREATE INDEX "whitelist_ips_userId_idx" ON "whitelist_ips"("userId");

-- CreateIndex
CREATE INDEX "whitelist_ips_vpsId_idx" ON "whitelist_ips"("vpsId");

-- CreateIndex
CREATE UNIQUE INDEX "whitelist_ips_userId_vpsId_ip_key" ON "whitelist_ips"("userId", "vpsId", "ip");

-- CreateIndex
CREATE INDEX "audit_log_creadoEn_idx" ON "audit_log"("creadoEn" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vps" ADD CONSTRAINT "vps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos" ADD CONSTRAINT "bloqueos_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos" ADD CONSTRAINT "bloqueos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos" ADD CONSTRAINT "bloqueos_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "alertas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aislamientos" ADD CONSTRAINT "aislamientos_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aislamientos" ADD CONSTRAINT "aislamientos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aislamientos" ADD CONSTRAINT "aislamientos_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "alertas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas" ADD CONSTRAINT "metricas_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones" ADD CONSTRAINT "configuraciones_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whitelist_ips" ADD CONSTRAINT "whitelist_ips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whitelist_ips" ADD CONSTRAINT "whitelist_ips_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_vpsId_fkey" FOREIGN KEY ("vpsId") REFERENCES "vps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
