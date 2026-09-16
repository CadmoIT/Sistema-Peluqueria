-- Conserva clientes archivados y su historial sin eliminar registros existentes.
ALTER TABLE "Cliente" ADD COLUMN "archivadoEn" TIMESTAMP(3);
CREATE INDEX "Cliente_negocioId_archivadoEn_idx" ON "Cliente"("negocioId", "archivadoEn");
