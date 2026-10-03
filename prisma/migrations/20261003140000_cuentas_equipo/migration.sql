-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "versionEquipo" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Membresia" ADD COLUMN     "aceptadaEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "actorUsuarioId" TEXT,
ADD COLUMN     "anuladoEn" TIMESTAMP(3),
ADD COLUMN     "idempotencia" TEXT,
ADD COLUMN     "solicitudHash" TEXT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "actorUsuarioId" TEXT,
ADD COLUMN     "anuladoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MovimientoCaja" ADD COLUMN     "actorUsuarioId" TEXT,
ADD COLUMN     "operacionId" TEXT,
ADD COLUMN     "reversaDeId" TEXT;

-- AlterTable
ALTER TABLE "Auditoria" ADD COLUMN     "actorNombre" TEXT,
ADD COLUMN     "profesionalId" TEXT,
ADD COLUMN     "sedeId" TEXT,
ADD COLUMN     "visibilidad" TEXT NOT NULL DEFAULT 'ADMINISTRACION';

-- CreateTable
CREATE TABLE "InvitacionEquipo" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "creadoPorId" TEXT NOT NULL,
    "aceptadaPorId" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "aceptadaEn" TIMESTAMP(3),
    "correoClave" TEXT NOT NULL,

    CONSTRAINT "InvitacionEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfesionalCliente" (
    "profesionalId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfesionalCliente_pkey" PRIMARY KEY ("profesionalId","clienteId")
);

-- CreateTable
CREATE TABLE "CobroReserva" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "profesionalId" TEXT,
    "sedeId" TEXT NOT NULL,
    "actorUsuarioId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio" TEXT NOT NULL,
    "idempotencia" TEXT NOT NULL,
    "solicitudHash" TEXT NOT NULL,
    "movimientoId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anuladoEn" TIMESTAMP(3),

    CONSTRAINT "CobroReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionEquipo_tokenHash_key" ON "InvitacionEquipo"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionEquipo_correoClave_key" ON "InvitacionEquipo"("correoClave");

-- CreateIndex
CREATE INDEX "InvitacionEquipo_negocioId_profesionalId_creadaEn_idx" ON "InvitacionEquipo"("negocioId", "profesionalId", "creadaEn");

-- CreateIndex
CREATE INDEX "ProfesionalCliente_clienteId_idx" ON "ProfesionalCliente"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CobroReserva_movimientoId_key" ON "CobroReserva"("movimientoId");

-- CreateIndex
CREATE INDEX "CobroReserva_reservaId_anuladoEn_idx" ON "CobroReserva"("reservaId", "anuladoEn");

-- CreateIndex
CREATE UNIQUE INDEX "CobroReserva_negocioId_idempotencia_key" ON "CobroReserva"("negocioId", "idempotencia");

-- CreateIndex
CREATE UNIQUE INDEX "Compra_negocioId_idempotencia_key" ON "Compra"("negocioId", "idempotencia");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoCaja_reversaDeId_key" ON "MovimientoCaja"("reversaDeId");

-- AddForeignKey
ALTER TABLE "InvitacionEquipo" ADD CONSTRAINT "InvitacionEquipo_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalCliente" ADD CONSTRAINT "ProfesionalCliente_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalCliente" ADD CONSTRAINT "ProfesionalCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CobroReserva" ADD CONSTRAINT "CobroReserva_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Vincula clientes existentes sin copiar notas privadas ni inventar autoría.
INSERT INTO "ProfesionalCliente" ("profesionalId", "clienteId") SELECT DISTINCT "profesionalId", "clienteId" FROM "Reserva" WHERE "profesionalId" IS NOT NULL AND "clienteId" IS NOT NULL AND "estado" IN ('CONFIRMADA','COMPLETADA','AUSENTE') ON CONFLICT DO NOTHING;

-- Incluye escrituras públicas y del worker en la versión consultada por otros navegadores.
CREATE FUNCTION "versionEquipoCambio"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE "Negocio" SET "versionEquipo" = "versionEquipo" + 1 WHERE "id" = OLD."negocioId";
    RETURN OLD;
  ELSE
    UPDATE "Negocio" SET "versionEquipo" = "versionEquipo" + 1 WHERE "id" = NEW."negocioId";
    RETURN NEW;
  END IF;
END;
$$;
CREATE TRIGGER "versionEquipo_Reserva" AFTER INSERT OR UPDATE OR DELETE ON "Reserva" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Profesional" AFTER INSERT OR UPDATE OR DELETE ON "Profesional" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Sede" AFTER INSERT OR UPDATE OR DELETE ON "Sede" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Servicio" AFTER INSERT OR UPDATE OR DELETE ON "Servicio" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Producto" AFTER INSERT OR UPDATE OR DELETE ON "Producto" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Existencia" AFTER INSERT OR UPDATE OR DELETE ON "Existencia" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_MovimientoStock" AFTER INSERT OR UPDATE OR DELETE ON "MovimientoStock" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Compra" AFTER INSERT OR UPDATE OR DELETE ON "Compra" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Venta" AFTER INSERT OR UPDATE OR DELETE ON "Venta" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_MovimientoCaja" AFTER INSERT OR UPDATE OR DELETE ON "MovimientoCaja" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Cliente" AFTER INSERT OR UPDATE OR DELETE ON "Cliente" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_BloqueoAgenda" AFTER INSERT OR UPDATE OR DELETE ON "BloqueoAgenda" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_HorarioProfesional" AFTER INSERT OR UPDATE OR DELETE ON "HorarioProfesional" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Suscripcion" AFTER INSERT OR UPDATE OR DELETE ON "Suscripcion" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_Auditoria" AFTER INSERT OR UPDATE OR DELETE ON "Auditoria" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
CREATE TRIGGER "versionEquipo_ConexionGoogleCalendar" AFTER INSERT OR UPDATE OR DELETE ON "ConexionGoogleCalendar" FOR EACH ROW EXECUTE FUNCTION "versionEquipoCambio"();
