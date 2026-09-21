-- Índices para las consultas más frecuentes del panel y la agenda.
CREATE INDEX "Reserva_negocioId_inicio_idx" ON "Reserva"("negocioId", "inicio");
CREATE INDEX "Cliente_negocioId_creadoEn_idx" ON "Cliente"("negocioId", "creadoEn");
CREATE INDEX "Compra_negocioId_creadoEn_idx" ON "Compra"("negocioId", "creadoEn");
CREATE INDEX "MovimientoCaja_negocioId_tipo_creadoEn_idx" ON "MovimientoCaja"("negocioId", "tipo", "creadoEn");
CREATE INDEX "MovimientoCaja_negocioId_creadoEn_idx" ON "MovimientoCaja"("negocioId", "creadoEn");
