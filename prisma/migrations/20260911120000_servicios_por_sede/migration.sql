-- Relaciona cada servicio con las sedes donde realmente puede reservarse.
CREATE TABLE "ServicioSede" (
  "servicioId" TEXT NOT NULL,
  "sedeId" TEXT NOT NULL,
  CONSTRAINT "ServicioSede_pkey" PRIMARY KEY ("servicioId", "sedeId")
);

CREATE INDEX "ServicioSede_sedeId_idx" ON "ServicioSede"("sedeId");

ALTER TABLE "ServicioSede"
  ADD CONSTRAINT "ServicioSede_servicioId_fkey"
  FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServicioSede"
  ADD CONSTRAINT "ServicioSede_sedeId_fkey"
  FOREIGN KEY ("sedeId") REFERENCES "Sede"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Los servicios existentes quedan disponibles en todas las sedes activas del negocio.
INSERT INTO "ServicioSede" ("servicioId", "sedeId")
SELECT servicio."id", sede."id"
FROM "Servicio" servicio
JOIN "Sede" sede ON sede."negocioId" = servicio."negocioId"
WHERE sede."activa" = true
ON CONFLICT DO NOTHING;
