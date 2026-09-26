CREATE TYPE "EstadoCorreoPendiente" AS ENUM (
  'PENDIENTE',
  'ENVIANDO',
  'ENVIADO',
  'FALLIDO'
);

ALTER TABLE "AvisoReserva"
  ADD COLUMN "proximoIntentoEn" TIMESTAMPTZ,
  ADD COLUMN "reclamadoEn" TIMESTAMPTZ;

CREATE INDEX "AvisoReserva_estado_proximoIntentoEn_idx"
  ON "AvisoReserva"("estado", "proximoIntentoEn");

CREATE TABLE "CorreoPendiente" (
  "id" TEXT NOT NULL,
  "destinatario" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "responderA" TEXT,
  "claveIdempotencia" TEXT NOT NULL,
  "estado" "EstadoCorreoPendiente" NOT NULL DEFAULT 'PENDIENTE',
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "proximoIntentoEn" TIMESTAMPTZ,
  "reclamadoEn" TIMESTAMPTZ,
  "expiraEn" TIMESTAMPTZ,
  "enviadoEn" TIMESTAMPTZ,
  "proveedorId" TEXT,
  "error" TEXT,
  "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CorreoPendiente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CorreoPendiente_claveIdempotencia_key"
  ON "CorreoPendiente"("claveIdempotencia");

CREATE INDEX "CorreoPendiente_estado_proximoIntentoEn_creadoEn_idx"
  ON "CorreoPendiente"("estado", "proximoIntentoEn", "creadoEn");
