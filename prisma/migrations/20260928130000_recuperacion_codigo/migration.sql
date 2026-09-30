CREATE TABLE "RecuperacionContrasena" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "codigoHash" TEXT,
    "codigoCifrado" TEXT,
    "tokenResetCifrado" TEXT,
    "codigoExpiraEn" TIMESTAMPTZ,
    "intentosCodigo" INTEGER NOT NULL DEFAULT 0,
    "codigoConsumidoEn" TIMESTAMPTZ,
    "tokenSesionHash" TEXT,
    "sesionExpiraEn" TIMESTAMPTZ,
    "ventanaEnviosDesde" TIMESTAMPTZ,
    "enviosEnVentana" INTEGER NOT NULL DEFAULT 0,
    "ultimoEnvioEn" TIMESTAMPTZ,
    "completadoEn" TIMESTAMPTZ,
    "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "RecuperacionContrasena_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecuperacionContrasena_emailHash_key"
    ON "RecuperacionContrasena"("emailHash");
CREATE INDEX "RecuperacionContrasena_codigoExpiraEn_idx"
    ON "RecuperacionContrasena"("codigoExpiraEn");
CREATE INDEX "RecuperacionContrasena_sesionExpiraEn_idx"
    ON "RecuperacionContrasena"("sesionExpiraEn");
