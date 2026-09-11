-- Relaciona cada turno con sus eventos exportados para sincronizar sin duplicados.
CREATE TABLE "EventoReservaGoogle" (
  "id" TEXT NOT NULL,
  "reservaId" TEXT NOT NULL,
  "conexionId" TEXT NOT NULL,
  "eventoId" TEXT NOT NULL,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventoReservaGoogle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventoReservaGoogle_reservaId_conexionId_key" ON "EventoReservaGoogle"("reservaId", "conexionId");
CREATE UNIQUE INDEX "EventoReservaGoogle_conexionId_eventoId_key" ON "EventoReservaGoogle"("conexionId", "eventoId");
CREATE INDEX "EventoReservaGoogle_reservaId_idx" ON "EventoReservaGoogle"("reservaId");
ALTER TABLE "EventoReservaGoogle" ADD CONSTRAINT "EventoReservaGoogle_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventoReservaGoogle" ADD CONSTRAINT "EventoReservaGoogle_conexionId_fkey" FOREIGN KEY ("conexionId") REFERENCES "ConexionGoogleCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
