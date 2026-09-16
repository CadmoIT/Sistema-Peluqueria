-- Guarda preferencias y entregas de avisos sin modificar reservas anteriores.
CREATE TYPE "CanalAviso" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "TipoAviso" AS ENUM ('CONFIRMACION', 'RECORDATORIO');
CREATE TYPE "EstadoAviso" AS ENUM ('PENDIENTE', 'ENVIANDO', 'ENVIADO', 'OMITIDO', 'FALLIDO');

ALTER TABLE "Cliente" ADD COLUMN "consentimientoWhatsappEn" TIMESTAMP(3);

CREATE TABLE "ConfiguracionAvisos" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "emailConfirmacionActivo" BOOLEAN NOT NULL DEFAULT true,
    "emailRecordatorioActivo" BOOLEAN NOT NULL DEFAULT true,
    "emailAsuntoConfirmacion" TEXT NOT NULL DEFAULT 'Tu turno en {negocio} está confirmado',
    "emailTextoConfirmacion" TEXT NOT NULL DEFAULT 'Hola {nombre}, tu turno de {servicio} es el {fecha} a las {hora} en {negocio}.',
    "emailAsuntoRecordatorio" TEXT NOT NULL DEFAULT 'Recordatorio de tu turno en {negocio}',
    "emailTextoRecordatorio" TEXT NOT NULL DEFAULT 'Hola {nombre}, te recordamos tu turno de {servicio} el {fecha} a las {hora} en {negocio}.',
    "whatsappConfirmacionActivo" BOOLEAN NOT NULL DEFAULT false,
    "whatsappRecordatorioActivo" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfiguracionAvisos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvisoReserva" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "canal" "CanalAviso" NOT NULL,
    "tipo" "TipoAviso" NOT NULL,
    "inicioTurno" TIMESTAMPTZ NOT NULL,
    "programadoPara" TIMESTAMPTZ NOT NULL,
    "estado" "EstadoAviso" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "enviadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvisoReserva_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfiguracionAvisos_negocioId_key" ON "ConfiguracionAvisos"("negocioId");
CREATE UNIQUE INDEX "AvisoReserva_reservaId_canal_tipo_inicioTurno_key" ON "AvisoReserva"("reservaId", "canal", "tipo", "inicioTurno");
CREATE INDEX "AvisoReserva_estado_programadoPara_idx" ON "AvisoReserva"("estado", "programadoPara");

ALTER TABLE "ConfiguracionAvisos" ADD CONSTRAINT "ConfiguracionAvisos_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvisoReserva" ADD CONSTRAINT "AvisoReserva_negocioId_fkey"
  FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvisoReserva" ADD CONSTRAINT "AvisoReserva_reservaId_fkey"
  FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;
