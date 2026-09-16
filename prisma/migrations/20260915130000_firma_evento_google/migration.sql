-- Guarda la huella del evento exportado para reintentar sin duplicarlo ni reescribirlo.
ALTER TABLE "EventoReservaGoogle" ADD COLUMN "firma" TEXT;
