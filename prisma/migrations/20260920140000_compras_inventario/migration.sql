CREATE TABLE "Compra" (
  "id" TEXT NOT NULL,
  "negocioId" TEXT NOT NULL,
  "sedeId" TEXT NOT NULL,
  "proveedor" TEXT,
  "total" DECIMAL(12,2) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompraItem" (
  "id" TEXT NOT NULL,
  "compraId" TEXT NOT NULL,
  "productoId" TEXT,
  "nombre" TEXT NOT NULL,
  "sku" TEXT,
  "cantidad" INTEGER NOT NULL,
  "costo" DECIMAL(12,2) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Compra_negocioId_sedeId_creadoEn_idx" ON "Compra"("negocioId", "sedeId", "creadoEn");
CREATE INDEX "CompraItem_compraId_idx" ON "CompraItem"("compraId");
CREATE INDEX "CompraItem_productoId_idx" ON "CompraItem"("productoId");

ALTER TABLE "Compra" ADD CONSTRAINT "Compra_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
