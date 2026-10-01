-- Evita recorrer suscripciones vigentes en cada evaluación del retiro.
CREATE INDEX "Suscripcion_estado_primerPagoEn_pruebaFinalizaEn_idx" ON "Suscripcion"("estado", "primerPagoEn", "pruebaFinalizaEn");
