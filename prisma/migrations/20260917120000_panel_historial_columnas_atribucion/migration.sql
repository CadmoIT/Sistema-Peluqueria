-- Conserva históricos desvinculados y agrega columnas libres y atribución de caja sin purgar fichas.
CREATE TYPE "OrigenAtribucion" AS ENUM ('LOCAL', 'EQUIPO', 'SIN_ASIGNAR');
CREATE TYPE "TipoColumnaInventario" AS ENUM ('TEXTO', 'NUMERO', 'FECHA');
ALTER TABLE "Reserva" ALTER COLUMN "clienteId" DROP NOT NULL, ALTER COLUMN "profesionalId" DROP NOT NULL;
ALTER TABLE "Reserva" DROP CONSTRAINT "Reserva_clienteId_fkey", DROP CONSTRAINT "Reserva_profesionalId_fkey";
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comision" ALTER COLUMN "profesionalId" DROP NOT NULL;
ALTER TABLE "Comision" DROP CONSTRAINT "Comision_profesionalId_fkey";
ALTER TABLE "Comision" ADD CONSTRAINT "Comision_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimientoStock" ALTER COLUMN "productoId" DROP NOT NULL;
ALTER TABLE "MovimientoStock" DROP CONSTRAINT "MovimientoStock_productoId_fkey";
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Venta" ADD COLUMN "origen" "OrigenAtribucion" NOT NULL DEFAULT 'SIN_ASIGNAR', ADD COLUMN "profesionalId" TEXT, ADD COLUMN "idempotencia" TEXT, ADD COLUMN "solicitudHash" TEXT;
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Venta_negocioId_idempotencia_key" ON "Venta"("negocioId", "idempotencia");
ALTER TABLE "MovimientoCaja" ADD COLUMN "origen" "OrigenAtribucion" NOT NULL DEFAULT 'SIN_ASIGNAR', ADD COLUMN "profesionalId" TEXT;
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MovimientoCaja_negocioId_profesionalId_creadoEn_idx" ON "MovimientoCaja"("negocioId", "profesionalId", "creadoEn");
CREATE TABLE "ColumnaInventario" (
  "id" TEXT NOT NULL, "negocioId" TEXT NOT NULL, "nombre" TEXT NOT NULL, "tipo" "TipoColumnaInventario" NOT NULL, "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ColumnaInventario_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ColumnaInventario_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ColumnaInventario_negocioId_nombre_key" ON "ColumnaInventario"("negocioId", "nombre");
CREATE INDEX "ColumnaInventario_negocioId_orden_idx" ON "ColumnaInventario"("negocioId", "orden");
CREATE TABLE "ValorColumnaInventario" (
  "productoId" TEXT NOT NULL, "columnaId" TEXT NOT NULL, "valor" JSONB NOT NULL,
  CONSTRAINT "ValorColumnaInventario_pkey" PRIMARY KEY ("productoId", "columnaId"),
  CONSTRAINT "ValorColumnaInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ValorColumnaInventario_columnaId_fkey" FOREIGN KEY ("columnaId") REFERENCES "ColumnaInventario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
UPDATE "Cliente" SET "archivadoEn" = NULL WHERE "archivadoEn" IS NOT NULL;
