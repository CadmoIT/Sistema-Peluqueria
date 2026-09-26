-- Acelera la consulta de última reserva por cliente y las relaciones de cuentas OAuth.
CREATE INDEX "Reserva_clienteId_inicio_idx" ON "Reserva"("clienteId", "inicio");
CREATE INDEX "CuentaOAuth_usuarioId_idx" ON "CuentaOAuth"("usuarioId");
