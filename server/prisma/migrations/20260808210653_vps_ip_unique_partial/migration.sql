-- DropIndex: quitar el unique absoluto que bloqueaba re-registro tras soft-delete
DROP INDEX "vps_userId_ip_key";

-- CreateIndex: índice normal para performance de queries
CREATE INDEX "vps_userId_ip_idx" ON "vps"("userId", "ip");

-- CreateIndex: índice único PARCIAL — solo aplica a registros no eliminados.
-- Permite que un usuario registre la misma IP después de soft-delete del anterior.
CREATE UNIQUE INDEX "vps_userId_ip_active_key"
  ON "vps"("userId", "ip")
  WHERE "deletedAt" IS NULL;
