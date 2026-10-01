-- Conserva la configuración y las relaciones del negocio; sólo retira su sitio.
ALTER TABLE "Negocio" ADD COLUMN "sitioRetiradoEn" TIMESTAMP(3);
CREATE INDEX "Negocio_sitioRetiradoEn_idx" ON "Negocio"("sitioRetiradoEn");
ALTER TABLE "Suscripcion" ADD COLUMN "primerPagoEn" TIMESTAMP(3);
UPDATE "Suscripcion" s SET "primerPagoEn" = historial.fecha
FROM (
  SELECT "suscripcionId", MIN(COALESCE("pagadoEn", "creadoEn")) AS fecha
  FROM "Pago" WHERE "suscripcionId" IS NOT NULL
    AND "estado" IN ('APROBADO', 'REEMBOLSADO', 'REEMBOLSADO_PARCIAL', 'CONTRACARGO')
  GROUP BY "suscripcionId"
) historial WHERE s.id = historial."suscripcionId";
