-- Permite publicar cada sede bajo su propio subdominio.
ALTER TABLE "Sede" ADD COLUMN "subdominio" TEXT;

-- Completa las sedes existentes con un identificador estable y legible.
UPDATE "Sede" AS sede
SET "subdominio" = LEFT(
  LOWER(REGEXP_REPLACE(negocio.slug || '-' || sede.nombre || '-' || LEFT(sede.id, 6), '[^a-zA-Z0-9]+', '-', 'g')),
  63
)
FROM "Negocio" AS negocio
WHERE negocio.id = sede."negocioId" AND sede."subdominio" IS NULL;

CREATE UNIQUE INDEX "Sede_subdominio_key" ON "Sede"("subdominio");
