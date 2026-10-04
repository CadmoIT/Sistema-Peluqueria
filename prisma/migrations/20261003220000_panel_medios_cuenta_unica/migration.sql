-- Preserva la historia y falla si hay cuentas con múltiples negocios.
CREATE UNIQUE INDEX "Membresia_usuarioId_key" ON "Membresia"("usuarioId");
ALTER TABLE "Venta" ADD COLUMN "medio" TEXT,
  ADD COLUMN "precioBase" DECIMAL(12,2), ADD COLUMN "descuentoEfectivo" DECIMAL(5,2), ADD COLUMN "deshacerHasta" TIMESTAMP(3);
ALTER TABLE "CobroReserva" ADD COLUMN "precioBase" DECIMAL(12,2),
  ADD COLUMN "totalAcordado" DECIMAL(12,2), ADD COLUMN "descuentoEfectivo" DECIMAL(5,2);
