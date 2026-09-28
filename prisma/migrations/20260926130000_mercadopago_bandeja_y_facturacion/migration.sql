ALTER TYPE "EstadoPago" ADD VALUE 'EN_PROCESO';
ALTER TYPE "EstadoPago" ADD VALUE 'CONTRACARGO';
ALTER TYPE "EstadoPago" ADD VALUE 'ANULADO';

CREATE TYPE "EstadoEventoExterno" AS ENUM ('RECIBIDO', 'PROCESANDO', 'PROCESADO', 'FALLIDO');

ALTER TABLE "EventoExterno"
  ADD COLUMN "recursoId" TEXT,
  ADD COLUMN "estado" "EstadoEventoExterno" NOT NULL DEFAULT 'RECIBIDO',
  ADD COLUMN "intentos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "proximoIntentoEn" TIMESTAMP(3),
  ADD COLUMN "reclamadoEn" TIMESTAMP(3),
  ADD COLUMN "error" TEXT;

UPDATE "EventoExterno"
SET "estado" = 'PROCESADO'
WHERE "procesadoEn" IS NOT NULL;

CREATE INDEX "EventoExterno_proveedor_estado_proximoIntentoEn_recibidoEn_idx"
  ON "EventoExterno"("proveedor", "estado", "proximoIntentoEn", "recibidoEn");

ALTER TABLE "Suscripcion"
  ADD COLUMN "planPendiente" TEXT,
  ADD COLUMN "precioPendiente" DECIMAL(12,2),
  ADD COLUMN "checkoutIdempotencia" TEXT;

CREATE UNIQUE INDEX "Suscripcion_checkoutIdempotencia_key"
  ON "Suscripcion"("checkoutIdempotencia");

ALTER TABLE "Pago"
  ADD COLUMN "suscripcionId" TEXT,
  ADD COLUMN "facturaProveedorId" TEXT,
  ADD COLUMN "estadoProveedor" TEXT,
  ADD COLUMN "detalleProveedor" TEXT,
  ADD COLUMN "plan" TEXT,
  ADD COLUMN "moneda" TEXT NOT NULL DEFAULT 'ARS',
  ADD COLUMN "pagadoEn" TIMESTAMP(3);

ALTER TABLE "Pago"
  ADD CONSTRAINT "Pago_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Pago_suscripcionId_fkey"
  FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Pago_suscripcionId_creadoEn_idx" ON "Pago"("suscripcionId", "creadoEn");
CREATE INDEX "Pago_facturaProveedorId_idx" ON "Pago"("facturaProveedorId");
